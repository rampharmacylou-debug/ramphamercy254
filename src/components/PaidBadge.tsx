"use client";

import { CheckCircle2, CircleDashed, CircleAlert } from "lucide-react";
import { PaidStatus } from "@/lib/types";
import { paidLabel } from "@/lib/diaryConfig";
import { useDiaryConfig } from "@/lib/diaryConfigContext";

const STYLE: Record<PaidStatus, { className: string; icon: typeof CheckCircle2 }> = {
  paid: { className: "bg-success/15 text-success", icon: CheckCircle2 },
  partial: { className: "bg-accent/15 text-accent", icon: CircleDashed },
  unpaid: { className: "bg-danger/15 text-danger", icon: CircleAlert },
};

/** Paid / partly paid / not paid badge. Wording from Settings > Diary; hidden if the admin switched payment status off. */
export default function PaidBadge({ status }: { status: PaidStatus }) {
  const cfg = useDiaryConfig();
  if (!cfg.paid.enabled) return null;
  const { className, icon: Icon } = STYLE[status] ?? STYLE.unpaid;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon size={13} />
      {paidLabel(cfg, status)}
    </span>
  );
}
