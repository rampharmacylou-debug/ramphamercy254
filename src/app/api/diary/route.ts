import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respondForRole } from "@/lib/staffTabsServer";
import { requireAdmin } from "@/lib/adminAuth";
import { requireViewer } from "@/lib/staffAuth";
import { isInvoiceAction, parseDiscount } from "@/lib/diaryFields";
import { getDiaryConfig } from "@/lib/diaryConfigServer";

export async function GET() {
  const viewer = await requireViewer();
  if (viewer instanceof NextResponse) return viewer;
  const entries = await prisma.diaryEntry.findMany({ orderBy: { date: "desc" } });
  return respondForRole("diary", "entries", entries, viewer);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  // The admin decides (Settings > Diary) whether the invoice choice is asked for and whether it is compulsory.
  const cfg = await getDiaryConfig();
  if (cfg.invoice.enabled && cfg.invoice.required && !isInvoiceAction(body.invoiceAction)) {
    return NextResponse.json({ error: cfg.invoice.missingMessage }, { status: 400 });
  }
  const discount = parseDiscount(body.discountPercent);
  if (!discount.ok) {
    return NextResponse.json({ error: "Discount must be between 0 and 100 percent." }, { status: 400 });
  }
  const created = await prisma.diaryEntry.create({
    data: {
      clientId:   body.clientId || null,
      clientName: (body.clientName ?? "").trim(),
      date:       body.date ?? new Date().toISOString().slice(0, 10),
      itemsTaken: (body.itemsTaken ?? "").trim(),
      qty:        Number(body.qty)       || 0,
      transport:  Number(body.transport) || 0,
      paidStatus: ["paid","partial","unpaid"].includes(body.paidStatus) ? body.paidStatus : "unpaid",
      invoiceAction: isInvoiceAction(body.invoiceAction) ? body.invoiceAction : undefined,
      discountPercent: discount.value,
    },
  });
  return NextResponse.json({ entry: created }, { status: 201 });
}
