import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respondForRole } from "@/lib/staffTabsServer";
import { requireAdmin } from "@/lib/adminAuth";
import { requireViewer } from "@/lib/staffAuth";

export async function GET() {
  const viewer = await requireViewer();
  if (viewer instanceof NextResponse) return viewer;
  const trips = await prisma.transportRecord.findMany({ orderBy: { updatedAt: "desc" } });
  return respondForRole("transport", "trips", trips, viewer);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const created = await prisma.transportRecord.create({
    data: {
      clientId:   body.clientId || null,
      clientName: (body.clientName ?? "").trim(),
      riderName:  (body.riderName  ?? "").trim(),
      routeName:  (body.routeName  ?? "").trim(),
      riderPrice: Number(body.riderPrice) || 0,
      phamPrice:  Number(body.phamPrice)  || 0,
    },
  });
  return NextResponse.json({ trip: created }, { status: 201 });
}
