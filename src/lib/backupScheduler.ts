import { prisma } from "@/lib/prisma";
import { runBackup, type BackupResult } from "@/lib/backup";

// HOW THE AUTOMATIC BACKUP WORKS
//
// "Is a backup due?" is answered by ONE function, runDueBackup(). Two things call it:
//   1. a timer inside the app (startBackupScheduler) — works when the app is an always-on
//      process (Windows Service / `npm start`);
//   2. the web address /api/cron/backup — for hosts that cannot keep a timer alive
//      (Vercel), called every minute by a free pinger such as cron-job.org.
// Both can run together: the claim step below guarantees only ONE backup per day.
//
// The backup time is read in the schedule's own time zone (BackupSettings.timezone, saved from
// your browser), NOT the server's clock. A server in another time zone (Vercel is UTC) would
// otherwise fire hours late.
//
// A backup is "due" when: it is enabled, the time today has passed, and no scheduled backup has
// started since midnight (in that time zone). So if the app was off at the backup time, the
// backup runs as soon as something checks again that same day.

export const DEFAULT_TIMEZONE = "Africa/Nairobi";
const CHECK_INTERVAL_MS = 60_000;

type TimerStatus = { startedAt: number; lastTickAt: number | null; lastTickError: string | null };

declare global {
  // eslint-disable-next-line no-var
  var __backupSchedulerStatus: TimerStatus | undefined;
  // eslint-disable-next-line no-var
  var __backupRunInProgress: boolean | undefined;
}

// ── time zone helpers (no libraries, just Intl) ──────────────────────────────

export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function partsIn(at: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  });
  const o: Record<string, number> = {};
  for (const p of f.formatToParts(at)) if (p.type !== "literal") o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour, min: o.minute, s: o.second };
}

function offsetMs(at: Date, tz: string) {
  const p = partsIn(at, tz);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(at.getTime() / 1000) * 1000;
}

/** The exact moment when a wall clock in `tz` reads y-m-d h:min (day overflow is fine). */
function zonedToUtc(y: number, m: number, d: number, h: number, min: number, tz: string) {
  const guess = Date.UTC(y, m - 1, d, h, min, 0);
  const first = guess - offsetMs(new Date(guess), tz);
  return new Date(guess - offsetMs(new Date(first), tz));
}

function parseTime(value: string): [number, number] | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value?.trim() ?? "");
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 23 || min > 59 ? null : [h, min];
}

/** Today's occurrence of "HH:mm" in the schedule's time zone. */
export function targetToday(backupTime: string, tz: string, now = new Date()): Date | null {
  const t = parseTime(backupTime);
  if (!t) return null;
  const p = partsIn(now, tz);
  return zonedToUtc(p.y, p.m, p.d, t[0], t[1], tz);
}

/** Midnight at the start of today in that time zone. */
export function startOfLocalDay(tz: string, now = new Date()): Date {
  const p = partsIn(now, tz);
  return zonedToUtc(p.y, p.m, p.d, 0, 0, tz);
}

// ── schedule logic ───────────────────────────────────────────────────────────

type ScheduleFields = {
  enabled: boolean;
  backupTime: string;
  timezone: string;
  lastScheduledRunAt: Date | null;
};

/** When the schedule will next fire, for display in Settings. */
export function nextScheduledRun(
  s: ScheduleFields,
  now = new Date(),
): { at: Date | null; dueNow: boolean } {
  if (!s.enabled) return { at: null, dueNow: false };
  const tz = safeTimezone(s.timezone);
  const target = targetToday(s.backupTime, tz, now);
  if (!target) return { at: null, dueNow: false };

  if (now < target) return { at: target, dueNow: false };

  const ranToday = s.lastScheduledRunAt ? s.lastScheduledRunAt >= startOfLocalDay(tz, now) : false;
  if (!ranToday) return { at: now, dueNow: true };

  const p = partsIn(now, tz);
  const t = parseTime(s.backupTime)!;
  return { at: zonedToUtc(p.y, p.m, p.d + 1, t[0], t[1], tz), dueNow: false };
}

export function getSchedulerStatus() {
  const s = globalThis.__backupSchedulerStatus;
  return {
    started: Boolean(s),
    lastTickAt: s?.lastTickAt ? new Date(s.lastTickAt).toISOString() : null,
    lastTickError: s?.lastTickError ?? null,
    running: globalThis.__backupRunInProgress ?? false,
  };
}

export type DueOutcome =
  | { ran: true; result: BackupResult }
  | {
      ran: false;
      reason:
        | "no-settings"
        | "disabled"
        | "invalid-time"
        | "not-time-yet"
        | "already-ran-today"
        | "busy";
    };

/** Starts today's scheduled backup if (and only if) it is due. Safe to call as often as you like. */
export async function runDueBackup(source: "timer" | "external"): Promise<DueOutcome> {
  if (globalThis.__backupRunInProgress) return { ran: false, reason: "busy" };

  const now = new Date();
  const settings = await prisma.backupSettings.findUnique({ where: { id: "backup" } });
  if (!settings) return { ran: false, reason: "no-settings" };

  // Lets Settings show that something is really checking the schedule.
  await prisma.backupSettings.update({
    where: { id: "backup" },
    data: { lastCheckAt: now, lastCheckSource: source },
  });

  if (!settings.enabled) return { ran: false, reason: "disabled" };

  const tz = safeTimezone(settings.timezone);
  const target = targetToday(settings.backupTime, tz, now);
  if (!target) {
    console.warn("[backup-scheduler] invalid backupTime:", settings.backupTime);
    return { ran: false, reason: "invalid-time" };
  }
  if (now < target) return { ran: false, reason: "not-time-yet" };

  // Claim today's run BEFORE starting, in one atomic database step. If the timer and the
  // external trigger both notice at the same moment, only one of them wins.
  const claimed = await prisma.backupSettings.updateMany({
    where: {
      id: "backup",
      OR: [{ lastScheduledRunAt: null }, { lastScheduledRunAt: { lt: startOfLocalDay(tz, now) } }],
    },
    data: { lastScheduledRunAt: now },
  });
  if (claimed.count === 0) return { ran: false, reason: "already-ran-today" };

  globalThis.__backupRunInProgress = true;
  try {
    console.log(`[backup-scheduler] running scheduled backup (${source}, target ${settings.backupTime} ${tz})`);
    const result = await runBackup();
    console.log("[backup-scheduler] finished:", result.ok ? "success" : `FAILED — ${result.error}`);
    return { ran: true, result };
  } finally {
    globalThis.__backupRunInProgress = false;
  }
}

// ── the in-app timer ─────────────────────────────────────────────────────────

async function tick() {
  const status = globalThis.__backupSchedulerStatus;
  if (!status) return;
  status.lastTickAt = Date.now();
  try {
    await runDueBackup("timer");
    status.lastTickError = null;
  } catch (err) {
    status.lastTickError = err instanceof Error ? err.message : String(err);
    console.error("[backup-scheduler] tick failed:", err);
  }
}

export function startBackupScheduler() {
  // Guard against being started twice (e.g. dev-mode hot reload)
  if (globalThis.__backupSchedulerStatus) return;
  globalThis.__backupSchedulerStatus = { startedAt: Date.now(), lastTickAt: null, lastTickError: null };

  console.log("[backup-scheduler] started — checking every minute");
  setInterval(tick, CHECK_INTERVAL_MS);
  // Also check shortly after startup, in case the time already passed today while the app was off.
  setTimeout(tick, 10_000);
}
