import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exportProductsToSheet, isSheetsConfigured } from "@/lib/googleSheets";
import { requireAdmin } from "@/lib/adminAuth";

export async function POST() {
  const denied = await requireAdmin();
  if (denied) return denied;
  if (!isSheetsConfigured()) {
    return NextResponse.json({ ok: false, skipped: true });
  }

  try {
    const products = await prisma.product.findMany({
      select: { no: true, product: true, packsize: true, unitPrice: true, price: true, barcode: true, sku: true },
      orderBy: { updatedAt: "desc" },
    });
    const result = await exportProductsToSheet(products);
    return NextResponse.json({ ok: true, rows: result.rows });
  } catch (err) {
    console.error("[export-sheet] failed:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Sheet export failed." },
      { status: 500 }
    );
  }
}
