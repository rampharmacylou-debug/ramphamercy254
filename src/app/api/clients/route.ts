import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respondForRole } from "@/lib/staffTabsServer";
import { requireAdmin } from "@/lib/adminAuth";
import { requireViewer } from "@/lib/staffAuth";

export async function GET() {
  const viewer = await requireViewer();
  if (viewer instanceof NextResponse) return viewer;
  const clients = await prisma.client.findMany({ orderBy: { clientName: "asc" } });
  return respondForRole("clients", "clients", clients, viewer);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const created = await prisma.client.create({
    data: {
      clientName: (body.clientName ?? "").trim(),
      phone:      (body.phone      ?? "").trim(),
      routeName:  (body.routeName  ?? "").trim(),
      riderPrice: Number(body.riderPrice) || 0,
      phamPrice:  Number(body.phamPrice)  || 0,
    },
  });
  return NextResponse.json({ client: created }, { status: 201 });
}
