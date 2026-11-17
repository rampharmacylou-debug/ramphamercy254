"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Package } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import { usePrefillSearch } from "@/hooks/usePrefillSearch";
import LastUpdated from "@/components/LastUpdated";
import RefTag from "@/components/RefTag";
import EmptyState from "@/components/EmptyState";
import { useApiCollection } from "@/hooks/useApiCollection";
import { Product } from "@/lib/types";
import { useStaffTab } from "@/lib/staffConfigContext";
import StaffTabGate from "@/components/StaffTabGate";

const FILTER_OPTIONS = [
  { value: "all",     label: "All products" },
  { value: "missing", label: "Missing barcode" },
  { value: "has",     label: "Has barcode" },
];

export default function StaffProductsPage() {
  return (
    <StaffTabGate tab="products">
      <StaffProductsContent />
    </StaffTabGate>
  );
}

function StaffProductsContent() {
  const tab = useStaffTab("products");
  const { items, loading, lastUpdated, reload } = useApiCollection<Product>("/api/products", "products");
  const [search, setSearch] = useState("");
  usePrefillSearch(setSearch);
  const [filter, setFilter] = useState("all");

  const deferredSearch = useDeferredValue(search);
  const deferredFilter = useDeferredValue(filter);

  const ROW_LIMIT = 100;

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return items.filter((p) => {
      const matchSearch = !q || (p.sku ?? "").toLowerCase().includes(q) || (p.product ?? "").toLowerCase().includes(q) || (p.barcode ?? "").toLowerCase().includes(q) || (p.no ?? "").toLowerCase().includes(q);
      const has = Boolean(p.barcode?.trim());
      return matchSearch && (deferredFilter === "all" || (deferredFilter === "missing" && !has) || (deferredFilter === "has" && has));
    });
  }, [items, search, filter]);

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading products…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">{tab.label}</h1>
          <p className="mt-1 text-sm text-muted">Current product list — read only.</p>
        </div>
        <LastUpdated date={lastUpdated} onRefresh={reload} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard id="staff.products.tracked" label="Products tracked" value={String(items.length)} />
        <StatCard id="staff.products.showing" label="Showing" value={String(filtered.length)} />
      </div>

      <SearchFilterBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search…" filterValue={tab.show("barcode") ? filter : undefined} onFilterChange={tab.show("barcode") ? setFilter : undefined} filterOptions={tab.show("barcode") ? FILTER_OPTIONS : undefined} />

      {items.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" description="An admin needs to add products first." />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">No products match your search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="stack-table w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                {tab.show("sku") && <th className="px-4 py-3 font-medium">SKU</th>}
                {tab.show("no") && <th className="px-4 py-3 font-medium">No</th>}
                <th className="px-4 py-3 font-medium">Product</th>
                {tab.show("packsize") && <th className="px-4 py-3 font-medium">Pack Size</th>}
                {tab.show("unitPrice") && <th className="px-4 py-3 font-medium text-right">Unit Price</th>}
                {tab.show("price") && <th className="px-4 py-3 font-medium text-right">Price</th>}
                {tab.show("barcode") && <th className="px-4 py-3 font-medium">Barcode</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, ROW_LIMIT).map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-canvas/40">
                  {tab.show("sku") && <td data-label="SKU" className="px-4 py-3"><RefTag>{p.sku || "—"}</RefTag></td>}
                  {tab.show("no") && <td data-label="No" className="px-4 py-3 font-mono text-xs text-muted">{p.no || "—"}</td>}
                  <td data-label="Product" className="px-4 py-3 font-medium text-ink">{p.product || <span className="italic text-muted">Unnamed</span>}</td>
                  {tab.show("packsize") && <td data-label="Pack Size" className="px-4 py-3 text-muted">{p.packsize || "—"}</td>}
                  {tab.show("unitPrice") && <td data-label="Unit Price" className="px-4 py-3 text-right font-mono text-ink">{p.unitPrice || "—"}</td>}
                  {tab.show("price") && <td data-label="Price" className="px-4 py-3 text-right font-mono text-ink">{p.price || "—"}</td>}
                  {tab.show("barcode") && <td data-label="Barcode" className="px-4 py-3 font-mono text-xs text-ink">{p.barcode || <span className="text-danger/70">missing</span>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
