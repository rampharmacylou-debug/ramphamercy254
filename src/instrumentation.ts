export async function register() {
  // This exact `=== "nodejs"` check lets Next.js leave the scheduler (and the Google/Node-only
  // code it uses) out of the edge build. Do not rewrite it as an early `return`, that breaks the build.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Vercel runs short-lived functions that are frozen between requests, so a timer can't work
    // there. On Vercel the schedule is triggered by /api/cron/backup instead.
    if (process.env.VERCEL) {
      console.log("[backup-scheduler] Vercel detected — using /api/cron/backup instead of a timer");
      return;
    }

    const { startBackupScheduler } = await import("@/lib/backupScheduler");
    startBackupScheduler();
  }
}
