"use client";

import { Percent } from "lucide-react";
import DynamicIcon from "@/components/DynamicIcon";
import { InvoiceAction } from "@/lib/types";
import { discountText, invoiceLabel } from "@/lib/diaryConfig";
import { useDiaryConfig } from "@/lib/diaryConfigContext";

/**
 * Small badges for "where the invoice is" and "discount", used wherever a diary entry is listed.
 * The wording, icons and on/off switches come from Settings > Diary.
 */
export default function DiaryTags({
  invoiceAction,
  discountPercent,
  showInvoice = true,
  showDiscount = true,
}: {
  invoiceAction?: InvoiceAction | null;
  discountPercent?: number;
  showInvoice?: boolean;
  showDiscount?: boolean;
}) {
  const cfg = useDiaryConfig();
  const invoiceOn = showInvoice && cfg.invoice.enabled;
  const discountOn = showDiscount && cfg.discount.enabled;
  const icon = invoiceAction ? cfg.invoice.actions[invoiceAction].icon : null;
  const hasDiscount = (discountPercent ?? 0) > 0;

  return (
    <>
      {invoiceOn && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            invoiceAction ? "bg-ink/8 text-ink" : "bg-ink/5 text-muted"
          }`}
          title={cfg.invoice.question}
        >
          {icon && <DynamicIcon name={icon} size={13} />}
          {cfg.invoice.title}: {invoiceLabel(cfg, invoiceAction)}
        </span>
      )}
      {discountOn && (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            hasDiscount ? "bg-accent/15 text-accent" : "bg-ink/5 text-muted"
          }`}
        >
          {hasDiscount && <Percent size={13} />}
          {discountText(cfg, discountPercent)}
        </span>
      )}
    </>
  );
}
