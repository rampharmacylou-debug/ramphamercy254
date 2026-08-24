import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, string> = {};
  for (const f of ["sku","no","product","packsize","unitPrice","price","barcode"]) {
    if (typeof body[f] === "string") data[f] = body[f].trim();
  }
  try {
    const updated = await prisma.product.update({ where: { id }, data });
    return NextResponse.json({ product: updated });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
