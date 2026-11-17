import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { resolveStaffConfig } from "@/lib/staffTabs";
import { STAFF_CONFIG_TAG, getStaffConfig } from "@/lib/staffTabsServer";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ config: await getStaffConfig() });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  // resolveStaffConfig throws away anything unknown and forces locked fields on.
  const config = resolveStaffConfig(body);
  if (!Object.values(config.tabs).some((t) => t.visible)) {
    return NextResponse.json({ error: "Keep at least one tab visible for staff." }, { status: 400 });
  }
  await prisma.staffTabConfig.upsert({
    where: { id: "staff" },
    create: { id: "staff", config },
    update: { config },
  });
  revalidateTag(STAFF_CONFIG_TAG);
  return NextResponse.json({ config });
}
