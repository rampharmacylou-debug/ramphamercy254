import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const created = await prisma.product.create({
    data: {
      sku:       (body.sku       ?? "").trim(),
      no:        (body.no        ?? "").trim(),
      product:   (body.product   ?? "").trim(),
      packsize:  (body.packsize  ?? "").trim(),
      unitPrice: (body.unitPrice ?? "").trim(),
      price:     (body.price     ?? "").trim(),
      barcode:   (body.barcode   ?? "").trim(),
    },
  });
  return NextResponse.json({ product: created }, { status: 201 });
}
