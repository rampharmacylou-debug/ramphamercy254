import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { respondForRole } from "@/lib/staffTabsServer";
import { requireAdmin } from "@/lib/adminAuth";
import { requireViewer } from "@/lib/staffAuth";
import { fillMissingPrice } from "@/lib/pricing";

// Same numeric coercion used by the Excel import route — a Float? column
// can't accept a raw string (not even ""), which is what was crashing
// manual "Add product" submissions (the form sends unitPrice/price as
// plain text input strings).
function toFloatOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

export async function GET() {
  const viewer = await requireViewer();
  if (viewer instanceof NextResponse) return viewer;
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
  return respondForRole("products", "products", products, viewer);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const prices = fillMissingPrice({
    packsize: body.packsize,
    unitPrice: toFloatOrNull(body.unitPrice),
    price: toFloatOrNull(body.price),
  });
  const created = await prisma.product.create({
    data: {
      sku:       (body.sku       ?? "").trim(),
      no:        (body.no        ?? "").trim(),
      product:   (body.product   ?? "").trim(),
      packsize:  (body.packsize  ?? "").trim(),
      unitPrice: prices.unitPrice,
      price:     prices.price,
      barcode:   (body.barcode   ?? "").trim(),
    },
  });
  return NextResponse.json({ product: created }, { status: 201 });
}
