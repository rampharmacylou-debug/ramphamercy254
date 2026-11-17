import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/adminAuth";
import { passwordProblem } from "@/lib/staffAuth";

type Params = { params: Promise<{ id: string }> };

// One endpoint for everything the admin can do to an account:
//   { action: "set-active", active: boolean }   switch the account on/off (off also signs the person out)
//   { action: "reset-password", password }      new password (also signs the person out everywhere)
//   { action: "sign-out" }                      sign the person out of every device
//   { action: "rename", name }                  change the display name
//   { action: "unlock" }                        clear a "too many wrong passwords" pause
export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const user = await prisma.user.findUnique({ where: { id } }).catch(() => null);
  if (!user || user.role !== "staff") return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const signOut = { tokenVersion: { increment: 1 } };

  switch (body.action) {
    case "set-active": {
      const active = body.active === true;
      await prisma.user.update({ where: { id }, data: { active, ...(active ? {} : signOut) } });
      break;
    }
    case "reset-password": {
      const problem = passwordProblem(body.password);
      if (problem) return NextResponse.json({ error: problem }, { status: 400 });
      await prisma.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(body.password), failedLogins: 0, lockedUntil: null, ...signOut },
      });
      break;
    }
    case "sign-out":
      await prisma.user.update({ where: { id }, data: signOut });
      break;
    case "rename": {
      const name = (typeof body.name === "string" ? body.name : "").trim().slice(0, 60) || null;
      await prisma.user.update({ where: { id }, data: { name } });
      break;
    }
    case "unlock":
      await prisma.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

// Delete an account for good (its sessions stop working at once).
export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } }).catch(() => null);
  if (!user || user.role !== "staff") return NextResponse.json({ error: "Account not found." }, { status: 404 });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
