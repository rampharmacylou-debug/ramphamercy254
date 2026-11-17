import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_COOKIE,
  DEVICE_COOKIE_MAX_AGE,
  getAdminAccess,
  isHttps,
  newDeviceToken,
  requireAdmin,
} from "@/lib/adminAuth";

// List trusted machines.
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const access = await getAdminAccess();
  const devices = await prisma.trustedDevice.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    devices: devices.map((d) => ({
      id: d.id,
      label: d.label,
      createdAt: d.createdAt,
      lastUsedAt: d.lastUsedAt,
      isThisMachine: d.id === access.deviceId,
    })),
  });
}

// Mark THIS browser/PC as trusted: it will no longer be asked for the admin password.
export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const label = (typeof body.label === "string" ? body.label : "").trim().slice(0, 60);
  if (!label) {
    return NextResponse.json({ error: "Give this machine a name (e.g. “Shop counter PC”)." }, { status: 400 });
  }

  // If this browser is already trusted, replace its old entry rather than duplicating it.
  const access = await getAdminAccess();
  if (access.deviceId) {
    await prisma.trustedDevice.delete({ where: { id: access.deviceId } }).catch(() => {});
  }

  const { token, tokenHash } = newDeviceToken();
  await prisma.trustedDevice.create({ data: { label, tokenHash, lastUsedAt: new Date() } });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  });
  return res;
}

// Remove a trusted machine (?id=…). That machine must use the password again.
export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const access = await getAdminAccess();
  await prisma.trustedDevice.delete({ where: { id } }).catch(() => {});

  const res = NextResponse.json({ ok: true });
  if (id === access.deviceId) {
    res.cookies.set(DEVICE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  }
  return res;
}
