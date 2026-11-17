import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireViewer } from "@/lib/staffAuth";
import { getStaffConfig } from "@/lib/staffTabsServer";
import { getDiaryConfig } from "@/lib/diaryConfigServer";
import { detailContextFromDiary } from "@/lib/searchContext";
import { getSearchDisplay } from "@/lib/searchDisplayServer";
import {
  AllowedSection,
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SearchGroup,
  allowedSections,
  buildDetails,
  buildTooltip,
  mainText,
  parseQuery,
} from "@/lib/searchRules";

const NO_STORE = { "Cache-Control": "private, no-store" };

// Every word typed must match somewhere (name, phone, SKU...), in any order: "mary nairobi" finds Mary on the Nairobi route.
function containsAll(words: string[], columns: string[]) {
  return {
    AND: words.map((w) => ({
      OR: columns.map((c) => ({ [c]: { contains: w, mode: "insensitive" as const } })),
    })),
  };
}

// One search across the whole app. Admins search everything. Staff only search the tabs the admin
// switched on, and only by the fields the admin lets them see (see allowedSections).
export async function GET(req: NextRequest) {
  const viewer = await requireViewer();
  if (viewer instanceof NextResponse) return viewer;

  const words = parseQuery(req.nextUrl.searchParams.get("q"));
  const q = words.join(" ");
  const limit = Math.min(
    SEARCH_MAX_LIMIT,
    Math.max(1, Math.round(Number(req.nextUrl.searchParams.get("limit"))) || SEARCH_DEFAULT_LIMIT),
  );
  if (words.length === 0) return NextResponse.json({ q, sections: [] }, { headers: NO_STORE });

  const [staffConfig, display, diary] = await Promise.all([
    viewer.kind === "admin" ? Promise.resolve(null) : getStaffConfig(),
    getSearchDisplay(),
    getDiaryConfig(),
  ]);
  const sections = allowedSections(staffConfig, display);
  const ctx = detailContextFromDiary(diary);

  const run = async ({ key, columns, main, details, visible, popupLabels, tooltip }: AllowedSection): Promise<SearchGroup> => {
    const where = containsAll(words, columns);
    const shape = (rows: Record<string, unknown>[]) =>
      rows.map((r) => {
        // The pop-up lists the fields the admin chose (in their order, with their names), limited to what this
        // person may see. Nothing is sent when it is switched off or no field is left to show.
        const more = tooltip ? buildTooltip(key, r, visible, ctx, popupLabels) : [];
        return {
          id: String(r.id),
          title: mainText(key, r, main),
          meta: buildDetails(key, r, details, ctx),
          ...(more.length > 0 && { more }),
        };
      });

    // Whole rows of the needed columns are read, but only the fields allowed for this viewer AND chosen by the
    // admin are ever put into the answer (see allowedSections / buildDetails / mainText).
    switch (key) {
      case "products": {
        const w = where as unknown as Prisma.ProductWhereInput;
        const [total, rows] = await Promise.all([
          prisma.product.count({ where: w }),
          prisma.product.findMany({
            where: w,
            orderBy: { product: "asc" },
            take: limit,
            select: { id: true, product: true, no: true, sku: true, packsize: true, barcode: true, unitPrice: true, price: true },
          }),
        ]);
        return { key, total, items: shape(rows) };
      }
      case "clients": {
        const w = where as unknown as Prisma.ClientWhereInput;
        const [total, rows] = await Promise.all([
          prisma.client.count({ where: w }),
          prisma.client.findMany({
            where: w,
            orderBy: { clientName: "asc" },
            take: limit,
            select: { id: true, clientName: true, phone: true, routeName: true, phamPrice: true, riderPrice: true },
          }),
        ]);
        return { key, total, items: shape(rows) };
      }
      case "diary": {
        const w = where as unknown as Prisma.DiaryEntryWhereInput;
        const [total, rows] = await Promise.all([
          prisma.diaryEntry.count({ where: w }),
          prisma.diaryEntry.findMany({
            where: w,
            orderBy: [{ date: "desc" }, { createdAt: "desc" }],
            take: limit,
            select: { id: true, clientName: true, date: true, itemsTaken: true, qty: true, transport: true, paidStatus: true, invoiceAction: true, discountPercent: true },
          }),
        ]);
        return { key, total, items: shape(rows) };
      }
      case "transport": {
        const w = where as unknown as Prisma.TransportRecordWhereInput;
        const [total, rows] = await Promise.all([
          prisma.transportRecord.count({ where: w }),
          prisma.transportRecord.findMany({
            where: w,
            orderBy: { updatedAt: "desc" },
            take: limit,
            select: { id: true, clientName: true, riderName: true, routeName: true, phamPrice: true, riderPrice: true },
          }),
        ]);
        return { key, total, items: shape(rows) };
      }
    }
  };

  try {
    const groups = await Promise.all(sections.map(run));
    return NextResponse.json({ q, sections: groups.filter((g) => g.total > 0) }, { headers: NO_STORE });
  } catch (err) {
    console.error("[api/search] failed:", err);
    return NextResponse.json({ error: "Search is unavailable right now." }, { status: 500, headers: NO_STORE });
  }
}
