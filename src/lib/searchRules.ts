// Rules for the live search box (admin and staff). Pure code: no database, so it can be tested and shared.

import { StaffConfig } from "@/lib/staffTabs";

export const SEARCH_SECTIONS = ["products", "clients", "diary", "transport"] as const;
export type SearchSection = (typeof SEARCH_SECTIONS)[number];

export const SEARCH_MIN_CHARS = 2;
export const SEARCH_MAX_CHARS = 60;
export const SEARCH_MAX_WORDS = 5;
export const SEARCH_DEFAULT_LIMIT = 5;
export const SEARCH_MAX_LIMIT = 8;

export type SearchMore = { label: string; value: string };
/** `more` is what the pop-up shows when you hover a result: every detail this person is allowed to see. */
export type SearchItem = { id: string; title: string; meta: string[]; more?: SearchMore[] };
export type SearchGroup = { key: SearchSection; total: number; items: SearchItem[] };
export type SearchResponse = { q: string; sections: SearchGroup[] };

/** "mary  nairobi " -> ["mary", "nairobi"]. Empty when there is too little to search for. */
export function parseQuery(raw: string | null | undefined): string[] {
  const text = (raw ?? "").trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_CHARS);
  if (text.length < SEARCH_MIN_CHARS) return [];
  return text.split(" ").slice(0, SEARCH_MAX_WORDS);
}

// ── What a result can show ───────────────────────────────────────────────────

export type FieldKind = "text" | "money" | "number" | "paid" | "invoice" | "discount";
export type SearchFieldDef = {
  /** Same as the field key in lib/staffTabs.ts and the database column. */
  key: string;
  label: string;
  kind: FieldKind;
  /** Typing can match this field (text only). Whether it is also SHOWN is the admin's choice. */
  searchable: boolean;
};

export const SECTION_FIELDS: Record<SearchSection, SearchFieldDef[]> = {
  products: [
    { key: "product", label: "Product name", kind: "text", searchable: true },
    { key: "sku", label: "SKU", kind: "text", searchable: true },
    { key: "no", label: "No.", kind: "text", searchable: true },
    { key: "packsize", label: "Pack size", kind: "text", searchable: true },
    { key: "unitPrice", label: "Unit price", kind: "money", searchable: false },
    { key: "price", label: "Price", kind: "money", searchable: false },
    { key: "barcode", label: "Barcode", kind: "text", searchable: true },
  ],
  clients: [
    { key: "clientName", label: "Client name", kind: "text", searchable: true },
    { key: "phone", label: "Phone", kind: "text", searchable: true },
    { key: "routeName", label: "Route", kind: "text", searchable: true },
    { key: "phamPrice", label: "Price", kind: "money", searchable: false },
    { key: "riderPrice", label: "Rider price", kind: "money", searchable: false },
  ],
  diary: [
    { key: "clientName", label: "Client name", kind: "text", searchable: true },
    { key: "date", label: "Date", kind: "text", searchable: true },
    { key: "itemsTaken", label: "Items taken", kind: "text", searchable: true },
    { key: "qty", label: "Quantity", kind: "number", searchable: false },
    { key: "transport", label: "Transport charge", kind: "money", searchable: false },
    { key: "paidStatus", label: "Paid status", kind: "paid", searchable: false },
    { key: "invoiceAction", label: "Invoice", kind: "invoice", searchable: false },
    { key: "discountPercent", label: "Discount", kind: "discount", searchable: false },
  ],
  transport: [
    { key: "clientName", label: "Client name", kind: "text", searchable: true },
    { key: "riderName", label: "Rider", kind: "text", searchable: true },
    { key: "routeName", label: "Route", kind: "text", searchable: true },
    { key: "phamPrice", label: "Price", kind: "money", searchable: false },
    { key: "riderPrice", label: "Rider price", kind: "money", searchable: false },
  ],
};

/** The main line of a result is always one of these if the admin's choice isn't usable (e.g. hidden from staff). */
export const DEFAULT_TITLE: Record<SearchSection, string> = {
  products: "product",
  clients: "clientName",
  diary: "clientName",
  transport: "clientName",
};

/**
 * Per section, as chosen by the admin: the main line (bold), the details shown under it, and whether
 * hovering a result opens a pop-up with all the details.
 */
export type SearchDisplay = Record<
  SearchSection,
  {
    main: string;
    details: string[];
    tooltip: boolean;
    /** The pop-up's fields, in the order shown. */
    popupFields: string[];
    /** Own names for pop-up fields (e.g. "Price" instead of "Pham price"). Fields not listed keep their usual name. */
    popupLabels: Record<string, string>;
  }
>;

const allFields = (key: SearchSection) => SECTION_FIELDS[key].map((f) => f.key);

