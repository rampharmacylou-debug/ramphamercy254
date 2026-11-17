import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";
import { requireAdmin } from "@/lib/adminAuth";

export const maxDuration = 60;

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  const result = await runBackup();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fileUrl: result.fileUrl, localPath: result.localPath });
}
