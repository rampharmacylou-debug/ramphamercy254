"use client";

import { StatCardId } from "@/lib/appearance";
import { useAppearance } from "@/lib/appearanceContext";

type Props = {
  /** Lets the admin switch this card on or off in Settings > Appearance. */
  id: StatCardId;
  label: string;
  value: string;
  hint?: string;
};

export default function StatCard({ id, label, value, hint }: Props) {
  const { isCardVisible } = useAppearance();
  if (!isCardVisible(id)) return null;

  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-3.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-medium text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}
