import { NextRequest, NextResponse } from "next/server";
import {
  MIN_PASSWORD_LENGTH,
  checkAdminPassword,
  requireAdmin,
  setAdminPassword,
} from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const check = await checkAdminPassword(currentPassword);
  if (!check.ok) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });
  }

  await setAdminPassword(newPassword);
  return NextResponse.json({ ok: true });
}
