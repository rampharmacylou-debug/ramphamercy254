import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDriveConfigured } from "@/lib/googleDrive";
import { getSchedulerStatus, nextScheduledRun, safeTimezone, targetToday } from "@/lib/backupScheduler";
import { requireAdmin } from "@/lib/adminAuth";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function payload(settings: Awaited<ReturnType<typeof prisma.backupSettings.upsert>>) {
  const next = nextScheduledRun(settings);
  return {
    settings,
    driveConfigured: isDriveConfigured(),
    scheduler: {
      ...getSchedulerStatus(),
      nextRunAt: next.at ? next.at.toISOString() : null,
      dueNow: next.dueNow,
      serverTime: new Date().toISOString(),
      timezone: safeTimezone(settings.timezone),
      cronConfigured: Boolean(process.env.CRON_SECRET),
      onVercel: Boolean(process.env.VERCEL),
    },
  };
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const settings = await prisma.backupSettings.upsert({
    where: { id: "backup" },
    create: { id: "backup" },
    update: {},
  });
  return NextResponse.json(payload(settings));
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const data: {
    enabled?: boolean;
    backupTime?: string;
    timezone?: string;
    backupToGoogleDrive?: boolean;
    backupToLocalFolder?: boolean;
    localFolderPath?: string | null;
    includeDatabaseDump?: boolean;
  } = {};

  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.backupToGoogleDrive === "boolean") data.backupToGoogleDrive = body.backupToGoogleDrive;
  if (typeof body.backupToLocalFolder === "boolean") data.backupToLocalFolder = body.backupToLocalFolder;
  if (typeof body.includeDatabaseDump === "boolean") data.includeDatabaseDump = body.includeDatabaseDump;
  if (typeof body.localFolderPath === "string") data.localFolderPath = body.localFolderPath.trim() || null;

  if (typeof body.backupTime === "string") {
    if (!TIME_RE.test(body.backupTime)) {
      return NextResponse.json({ error: "backupTime must be in HH:mm 24h format." }, { status: 400 });
    }
    data.backupTime = body.backupTime;
  }

  if (typeof body.timezone === "string") {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: body.timezone });
      data.timezone = body.timezone;
    } catch {
      return NextResponse.json({ error: "Unknown time zone." }, { status: 400 });
    }
  }

  if (data.backupToLocalFolder && data.localFolderPath === null) {
    return NextResponse.json(
      { error: "Enter a folder path before turning on local-folder backups." },
      { status: 400 }
    );
  }

  // Saving the schedule starts it fresh for today:
  //  • new time still ahead today  → it WILL fire today at that time, even if a
  //    scheduled backup already ran earlier today;
  //  • new time already passed     → wait for tomorrow instead of firing the
  //    moment you press Save.
  if (data.enabled !== undefined || data.backupTime !== undefined || data.timezone !== undefined) {
    const existing = await prisma.backupSettings.upsert({
      where: { id: "backup" },
      create: { id: "backup" },
      update: {},
    });
    const enabled = data.enabled ?? existing.enabled;
    const time = data.backupTime ?? existing.backupTime;
    const tz = safeTimezone(data.timezone ?? existing.timezone);
    if (enabled) {
      const now = new Date();
      const target = targetToday(time, tz, now);
      const scheduleChanged =
        (data.enabled === true && !existing.enabled) ||
        (data.backupTime !== undefined && data.backupTime !== existing.backupTime) ||
        (data.timezone !== undefined && data.timezone !== existing.timezone);
      if (scheduleChanged && target) {
        (data as Record<string, unknown>).lastScheduledRunAt = now >= target ? now : null;
      }
    }
  }

  const settings = await prisma.backupSettings.upsert({
    where: { id: "backup" },
    create: { id: "backup", ...data },
    update: data,
  });

  return NextResponse.json(payload(settings));
}
