import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/adminAuth";
import { fillMissingPrice } from "@/lib/pricing";

type Params = { params: Promise<{ id: string }> };

function toFloatOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string | number | null> = {};
  for (const f of ["sku","no","product","packsize","barcode"]) {
    if (typeof body[f] === "string") data[f] = body[f].trim();
  }
  if ("unitPrice" in body) data.unitPrice = toFloatOrNull(body.unitPrice);
  if ("price" in body) data.price = toFloatOrNull(body.price);
  try {
    // If a price was sent without a unit price (or the reverse), work out the missing one.
    if ("unitPrice" in body || "price" in body || "packsize" in body) {
      const current = await prisma.product.findUnique({ where: { id } });
      if (!current) return NextResponse.json({ error: "Not found." }, { status: 404 });
      const filled = fillMissingPrice({
        packsize: "packsize" in data ? data.packsize : current.packsize,
        unitPrice: "unitPrice" in data ? data.unitPrice : current.unitPrice,
        price: "price" in data ? data.price : current.price,
      });
      if ("unitPrice" in data || "price" in data) {
        data.unitPrice = filled.unitPrice;
        data.price = filled.price;
      }
    }
    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
