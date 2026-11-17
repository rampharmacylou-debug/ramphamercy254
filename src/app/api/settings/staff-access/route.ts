import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { clampSessionHours, getStaffAccessSettings } from "@/lib/staffAuth";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ settings: await getStaffAccessSettings() }, { headers: { "Cache-Control": "no-store" } });
}

// Staff sign-in on/off, and how long a staff session lasts.
export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const data = { requireLogin: body.requireLogin !== false, sessionHours: clampSessionHours(body.sessionHours) };
  try {
    await prisma.staffAccess.upsert({
      where: { id: "staff" },
      create: { id: "staff", ...data },
      update: data,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save. Run `npm run db:migrate` once, then restart the app." },
      { status: 500 },
    );
  }
  return NextResponse.json({ settings: data });
}
