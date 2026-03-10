import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { agentConfigs, llmKeys, agentRuns } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { Bot, Key } from "lucide-react";

export default async function AgentPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const keys = await db
    .select({
      id: llmKeys.id,
      provider: llmKeys.provider,
      keyPrefix: llmKeys.keyPrefix,
      model: llmKeys.model,
      isValid: llmKeys.isValid,
    })
    .from(llmKeys)
    .where(eq(llmKeys.userId, userId));

  const agents = await db
    .select()
    .from(agentConfigs)
    .where(eq(agentConfigs.userId, userId));

  const recentRuns = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.userId, userId))
    .orderBy(desc(agentRuns.startedAt))
    .limit(10);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-zinc-900">AI Agent</h1>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">LLM Keys</h2>
        {keys.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
            <Key className="mx-auto h-8 w-8 text-zinc-400" />
            <p className="mt-3 text-sm text-zinc-500">
              Add your API key to use AI features. Supports OpenAI, Anthropic, and Google.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3">
                <div>
                  <span className="text-sm font-medium text-zinc-900 capitalize">{key.provider}</span>
                  <span className="ml-2 text-xs text-zinc-400">{key.keyPrefix}...</span>
                  {key.model && <span className="ml-2 text-xs text-zinc-500">{key.model}</span>}
                </div>
                <span className={`text-xs ${key.isValid ? "text-green-600" : "text-red-600"}`}>
                  {key.isValid ? "Valid" : "Invalid"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">Agents</h2>
        {agents.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center">
            <Bot className="mx-auto h-8 w-8 text-zinc-400" />
            <p className="mt-3 text-sm text-zinc-500">
              No agents configured yet. Add an LLM key first, then create an agent.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {agents.map((agent) => (
              <div key={agent.id} className="rounded-md border border-zinc-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-zinc-900">{agent.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    agent.status === "active" ? "bg-green-50 text-green-700" :
                    agent.status === "error" ? "bg-red-50 text-red-700" :
                    "bg-zinc-100 text-zinc-500"
                  }`}>{agent.status}</span>
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Schedule: {agent.schedule} · Threshold: {agent.relevanceThreshold}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {recentRuns.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-zinc-900">Recent Runs</h2>
          <div className="space-y-2">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3 text-sm">
                <div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    run.status === "completed" ? "bg-green-50 text-green-700" :
                    run.status === "failed" ? "bg-red-50 text-red-700" :
                    run.status === "running" ? "bg-blue-50 text-blue-700" :
                    "bg-zinc-100 text-zinc-500"
                  }`}>{run.status}</span>
                  <span className="ml-2 text-zinc-500">
                    {run.sitesCrawled} sites, {run.itemsCreated} items
                  </span>
                </div>
                <span className="text-xs text-zinc-400">
                  {run.startedAt ? new Date(run.startedAt).toLocaleString() : "—"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
