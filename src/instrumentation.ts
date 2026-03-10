export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Run migrations on startup
    const { runMigrations } = await import("@/lib/db/migrate");
    runMigrations();

    // Setup FTS5
    const { setupFts } = await import("@/lib/db/fts");
    setupFts();

    // Start cron jobs
    const { startCronJobs } = await import("@/lib/cron");
    startCronJobs();
  }
}
