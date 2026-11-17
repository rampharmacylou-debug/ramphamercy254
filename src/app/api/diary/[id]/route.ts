import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { isInvoiceAction, parseDiscount } from "@/lib/diaryFields";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const discount = parseDiscount(body.discountPercent);
  if (!discount.ok) {
    return NextResponse.json({ error: "Discount must be between 0 and 100 percent." }, { status: 400 });
  }
  try {
    const updated = await prisma.diaryEntry.update({
      where: { id },
      data: {
        clientId:   body.clientId || null,
        clientName: (body.clientName ?? "").trim(),
        date:       body.date,
        itemsTaken: (body.itemsTaken ?? "").trim(),
        // Only what the form sent is changed. When the admin has switched a part of the diary off (Settings > Diary)
        // the form leaves it out, and the value already saved on the entry stays exactly as it was.
        ...(body.qty !== undefined && { qty: Number(body.qty) || 0 }),
        ...(body.transport !== undefined && { transport: Number(body.transport) || 0 }),
        ...(body.paidStatus !== undefined && {
          paidStatus: ["paid", "partial", "unpaid"].includes(body.paidStatus) ? body.paidStatus : "unpaid",
        }),
        ...(body.invoiceAction !== undefined && { invoiceAction: isInvoiceAction(body.invoiceAction) ? body.invoiceAction : null }),
        ...(body.discountPercent !== undefined && { discountPercent: discount.value }),
      },
    });
    return NextResponse.json({ entry: updated });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  try {
    await prisma.diaryEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
