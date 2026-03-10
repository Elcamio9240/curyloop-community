import { db } from "@/lib/db";
import { agentConfigs } from "@/lib/db/schema";
import { eq, and, lte } from "drizzle-orm";
import { processAgent } from "./process-agent";

export async function processAgentRuns() {
  const now = new Date().toISOString();

  const dueAgents = await db
    .select()
    .from(agentConfigs)
    .where(
      and(
        eq(agentConfigs.status, "active"),
        lte(agentConfigs.nextRunAt, now)
      )
    );

  console.log(`[scheduler] Found ${dueAgents.length} agents due for execution`);

  for (const agent of dueAgents) {
    try {
      await processAgent({
        id: agent.id,
        userId: agent.userId,
        name: agent.name,
        llmKeyId: agent.llmKeyId,
        groupId: agent.groupId,
        schedule: agent.schedule as "6h" | "12h" | "daily" | "weekly",
        maxItemsPerRun: agent.maxItemsPerRun,
        relevanceThreshold: agent.relevanceThreshold,
      });
    } catch (err) {
      console.error(`[scheduler] Agent ${agent.id} failed:`, err);
    }
  }
}
