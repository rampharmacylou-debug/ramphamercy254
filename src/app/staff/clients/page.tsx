"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Users, Phone } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import { usePrefillSearch } from "@/hooks/usePrefillSearch";
import LastUpdated from "@/components/LastUpdated";
import EmptyState from "@/components/EmptyState";
import TypeToSearchPrompt from "@/components/TypeToSearchPrompt";
import { useApiCollection } from "@/hooks/useApiCollection";
import { SavedClient } from "@/lib/types";
import { useStaffTab } from "@/lib/staffConfigContext";
import StaffTabGate from "@/components/StaffTabGate";

const MAX_RESULTS = 100;

function fmtKsh(n: number) {
  return `KSh ${n.toLocaleString("en-KE")}`;
}

export default function StaffClientsPage() {
  return (
    <StaffTabGate tab="clients">
      <StaffClientsContent />
    </StaffTabGate>
  );
}

function StaffClientsContent() {
  const tab = useStaffTab("clients");
  const { items, loading, lastUpdated, reload } = useApiCollection<SavedClient>(
    "/api/clients",
    "clients",
  );
  const [search, setSearch] = useState("");
  usePrefillSearch(setSearch);
  const deferredSearch = useDeferredValue(search);

  const sorted = useMemo(
    () => [...items].sort((a, b) => a.clientName.localeCompare(b.clientName)),
    [items],
  );

  // Nothing is listed until the person starts typing.
  const query = deferredSearch.trim().toLowerCase();
  const hasQuery = query.length > 0;

  const filtered = useMemo(() => {
    const q = query;
    return !q
      ? []
      : sorted.filter(
          (c) =>
            c.clientName.toLowerCase().includes(q) ||
            (c.phone ?? "").toLowerCase().includes(q) ||
            (c.routeName ?? "").toLowerCase().includes(q),
        );
  }, [sorted, query]);

  const visible = filtered.slice(0, MAX_RESULTS);

  if (loading)
    return (
      <div className="py-20 text-center text-sm text-muted">
        Loading clients…
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            {tab.label}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Client contacts and pricing — read only.
          </p>
        </div>
        <LastUpdated date={lastUpdated} onRefresh={reload} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard id="staff.clients.saved" label="Clients saved" value={String(items.length)} />
        <StatCard id="staff.clients.matches" label="Matches" value={hasQuery ? String(filtered.length) : "—"} />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Type a name to show details…"
      />

      {sorted.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="An admin needs to add clients first."
        />
      ) : !hasQuery ? (
        <TypeToSearchPrompt text="Start typing a client's name, phone number, or route above to see their details." />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
          No clients match your search.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="stack-table w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Client</th>
                {tab.show("phone") && <th className="px-4 py-3 font-medium">Phone</th>}
                {tab.show("routeName") && <th className="px-4 py-3 font-medium">Route</th>}
                {tab.show("phamPrice") && <th className="px-4 py-3 font-medium text-right">Price</th>}
                {tab.show("riderPrice") && <th className="px-4 py-3 font-medium text-right">Rider price</th>}
              </tr>
            </thead>
            <tbody>
              {visible.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-hairline last:border-0 hover:bg-canvas/40"
                >
                  <td data-label="Client" className="px-4 py-3 font-medium text-ink">
                    {c.clientName}
                  </td>
                  {tab.show("phone") && <td data-label="Phone" className="px-4 py-3">
                    {c.phone ? (
                      <a
                        href={`tel:${c.phone}`}
                        className="flex items-center gap-1 text-accent hover:underline"
                      >
                        <Phone size={13} />
                        {c.phone}
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>}
                  {tab.show("routeName") && <td data-label="Route" className="px-4 py-3 text-muted">{c.routeName || "—"}</td>}
                  {tab.show("phamPrice") && <td data-label="Price" className="px-4 py-3 text-right font-mono text-ink">
                    {fmtKsh(c.phamPrice ?? 0)}
                  </td>}
                  {tab.show("riderPrice") && <td data-label="Rider price" className="px-4 py-3 text-right font-mono text-ink">
                    {fmtKsh(c.riderPrice ?? 0)}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasQuery && filtered.length > MAX_RESULTS && (
        <p className="text-center text-xs text-muted">
          Showing the first {MAX_RESULTS} of {filtered.length} matches — keep typing to narrow it down.
        </p>
      )}
    </div>
  );
}
