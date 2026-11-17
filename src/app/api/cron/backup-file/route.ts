import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { buildWorkbookBuffer } from "@/lib/backup";
import { nextScheduledRun } from "@/lib/backupScheduler";

// "Pull" backup for Google Drive — used by the Google Apps Script in scripts/apps-script/Code.gs.
//
// Instead of this app pushing a file to Drive (which needs a Google login token that can expire),
// a script running inside your Google account asks this address every 15 minutes:
//
//   GET  → "is the daily backup due?"  204 = not yet.  200 = yes, here is the .xlsx file.
//   POST → "I saved it" (or "saving failed") so Settings shows the result and today is marked done.
//
// It uses the schedule you already set in Settings (time, time zone, on/off), and the same
// "one backup per day" rule as the rest of the backup system. Nothing has to keep running here,
// so it works on Vercel.
//
// Protected by CRON_SECRET — the same secret as /api/cron/backup. Send it as the `x-backup-key`
// header (what the script does), as `Authorization: Bearer …`, or as `?key=…`.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SOURCE = "apps-script";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function checkSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set on the server." }, { status: 503 });
  }
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided =
    req.headers.get("x-backup-key") || bearer || req.nextUrl.searchParams.get("key") || "";
  if (!provided || !sameSecret(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const denied = checkSecret(req);
  if (denied) return denied;

  try {
    const now = new Date();

    // Also lets Settings show that something is really checking the schedule.
    const settings = await prisma.backupSettings.upsert({
      where: { id: "backup" },
      create: { id: "backup", lastCheckAt: now, lastCheckSource: SOURCE },
      update: { lastCheckAt: now, lastCheckSource: SOURCE },
    });

    // ?force=1 skips the schedule (used by the script's "runBackupNow" button).
    const force = req.nextUrl.searchParams.get("force") === "1";
    if (!force && !nextScheduledRun(settings, now).dueNow) {
      return new NextResponse(null, { status: 204 });
    }

    const buffer = await buildWorkbookBuffer();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: { "Content-Type": XLSX_MIME, "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[cron/backup-file] failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not build the backup." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = checkSecret(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const manual = body.manual === true;

  try {
    if (body.ok === true) {
      // Only store real https links — this value is shown as a clickable link in Settings.
      const fileUrl =
        typeof body.fileUrl === "string" && /^https:\/\//.test(body.fileUrl)
          ? body.fileUrl.slice(0, 500)
          : null;
      const data = {
        lastRunAt: now,
        lastStatus: "success",
        lastError: null,
        lastFileUrl: fileUrl,
        // A scheduled run marks today as done. A manual one must not cancel today's timed backup.
        ...(manual ? {} : { lastScheduledRunAt: now }),
      };
      await prisma.backupSettings.upsert({
        where: { id: "backup" },
        create: { id: "backup", ...data },
        update: data,
      });
    } else {
      // Failed: do NOT mark today as done, so the next check (15 min later) tries again.
      const message =
        typeof body.error === "string" && body.error.trim()
          ? body.error.trim().slice(0, 500)
          : "The Google Apps Script reported a failure.";
      const data = { lastRunAt: now, lastStatus: "error", lastError: message };
      await prisma.backupSettings.upsert({
        where: { id: "backup" },
        create: { id: "backup", ...data },
        update: data,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[cron/backup-file] confirm failed:", err);
    return NextResponse.json({ error: "Could not record the result." }, { status: 500 });
  }
}
