// Staff view tabs: what exists, the defaults, and how a saved config is
// cleaned up. Pure code (no database) so it can run in the browser and on
// the server.

import { IconKey, isIconKey } from "@/lib/iconKeys";

export type StaffTabKey = "products" | "diary" | "clients" | "transport";

export type StaffFieldDef = {
  key: string;
  label: string;
  /** Always shown — the tab can't work without it (e.g. the product name). */
  locked?: boolean;
  /** Database columns removed from what staff receive when this field is hidden. */
  dbKeys: string[];
  /** Shown to staff unless an admin turns it on (sensitive/internal values). */
  defaultOff?: boolean;
};

export type StaffTabDef = {
  key: StaffTabKey;
  defaultLabel: string;
  defaultIcon: IconKey;
  href: string;
  defaultVisible: boolean;
  fields: StaffFieldDef[];
};

export const STAFF_TAB_DEFS: StaffTabDef[] = [
  {
    key: "products",
    defaultLabel: "Products",
    defaultIcon: "package",
    href: "/staff/products",
    defaultVisible: true,
    fields: [
      { key: "product", label: "Product name", locked: true, dbKeys: ["product"] },
      { key: "no", label: "No", dbKeys: ["no"] },
      { key: "sku", label: "SKU", dbKeys: ["sku"] },
      { key: "packsize", label: "Pack size", dbKeys: ["packsize"] },
      { key: "unitPrice", label: "Unit price", dbKeys: ["unitPrice"] },
      { key: "price", label: "Price", dbKeys: ["price"] },
      { key: "barcode", label: "Barcode", dbKeys: ["barcode"] },
    ],
  },
  {
    key: "diary",
    defaultLabel: "Diary",
    defaultIcon: "notebook-pen",
    href: "/staff/diary",
    defaultVisible: true,
    fields: [
      { key: "clientName", label: "Client name", locked: true, dbKeys: ["clientName", "clientId"] },
      { key: "date", label: "Date", dbKeys: ["date"] },
      { key: "itemsTaken", label: "Items taken", dbKeys: ["itemsTaken"] },
      { key: "qty", label: "Quantity", dbKeys: ["qty"] },
      { key: "transport", label: "Transport charge", dbKeys: ["transport"] },
      { key: "paidStatus", label: "Paid status", dbKeys: ["paidStatus"] },
      { key: "invoiceAction", label: "Invoice (goes / stays / diary)", dbKeys: ["invoiceAction"] },
      { key: "discountPercent", label: "Discount", dbKeys: ["discountPercent"] },
    ],
  },
  {
    key: "clients",
    defaultLabel: "Clients",
    defaultIcon: "users",
    href: "/staff/clients",
    defaultVisible: true,
    fields: [
      { key: "clientName", label: "Client name", locked: true, dbKeys: ["clientName"] },
      { key: "phone", label: "Phone", dbKeys: ["phone"] },
      { key: "routeName", label: "Route", dbKeys: ["routeName"] },
      { key: "phamPrice", label: "Price", dbKeys: ["phamPrice"] },
      { key: "riderPrice", label: "Rider price", dbKeys: ["riderPrice"], defaultOff: true },
    ],
  },
  {
    key: "transport",
    defaultLabel: "Transport route",
    defaultIcon: "truck",
    href: "/staff/transport",
    defaultVisible: false, // was commented out in the old menu
    fields: [
      { key: "clientName", label: "Client", locked: true, dbKeys: ["clientName", "clientId"] },
      { key: "riderName", label: "Rider", dbKeys: ["riderName"] },
      { key: "routeName", label: "Route", dbKeys: ["routeName"] },
      { key: "phamPrice", label: "Price", dbKeys: ["phamPrice"] },
      { key: "riderPrice", label: "Rider price", dbKeys: ["riderPrice"], defaultOff: true },
    ],
  },
];

export type StaffTabConfigEntry = {
  label: string;
  /** One of the icons in lib/iconKeys.ts */
  icon: IconKey;
  visible: boolean;
  /** keys of the fields staff can see */
  fields: string[];
};

export type StaffConfig = {
  /** tab keys in the order they appear */
  order: StaffTabKey[];
  tabs: Record<StaffTabKey, StaffTabConfigEntry>;
};

export const MAX_LABEL_LENGTH = 30;

export function defaultStaffConfig(): StaffConfig {
  const tabs = {} as Record<StaffTabKey, StaffTabConfigEntry>;
  for (const d of STAFF_TAB_DEFS) {
    tabs[d.key] = {
      label: d.defaultLabel,
      icon: d.defaultIcon,
      visible: d.defaultVisible,
      fields: d.fields.filter((f) => !f.defaultOff).map((f) => f.key),
    };
  }
  return { order: STAFF_TAB_DEFS.map((d) => d.key), tabs };
}

/**
 * Turns whatever is stored (or sent by the browser) into a valid config:
 * unknown keys dropped, labels trimmed/limited (blank → default), locked
 * fields always on, every tab present exactly once in `order`.
 */
export function resolveStaffConfig(raw: unknown): StaffConfig {
  const base = defaultStaffConfig();
  if (!raw || typeof raw !== "object") return base;
  const input = raw as { order?: unknown; tabs?: Record<string, Partial<StaffTabConfigEntry>> };

  for (const def of STAFF_TAB_DEFS) {
    const t = input.tabs?.[def.key];
    if (!t || typeof t !== "object") continue;
    const label = typeof t.label === "string" ? t.label.trim().slice(0, MAX_LABEL_LENGTH) : "";
    const known = new Set(def.fields.map((f) => f.key));
    const chosen = Array.isArray(t.fields)
      ? t.fields.filter((k): k is string => typeof k === "string" && known.has(k))
      : base.tabs[def.key].fields;
    const withLocked = new Set([...chosen, ...def.fields.filter((f) => f.locked).map((f) => f.key)]);
    base.tabs[def.key] = {
      label: label || def.defaultLabel,
      icon: isIconKey(t.icon) ? t.icon : def.defaultIcon,
      visible: typeof t.visible === "boolean" ? t.visible : def.defaultVisible,
      fields: def.fields.filter((f) => withLocked.has(f.key)).map((f) => f.key),
    };
  }

  if (Array.isArray(input.order)) {
    const keys = STAFF_TAB_DEFS.map((d) => d.key) as string[];
    const seen = input.order.filter((k): k is StaffTabKey => typeof k === "string" && keys.includes(k));
    base.order = [...new Set([...seen, ...(keys as StaffTabKey[])])];
  }
  return base;
}

export function visibleTabs(config: StaffConfig) {
  return config.order
    .filter((k) => config.tabs[k].visible)
    .map((k) => {
      const def = STAFF_TAB_DEFS.find((d) => d.key === k)!;
      return { key: k, label: config.tabs[k].label, icon: config.tabs[k].icon, href: def.href };
    });
}

/**
 * Removes the columns an admin has hidden for staff. Used on the server so
 * hidden values are never sent to the browser at all.
 */
export function stripHiddenFields<T extends Record<string, unknown>>(
  tab: StaffTabKey,
  rows: T[],
  config: StaffConfig,
): Partial<T>[] {
  const def = STAFF_TAB_DEFS.find((d) => d.key === tab)!;
  const shown = new Set(config.tabs[tab].fields);
  const drop = new Set(def.fields.filter((f) => !shown.has(f.key)).flatMap((f) => f.dbKeys));
  if (drop.size === 0) return rows;
  return rows.map((row) => {
    const copy: Record<string, unknown> = { ...row };
    for (const k of drop) delete copy[k];
    return copy as Partial<T>;
  });
}