export const DEFAULT_SEARCH_DISPLAY: SearchDisplay = {
  products: { main: "product", details: ["packsize", "unitPrice", "price"], tooltip: true, popupFields: allFields("products"), popupLabels: {} },
  clients: { main: "clientName", details: ["phone", "routeName"], tooltip: true, popupFields: allFields("clients"), popupLabels: {} },
  diary: { main: "clientName", details: ["date", "itemsTaken"], tooltip: true, popupFields: allFields("diary"), popupLabels: {} },
  transport: { main: "clientName", details: ["riderName", "routeName"], tooltip: true, popupFields: allFields("transport"), popupLabels: {} },
};

export const MAX_POPUP_LABEL = 30;

export function defaultSearchDisplay(): SearchDisplay {
  return JSON.parse(JSON.stringify(DEFAULT_SEARCH_DISPLAY)) as SearchDisplay;
}

/** Turns anything saved (or nothing) into a complete, valid setting. Unknown fields are dropped. */
export function resolveSearchDisplay(raw: unknown): SearchDisplay {
  const out = defaultSearchDisplay();
  if (!raw || typeof raw !== "object") return out;
  const input = raw as Record<
    string,
    { main?: unknown; details?: unknown; tooltip?: unknown; popupFields?: unknown; popupLabels?: unknown } | undefined
  >;

  for (const key of SEARCH_SECTIONS) {
    const fields = SECTION_FIELDS[key];
    const entry = input[key];
    if (!entry || typeof entry !== "object") continue;

    const mainOk = fields.some((f) => f.key === entry.main && f.kind === "text");
    const main = mainOk ? (entry.main as string) : out[key].main;

    const chosen = Array.isArray(entry.details) ? new Set(entry.details.filter((d): d is string => typeof d === "string")) : null;
    const details = chosen
      ? fields.filter((f) => f.key !== main && chosen.has(f.key)).map((f) => f.key) // keeps the section's usual order
      : out[key].details.filter((d) => d !== main);

    // Pop-up fields keep the admin's order; unknown or repeated fields are dropped. Nothing saved = every field.
    const valid = new Set(fields.map((f) => f.key));
    const popupFields = Array.isArray(entry.popupFields)
      ? [...new Set(entry.popupFields.filter((k): k is string => typeof k === "string" && valid.has(k)))]
      : out[key].popupFields;
    const popupLabels: Record<string, string> = {};
    if (entry.popupLabels && typeof entry.popupLabels === "object" && !Array.isArray(entry.popupLabels)) {
      for (const [k, v] of Object.entries(entry.popupLabels as Record<string, unknown>)) {
        const name = typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, MAX_POPUP_LABEL) : "";
        if (valid.has(k) && name) popupLabels[k] = name;
      }
    }

    out[key] = { main, details, tooltip: typeof entry.tooltip === "boolean" ? entry.tooltip : out[key].tooltip, popupFields, popupLabels };
  }
  return out;
}

export type AllowedSection = {
  key: SearchSection;
  /** Fields typing can match. */
  columns: string[];
  /** Field for the bold main line. */
  main: string;
  /** Fields shown under it. */
  details: string[];
  /** The fields the hover pop-up lists: the admin's choice and order, limited to what this person may see. */
  visible: string[];
  /** The admin's own names for pop-up fields. */
  popupLabels: Record<string, string>;
  /** Whether the hover pop-up is on for this section. */
  tooltip: boolean;
};

/**
 * The sections a viewer may search, and for each one what can be matched and what is shown.
 * `staff` is null for admins (everything). Staff only get tabs the admin has switched on, and only the
 * fields the admin shows on that tab, so a hidden barcode, price or phone number can never be found,
 * guessed or displayed through search. `display` is the admin's choice of what results show.
 */
export function allowedSections(staff: StaffConfig | null, display: SearchDisplay): AllowedSection[] {
  return SEARCH_SECTIONS.flatMap((key) => {
    const fields = SECTION_FIELDS[key];
    let visible: Set<string>;
    if (!staff) {
      visible = new Set(fields.map((f) => f.key));
    } else {
      const tab = staff.tabs[key];
      if (!tab.visible) return [];
      visible = new Set(tab.fields);
    }
    const chosen = display[key];
    const main = visible.has(chosen.main) ? chosen.main : DEFAULT_TITLE[key];
    return [
      {
        key,
        columns: fields.filter((f) => f.searchable && visible.has(f.key)).map((f) => f.key),
        main,
        details: chosen.details.filter((d) => d !== main && visible.has(d)),
        visible: chosen.popupFields.filter((k) => visible.has(k)),
        popupLabels: chosen.popupLabels,
        tooltip: chosen.tooltip,
      },
    ];
  });
}

// ── Showing a row ────────────────────────────────────────────────────────────

