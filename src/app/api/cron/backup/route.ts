import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runDueBackup } from "@/lib/backupScheduler";

// Called every minute (or every few minutes) by a free pinger such as cron-job.org, or by
// Vercel Cron. It does nothing unless a backup is due, so calling it often is harmless.
//
// Protected by CRON_SECRET: send it as `?key=...` or as `Authorization: Bearer ...`
// (Vercel Cron sends the Bearer form automatically when CRON_SECRET is set).
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not set on the server." }, { status: 503 });
  }

  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const provided = bearer || req.nextUrl.searchParams.get("key") || "";
  if (!provided || !sameSecret(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const outcome = await runDueBackup("external");
    if (outcome.ran) {
      return NextResponse.json(
        outcome.result.ok ? { ran: true, ok: true } : { ran: true, ok: false, error: outcome.result.error },
      );
    }
    return NextResponse.json({ ran: false, reason: outcome.reason });
  } catch (err) {
    console.error("[cron/backup] failed:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed." }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
