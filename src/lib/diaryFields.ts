import { InvoiceAction } from "@/lib/types";

export const INVOICE_ACTIONS: {
  value: InvoiceAction;
  label: string;
  hint: string;
}[] = [
  { value: "goes", label: "Goes", hint: "Invoice goes with the client" },
  { value: "stays", label: "Stays", hint: "Invoice stays here" },
  { value: "diary", label: "In the diary", hint: "Recorded in the physical diary book" },
];

export function isInvoiceAction(v: unknown): v is InvoiceAction {
  return v === "goes" || v === "stays" || v === "diary";
}

export function invoiceActionLabel(v: InvoiceAction | null | undefined) {
  return INVOICE_ACTIONS.find((a) => a.value === v)?.label ?? "Not set";
}

/** Short text for a discount: "No discount" or "10% off". */
export function discountLabel(percent: number | null | undefined) {
  const p = Number(percent) || 0;
  return p > 0 ? `${Number.isInteger(p) ? p : p.toFixed(2).replace(/0+$/, "")}% off` : "No discount";
}

/**
 * Reads the discount from a request body. Returns { ok: true, value } with 0
 * meaning "no discount", or { ok: false } if the number is not between 0 and 100.
 */
export function parseDiscount(raw: unknown): { ok: true; value: number } | { ok: false } {
  if (raw === undefined || raw === null || raw === "") return { ok: true, value: 0 };
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return { ok: false };
  return { ok: true, value: Math.round(n * 100) / 100 };
}