export type DetailContext = {
  /** The admin's wording for paid / partly paid / not paid. */
  paid: (status: string) => string;
  /** Name of the chosen invoice option, or the "not set" wording. */
  invoice: (action: string | null | undefined) => string;
  /** "10% off" / the admin's wording for no discount. */
  discount: (percent: number) => string;
  qtyLabel: string;
  transportLabel: string;
  /** Names used in the pop-up (the admin can rename "Items taken", "Invoice", ...). */
  labels: Record<string, string>;
  /** Parts of the diary the admin switched off are never shown. */
  enabled: (fieldKey: string) => boolean;
};

export const DEFAULT_DETAIL_CONTEXT: DetailContext = {
  paid: (s) => (s === "paid" ? "Paid" : s === "partial" ? "Partially paid" : "Not paid"),
  invoice: (a) => (a === "goes" ? "Goes" : a === "stays" ? "Stays" : a === "diary" ? "In the diary" : "Not set"),
  discount: (p) => `${p}% off`,
  qtyLabel: "Qty",
  transportLabel: "Transport",
  labels: {},
  enabled: () => true,
};

const PREFIX: Record<string, string> = {
  sku: "SKU ",
  no: "No ",
  packsize: "Pack ",
  barcode: "Barcode ",
  riderName: "Rider ",
  unitPrice: "Unit price ",
  price: "Price ",
  phamPrice: "Price ",
  riderPrice: "Rider price ",
};

const money = (n: number) => `KSh ${n.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

/** One field of a row as { label, value } (for the pop-up) and `short` (for the grey line). null = nothing to show. */
function fieldParts(
  def: SearchFieldDef,
  value: unknown,
  ctx: DetailContext,
  maxText: number,
): { label: string; value: string; short: string } | null {
  if ((value === null || value === undefined) && def.kind !== "invoice") return null;
  if (!ctx.enabled(def.key)) return null;
  const label = ctx.labels[def.key] ?? def.label;

  switch (def.kind) {
    case "money": {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      const v = money(n);
      const short = def.key === "transport" ? `${ctx.transportLabel} ${v}` : `${PREFIX[def.key] ?? ""}${v}`;
      return { label: def.key === "transport" ? ctx.transportLabel : label, value: v, short };
    }
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n) || n <= 0) return null;
      return { label: ctx.qtyLabel, value: String(n), short: `${ctx.qtyLabel} ${n}` };
    }
    case "paid": {
      const v = ctx.paid(String(value));
      return { label, value: v, short: v };
    }
    case "invoice": {
      const v = ctx.invoice(value === null || value === undefined ? null : String(value));
      return { label, value: v, short: `${label}: ${v}` };
    }
    case "discount": {
      const p = Number(value);
      if (!Number.isFinite(p) || p <= 0) return null;
      const v = ctx.discount(p);
      return { label, value: v, short: v };
    }
    default: {
      let text = String(value).trim();
      if (!text) return null;
      if (text.length > maxText) text = `${text.slice(0, maxText)}…`;
      return { label, value: text, short: `${PREFIX[def.key] ?? ""}${text}` };
    }
  }
}

/** The grey line under a result: the chosen details that have a value. Anything not listed is never read. */
export function buildDetails(
  section: SearchSection,
  row: Record<string, unknown>,
  detailKeys: string[],
  ctx: DetailContext = DEFAULT_DETAIL_CONTEXT,
): string[] {
  const out: string[] = [];
  for (const key of detailKeys) {
    const def = SECTION_FIELDS[section].find((f) => f.key === key);
    if (!def) continue;
    const parts = fieldParts(def, row[key], ctx, 70);
    if (parts) out.push(parts.short);
  }
  return out;
}

/** The hover pop-up: every field the viewer may see that has a value, named and written out in full. */
export function buildTooltip(
  section: SearchSection,
  row: Record<string, unknown>,
  visibleKeys: string[],
  ctx: DetailContext = DEFAULT_DETAIL_CONTEXT,
  labels: Record<string, string> = {},
): SearchMore[] {
  const out: SearchMore[] = [];
  for (const key of visibleKeys) {
    const def = SECTION_FIELDS[section].find((f) => f.key === key);
    if (!def) continue;
    const parts = fieldParts(def, row[key], ctx, 240);
    if (parts) out.push({ label: labels[key] ?? parts.label, value: parts.value });
  }
  return out;
}

/** The bold line: the chosen field, or the section's usual one if that is empty on this row. */
export function mainText(section: SearchSection, row: Record<string, unknown>, main: string): string {
  const pick = (k: string) => {
    const v = row[k];
    return v === null || v === undefined ? "" : String(v).trim();
  };
  return pick(main) || pick(DEFAULT_TITLE[section]) || "(no name)";
}
