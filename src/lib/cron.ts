import cron from "node-cron";

let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  console.log("[cron] Starting scheduled jobs...");

  // Run AI agents every hour
  cron.schedule("0 * * * *", async () => {
    console.log("[cron] Running agent execution...");
    try {
      const { processAgentRuns } = await import("@/lib/agent/scheduler");
      await processAgentRuns();
    } catch (err) {
      console.error("[cron] Agent execution failed:", err);
    }
  });

  console.log("[cron] Scheduled jobs started.");
}
