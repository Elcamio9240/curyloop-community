import { db } from "@/lib/db";
import {
  llmKeys, agentInterests, monitoredSites, agentRuns, agentConfigs,
  sessions, items, tags, itemTags,
} from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { decryptLlmKey } from "@/lib/agent/encryption";
import { analyzeRelevance } from "@/lib/agent/llm-client";
import { crawlSite } from "@/lib/agent/site-crawler";
import { getNextRunAt } from "@/lib/agent/schedule";
import { dispatchWebhook } from "@/lib/webhooks/dispatch";
import type { AgentSchedule, LlmProvider } from "@/lib/agent/types";

const PER_SITE_TIMEOUT_MS = 30_000;
const TOTAL_RUN_TIMEOUT_MS = 4 * 60 * 1000;

export interface AgentInput {
  id: string;
  userId: string;
  name?: string;
  llmKeyId: string;
  groupId: string;
  schedule: AgentSchedule;
  maxItemsPerRun: number;
  relevanceThreshold: number;
}

class RunTimeoutError extends Error {
  constructor() {
    super("Run timed out");
    this.name = "RunTimeoutError";
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)),
      ms
    );
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); }
    );
  });
}

export async function processAgent(agent: AgentInput) {
  const runStart = Date.now();

  const [run] = await db
    .insert(agentRuns)
    .values({
      agentConfigId: agent.id,
      userId: agent.userId,
      status: "running",
    })
    .returning({ id: agentRuns.id });

  if (!run) {
    console.error(`[processAgent] Failed to create run for agent ${agent.id}`);
    return;
  }

  let totalTokens = 0;
  let sitesCrawled = 0;
  let itemsFound = 0;
  let itemsCreated = 0;
  let sessionId: string | null = null;

  function checkTimeout() {
    if (Date.now() - runStart > TOTAL_RUN_TIMEOUT_MS)
      throw new RunTimeoutError();
  }

  try {
    // Get LLM key
    const [llmKey] = await db
      .select()
      .from(llmKeys)
      .where(eq(llmKeys.id, agent.llmKeyId))
      .limit(1);
    if (!llmKey || !llmKey.isValid) throw new Error("LLM key invalid");

    const apiKey = decryptLlmKey(llmKey.encryptedKey, llmKey.iv, llmKey.authTag);
    const provider = llmKey.provider as LlmProvider;
    const modelId = llmKey.model;
    if (!modelId) throw new Error("No model configured for LLM key");

    // Get interests
    const interests = await db
      .select({ topic: agentInterests.topic, description: agentInterests.description })
      .from(agentInterests)
      .where(eq(agentInterests.agentConfigId, agent.id));
    if (interests.length === 0) throw new Error("No interests configured");

    // Get sites
    const sites = await db
      .select()
      .from(monitoredSites)
      .where(
        and(
          eq(monitoredSites.agentConfigId, agent.id),
          eq(monitoredSites.enabled, 1)
        )
      );
    if (sites.length === 0) throw new Error("No active sites");

    // Crawl sites
    const allContents = [];
    for (const site of sites) {
      checkTimeout();
      try {
        const result = await withTimeout(
          crawlSite(site.url, site.feedUrl),
          PER_SITE_TIMEOUT_MS,
          site.url
        );
        allContents.push(...result.contents);
        sitesCrawled++;

        const siteUpdate: Record<string, unknown> = {
          lastCrawledAt: new Date().toISOString(),
          consecutiveFailures: 0,
        };
        if (result.discoveredFeedUrl) siteUpdate.feedUrl = result.discoveredFeedUrl;

        await db
          .update(monitoredSites)
          .set(siteUpdate)
          .where(eq(monitoredSites.id, site.id));
      } catch (crawlErr) {
        if (crawlErr instanceof RunTimeoutError) throw crawlErr;
        const newF = (site.consecutiveFailures ?? 0) + 1;
        const upd: Record<string, unknown> = { consecutiveFailures: newF };
        if (newF >= 5) upd.enabled = 0;
        await db.update(monitoredSites).set(upd).where(eq(monitoredSites.id, site.id));
        continue;
      }
    }

    if (allContents.length === 0) {
      await completeRun(run.id, agent, { sitesCrawled, itemsFound: 0, itemsCreated: 0, tokensUsed: 0, sessionId: null });
      return;
    }

    checkTimeout();

    const { results, tokensUsed } = await analyzeRelevance(
      provider, apiKey, interests, allContents.slice(0, 50), modelId
    );
    totalTokens = tokensUsed;

    const relevant = results.filter((r) => r.score >= agent.relevanceThreshold);
    itemsFound = relevant.length;

    if (itemsFound === 0) {
      await completeRun(run.id, agent, { sitesCrawled, itemsFound: 0, itemsCreated: 0, tokensUsed: totalTokens, sessionId: null });
      return;
    }

    // Build session title
    const agentName = agent.name || "AI Agent";
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const weekNum = Math.ceil((now.getTime() - new Date("2024-01-01").getTime()) / (7 * 24 * 60 * 60 * 1000));
    const needsTime = agent.schedule === "6h" || agent.schedule === "12h";
    const sessionTitle = needsTime ? `${agentName} - ${dateStr}, ${timeStr}` : `${agentName} - ${dateStr}`;

    const [newSession] = await db
      .insert(sessions)
      .values({
        groupId: agent.groupId,
        title: sessionTitle,
        weekNumber: weekNum,
        status: "active",
        createdBy: agent.userId,
      })
      .returning({ id: sessions.id });
    if (!newSession) throw new Error("Failed to create session");
    sessionId = newSession.id;

    // Deduplicate URLs
    const groupSessions = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.groupId, agent.groupId));
    const gsIds = groupSessions.map((s) => s.id);
    const existingUrls = new Set<string>();
    if (gsIds.length > 0) {
      const existingItems = await db
        .select({ url: items.url })
        .from(items)
        .where(inArray(items.sessionId, gsIds));
      for (const it of existingItems) existingUrls.add(it.url);
    }

    // Insert items + auto-tag
    const toCreate = relevant.slice(0, agent.maxItemsPerRun);
    for (const item of toCreate) {
      if (existingUrls.has(item.url)) continue;
      let hostname: string;
      try {
        hostname = new URL(item.url).hostname;
      } catch {
        continue;
      }

      const [newItem] = await db
        .insert(items)
        .values({
          sessionId,
          url: item.url,
          title: item.title,
          description: item.description,
          domain: hostname,
          contributorId: agent.userId,
        })
        .returning({ id: items.id });

      if (newItem) {
        itemsCreated++;
        existingUrls.add(item.url);

        if (item.matchedTopics && item.matchedTopics.length > 0) {
          for (const topic of item.matchedTopics.slice(0, 3)) {
            const tagName = topic.toLowerCase().trim();
            if (!tagName) continue;
            const existing = await db
              .select({ id: tags.id })
              .from(tags)
              .where(eq(tags.name, tagName))
              .limit(1);
            let tagId: string;
            if (existing.length > 0) {
              tagId = existing[0].id;
            } else {
              const [created] = await db
                .insert(tags)
                .values({ name: tagName })
                .returning({ id: tags.id });
              tagId = created.id;
            }
            await db
              .insert(itemTags)
              .values({ itemId: newItem.id, tagId })
              .onConflictDoNothing();
          }
        }
      }
    }

    if (itemsCreated === 0 && sessionId) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      sessionId = null;
    }

    await completeRun(run.id, agent, { sitesCrawled, itemsFound, itemsCreated, tokensUsed: totalTokens, sessionId });

    // Dispatch webhook (fire-and-forget)
    try {
      await dispatchWebhook(agent.userId, "agent.completed", {
        agentId: agent.id,
        sitesCrawled,
        itemsFound,
        itemsCreated,
        sessionId,
      });
    } catch { /* non-critical */ }

  } catch (e) {
    if (e instanceof RunTimeoutError) {
      await db
        .update(agentRuns)
        .set({
          status: "completed",
          errorMessage: `Timed out after ${Math.round(TOTAL_RUN_TIMEOUT_MS / 1000)}s - partial results`,
          sessionId,
          sitesCrawled,
          itemsFound,
          itemsCreated,
          tokensUsed: totalTokens,
          completedAt: new Date().toISOString(),
        })
        .where(eq(agentRuns.id, run.id));
      await db
        .update(agentConfigs)
        .set({ nextRunAt: getNextRunAt(agent.schedule) })
        .where(eq(agentConfigs.id, agent.id));
      return;
    }

    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    await db
      .update(agentRuns)
      .set({
        status: "failed",
        errorMessage,
        sessionId,
        sitesCrawled,
        itemsFound,
        itemsCreated,
        tokensUsed: totalTokens,
        completedAt: new Date().toISOString(),
      })
      .where(eq(agentRuns.id, run.id));

    try {
      await dispatchWebhook(agent.userId, "agent.failed", {
        agentId: agent.id,
        error: errorMessage,
      });
    } catch { /* non-critical */ }
  }
}

async function completeRun(
  runId: string,
  agent: { id: string; schedule: AgentSchedule },
  stats: {
    sitesCrawled: number;
    itemsFound: number;
    itemsCreated: number;
    tokensUsed: number;
    sessionId: string | null;
  }
) {
  await db
    .update(agentRuns)
    .set({
      status: "completed",
      sessionId: stats.sessionId,
      sitesCrawled: stats.sitesCrawled,
      itemsFound: stats.itemsFound,
      itemsCreated: stats.itemsCreated,
      tokensUsed: stats.tokensUsed,
      completedAt: new Date().toISOString(),
    })
    .where(eq(agentRuns.id, runId));
  await db
    .update(agentConfigs)
    .set({ nextRunAt: getNextRunAt(agent.schedule) })
    .where(eq(agentConfigs.id, agent.id));
}
