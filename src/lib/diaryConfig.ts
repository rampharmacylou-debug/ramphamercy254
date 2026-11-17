// Diary settings the admin can change: the wording of messages (mostly the invoice section) and which parts
// of the diary are switched on. Pure code (no database), so it runs in the browser and on the server.
// A saved config is always cleaned up by resolveDiaryConfig, so bad or missing values fall back to the defaults.

import { IconKey, isIconKey } from "@/lib/iconKeys";

export type InvoiceKey = "goes" | "stays" | "diary";
export type PaidKey = "paid" | "partial" | "unpaid";

export const INVOICE_KEYS: InvoiceKey[] = ["goes", "stays", "diary"];
export const PAID_KEYS: PaidKey[] = ["paid", "partial", "unpaid"];

export type InvoiceActionConfig = { enabled: boolean; label: string; hint: string; icon: IconKey };

export type DiaryConfig = {
  /** Text under the "Diary" title in the admin. */
  pageDescription: string;
  /** Name of the main "what was taken" field. */
  itemsLabel: string;
  qty: { enabled: boolean; label: string };
  transport: { enabled: boolean; label: string };
  paid: { enabled: boolean; title: string; labels: Record<PaidKey, string> };
  invoice: {
    enabled: boolean;
    /** New entries must choose one. */
    required: boolean;
    title: string;
    question: string;
    /** Shown when someone tries to save without choosing. */
    missingMessage: string;
    /** Badge text when no choice was made (older entries). */
    notSetLabel: string;
    /** Shown when editing an older entry that has no choice. */
    oldEntryMessage: string;
    actions: Record<InvoiceKey, InvoiceActionConfig>;
  };
  discount: {
    enabled: boolean;
    title: string;
    noLabel: string;
    yesLabel: string;
    /** The quick-pick percentages (e.g. 5, 10, 15, 20). */
    quick: number[];
  };
};

export const MAX_SHORT = 40; // labels
export const MAX_LONG = 160; // sentences

export const DEFAULT_DIARY_CONFIG: DiaryConfig = {
  pageDescription: "What each client took, when, whether they paid, where the invoice goes, and any discount.",
  itemsLabel: "Items taken",
  qty: { enabled: true, label: "Qty" },
  transport: { enabled: true, label: "Transport" },
  paid: { enabled: true, title: "Paid progress", labels: { paid: "Paid", partial: "Partially paid", unpaid: "Not paid" } },
  invoice: {
    enabled: true,
    required: true,
    title: "Invoice",
    question: "What should happen to this client's invoice?",
    missingMessage: "Choose what happens to the invoice: goes, stays, or recorded in the diary.",
    notSetLabel: "Not set",
    oldEntryMessage: "This older entry has no invoice choice yet — pick one if you want to set it.",
    actions: {
      goes: { enabled: true, label: "Goes", hint: "Invoice goes with the client", icon: "truck" },
      stays: { enabled: true, label: "Stays", hint: "Invoice stays here", icon: "house" },
      diary: { enabled: true, label: "In the diary", hint: "Recorded in the physical diary book", icon: "book-open" },
    },
  },
  discount: { enabled: true, title: "Discount", noLabel: "No discount", yesLabel: "Give a discount", quick: [5, 10, 15, 20] },
};

export function defaultDiaryConfig(): DiaryConfig {
  return JSON.parse(JSON.stringify(DEFAULT_DIARY_CONFIG)) as DiaryConfig;
}

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const text = (v: unknown, d: string, max: number) => {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "";
  return s || d;
};

function resolveQuick(v: unknown, d: number[]): number[] {
  if (!Array.isArray(v)) return d;
  const nums = v
    .map((n) => Math.round(Number(n) * 100) / 100)
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 100);
  return [...new Set(nums)].sort((a, b) => a - b).slice(0, 6);
}

