"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { NotebookPen } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import { usePrefillSearch } from "@/hooks/usePrefillSearch";
import LastUpdated from "@/components/LastUpdated";
import EmptyState from "@/components/EmptyState";
import PaidBadge from "@/components/PaidBadge";
import TypeToSearchPrompt from "@/components/TypeToSearchPrompt";
import DiaryTags from "@/components/DiaryTags";
import { useStaffTab } from "@/lib/staffConfigContext";
import { useDiaryConfig } from "@/lib/diaryConfigContext";
import StaffTabGate from "@/components/StaffTabGate";
import { useApiCollection } from "@/hooks/useApiCollection";
import { DiaryEntry } from "@/lib/types";

const MAX_RESULTS = 100;

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtKsh(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

export default function StaffDiaryPage() {
  return (
    <StaffTabGate tab="diary">
      <StaffDiaryContent />
    </StaffTabGate>
  );
}

function StaffDiaryContent() {
  const tab = useStaffTab("diary");
  const cfg = useDiaryConfig(); // admin-wide wording and switches (Settings > Diary); the staff tab settings still apply on top
  const { items, loading, lastUpdated, reload } = useApiCollection<DiaryEntry>(
    "/api/diary",
    "entries",
  );
  const [search, setSearch] = useState("");
  usePrefillSearch(setSearch);
  const deferredSearch = useDeferredValue(search);

  const sorted = useMemo(
    () => [...items].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "")),
    [items],
  );

  // Nothing is listed until the person starts typing.
  const query = deferredSearch.trim().toLowerCase();
  const hasQuery = query.length > 0;

  const filtered = useMemo(
    () =>
      !query
        ? []
        : sorted.filter(
            (e) =>
              e.clientName.toLowerCase().includes(query) ||
              (e.itemsTaken ?? "").toLowerCase().includes(query),
          ),
    [sorted, query],
  );
  const visible = filtered.slice(0, MAX_RESULTS);

  if (loading)
    return (
      <div className="py-20 text-center text-sm text-muted">Loading diary…</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {tab.label}
          </h1>
          <p className="mt-1 text-sm text-muted">
            What each client took, when, and whether they paid — read only.
          </p>
        </div>
        <LastUpdated date={lastUpdated} onRefresh={reload} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard id="staff.diary.entries" label="Entries logged" value={String(items.length)} />
        <StatCard id="staff.diary.matches" label="Matches" value={hasQuery ? String(filtered.length) : "—"} />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={tab.show("itemsTaken") ? `Type a client or ${cfg.itemsLabel.toLowerCase()} to show entries…` : "Type a client name to show entries…"}
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="No entries yet"
          description="An admin needs to log diary entries first."
        />
      ) : !hasQuery ? (
        <TypeToSearchPrompt text="Start typing a client's name or an item above to see their diary entries." />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
          No entries match your search.
        </p>
      ) : (
        <ol className="space-y-3">
          {visible.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-hairline bg-surface px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">{entry.clientName}</p>
                {tab.show("paidStatus") && <PaidBadge status={entry.paidStatus} />}
              </div>
              {((tab.show("invoiceAction") && cfg.invoice.enabled) || (tab.show("discountPercent") && cfg.discount.enabled)) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <DiaryTags
                    invoiceAction={entry.invoiceAction}
                    discountPercent={entry.discountPercent}
                    showInvoice={tab.show("invoiceAction")}
                    showDiscount={tab.show("discountPercent")}
                  />
                </div>
              )}
              {tab.show("date") && entry.date && (
                <p className="mt-1.5 font-mono text-xs text-muted">{fmtDate(entry.date)}</p>
              )}
              {(tab.show("itemsTaken") || (tab.show("qty") && cfg.qty.enabled) || (tab.show("transport") && cfg.transport.enabled)) && (
                <p className="mt-2 text-sm text-text/80">
                  {[
                    tab.show("itemsTaken") ? entry.itemsTaken : null,
                    tab.show("qty") && cfg.qty.enabled ? `${cfg.qty.label} ${entry.qty}` : null,
                    tab.show("transport") && cfg.transport.enabled && entry.transport ? `${cfg.transport.label} ${fmtKsh(entry.transport)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {hasQuery && filtered.length > MAX_RESULTS && (
        <p className="text-center text-xs text-muted">
          Showing the first {MAX_RESULTS} of {filtered.length} matches — keep typing to narrow it down.
        </p>
      )}
    </div>
  );
}
