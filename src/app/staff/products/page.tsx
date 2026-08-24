"use client";

import { useDeferredValue, useMemo, useState, useEffect } from "react";
import { Package, RefreshCw } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import LastUpdated from "@/components/LastUpdated";
import RefTag from "@/components/RefTag";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/lib/supabaseClient";

interface Product {
  id: number | string;
  sku?: string | null;
  no?: string | null;
  product?: string | null;
  pack_size?: string | null;
  unit_price?: number | null;
  box_price?: number | null;
  barcode?: string | null;
}

const FILTER_OPTIONS = [
  { value: "all", label: "All products" },
  { value: "missing", label: "Missing barcode" },
  { value: "has", label: "Has barcode" },
];

export default function StaffProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const deferredSearch = useDeferredValue(search);
  const deferredFilter = useDeferredValue(filter);

  // Fetch ALL rows past Supabase's 1000 limit
  const loadPrices = async () => {
    setLoading(true);
    try {
      let allRows: Product[] = [];
      let page = 0;
      const PAGE_SIZE = 1000;
      let hasMore = true;

      while (hasMore) {
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
          .from("pharmacy_prices")
          .select("*")
          .range(from, to);

        if (error) {
          console.error("Supabase Error:", error.message);
          hasMore = false;
        } else if (data) {
          allRows = [...allRows, ...data];
          if (data.length < PAGE_SIZE) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }

      setItems(allRows);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (res.ok) {
        await loadPrices();
      }
    } catch (err) {
      console.error("Sync error:", err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, []);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();

    return items.filter((p) => {
      const productName = (p.product || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const barcode = (p.barcode || "").toLowerCase();
      const itemNo = String(p.no || "").toLowerCase();

      const matchSearch =
        !q ||
        productName.includes(q) ||
        sku.includes(q) ||
        barcode.includes(q) ||
        itemNo.includes(q);

      const hasBarcode = Boolean(p.barcode && p.barcode.trim() !== "");

      if (deferredFilter === "missing") return matchSearch && !hasBarcode;
      if (deferredFilter === "has") return matchSearch && hasBarcode;
      return matchSearch;
    });
  }, [items, deferredSearch, deferredFilter]);

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted">
        Fetching complete catalog from database…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
            Products
          </h1>
          <p className="mt-1 text-sm text-muted">
            Current product list — read only.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
            />
            {syncing ? "Syncing..." : "Sync Sheet"}
          </button>
          <LastUpdated date={lastUpdated} onRefresh={loadPrices} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Products tracked" value={String(items.length)} />
        <StatCard label="Showing" value={String(filtered.length)} />
      </div>

      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by No, product, SKU, or barcode…"
        filterValue={filter}
        onFilterChange={setFilter}
        filterOptions={FILTER_OPTIONS}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Click 'Sync Sheet' above to pull products."
        />
      ) : filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
          No products match your search or filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-hairline bg-surface">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">No</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Pack Size</th>
                <th className="px-4 py-3 font-medium text-right">
                  Unit Price
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  Box Price
                </th>
                <th className="px-4 py-3 font-medium">Barcode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-hairline last:border-0 hover:bg-canvas/40"
                >
                  <td className="px-4 py-3">
                    <RefTag>{p.sku || "—"}</RefTag>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">
                    {p.no || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-ink">
                    {p.product || (
                      <span className="italic text-muted">Unnamed</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {p.pack_size || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {p.unit_price
                      ? `$${Number(p.unit_price).toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {p.box_price ? `$${Number(p.box_price).toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">
                    {p.barcode || (
                      <span className="text-danger/70">missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