/** Turns anything saved (or nothing) into a complete, safe config. */
export function resolveDiaryConfig(raw: unknown): DiaryConfig {
  const d = DEFAULT_DIARY_CONFIG;
  const r = asObj(raw);
  const qty = asObj(r.qty);
  const transport = asObj(r.transport);
  const paid = asObj(r.paid);
  const paidLabels = asObj(paid.labels);
  const inv = asObj(r.invoice);
  const actions = asObj(inv.actions);
  const disc = asObj(r.discount);

  const resolvedActions = Object.fromEntries(
    INVOICE_KEYS.map((k) => {
      const a = asObj(actions[k]);
      const def = d.invoice.actions[k];
      return [
        k,
        {
          enabled: bool(a.enabled, def.enabled),
          label: text(a.label, def.label, MAX_SHORT),
          hint: text(a.hint, def.hint, MAX_LONG),
          icon: isIconKey(a.icon) ? a.icon : def.icon,
        },
      ];
    }),
  ) as Record<InvoiceKey, InvoiceActionConfig>;

  // If everything was switched off, the invoice section would have nothing to offer: turn them all back on.
  if (INVOICE_KEYS.every((k) => !resolvedActions[k].enabled)) {
    INVOICE_KEYS.forEach((k) => (resolvedActions[k].enabled = true));
  }

  return {
    pageDescription: text(r.pageDescription, d.pageDescription, 200),
    itemsLabel: text(r.itemsLabel, d.itemsLabel, MAX_SHORT),
    qty: { enabled: bool(qty.enabled, d.qty.enabled), label: text(qty.label, d.qty.label, MAX_SHORT) },
    transport: { enabled: bool(transport.enabled, d.transport.enabled), label: text(transport.label, d.transport.label, MAX_SHORT) },
    paid: {
      enabled: bool(paid.enabled, d.paid.enabled),
      title: text(paid.title, d.paid.title, MAX_SHORT),
      labels: Object.fromEntries(PAID_KEYS.map((k) => [k, text(paidLabels[k], d.paid.labels[k], MAX_SHORT)])) as Record<PaidKey, string>,
    },
    invoice: {
      enabled: bool(inv.enabled, d.invoice.enabled),
      required: bool(inv.required, d.invoice.required),
      title: text(inv.title, d.invoice.title, MAX_SHORT),
      question: text(inv.question, d.invoice.question, MAX_LONG),
      missingMessage: text(inv.missingMessage, d.invoice.missingMessage, MAX_LONG),
      notSetLabel: text(inv.notSetLabel, d.invoice.notSetLabel, MAX_SHORT),
      oldEntryMessage: text(inv.oldEntryMessage, d.invoice.oldEntryMessage, MAX_LONG),
      actions: resolvedActions,
    },
    discount: {
      enabled: bool(disc.enabled, d.discount.enabled),
      title: text(disc.title, d.discount.title, MAX_SHORT),
      noLabel: text(disc.noLabel, d.discount.noLabel, MAX_SHORT),
      yesLabel: text(disc.yesLabel, d.discount.yesLabel, MAX_SHORT),
      quick: resolveQuick(disc.quick, d.discount.quick),
    },
  };
}

// ── helpers used by the screens ──────────────────────────────────────────────

export function invoiceLabel(cfg: DiaryConfig, v: InvoiceKey | null | undefined) {
  return v ? cfg.invoice.actions[v].label : cfg.invoice.notSetLabel;
}

export function paidLabel(cfg: DiaryConfig, v: PaidKey | string | null | undefined) {
  return PAID_KEYS.includes(v as PaidKey) ? cfg.paid.labels[v as PaidKey] : cfg.paid.labels.unpaid;
}

/** "No discount" (admin's wording) or "10% off". */
export function discountText(cfg: DiaryConfig, percent: number | null | undefined) {
  const p = Number(percent) || 0;
  return p > 0 ? `${Number.isInteger(p) ? p : p.toFixed(2).replace(/0+$/, "")}% off` : cfg.discount.noLabel;
}
