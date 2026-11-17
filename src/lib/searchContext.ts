import { DiaryConfig, discountText, invoiceLabel, paidLabel } from "@/lib/diaryConfig";
import { DetailContext } from "@/lib/searchRules";

/** Search wording that follows Settings > Diary: the admin's names, and parts they switched off are left out. */
export function detailContextFromDiary(diary: DiaryConfig): DetailContext {
  const switchedOn: Record<string, boolean> = {
    qty: diary.qty.enabled,
    transport: diary.transport.enabled,
    paidStatus: diary.paid.enabled,
    invoiceAction: diary.invoice.enabled,
    discountPercent: diary.discount.enabled,
  };
  return {
    paid: (s) => paidLabel(diary, s),
    invoice: (a) => invoiceLabel(diary, a === "goes" || a === "stays" || a === "diary" ? a : null),
    discount: (p) => discountText(diary, p),
    qtyLabel: diary.qty.label,
    transportLabel: diary.transport.label,
    labels: {
      itemsTaken: diary.itemsLabel,
      paidStatus: diary.paid.title,
      invoiceAction: diary.invoice.title,
      discountPercent: diary.discount.title,
    },
    enabled: (key) => switchedOn[key] ?? true,
  };
}
