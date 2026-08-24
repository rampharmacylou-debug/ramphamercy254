"use client";

import { useDeferredValue, useMemo, useState, useEffect } from "react";
import { Package } from "lucide-react";
import StatCard from "@/components/StatCard";
import SearchFilterBar from "@/components/SearchFilterBar";
import LastUpdated from "@/components/LastUpdated";
import RefTag from "@/components/RefTag";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/lib/supabaseClient";

interface Product {
  id: number | string;
  sku?: string;
  no?: string;
  product?: string;
  pack_size?: string;
  unit_price?: number;
  box_price?: number;
  barcode?: string;
}

const FILTER_OPTIONS = [
  { value: "all", label: "All products" },
  { value: "missing", label: "Missing barcode" },
  { value: "has", label: "Has barcode" },
];

export default function StaffProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const deferredSearch = useDeferredValue(search);
  const deferredFilter = useDeferredValue(filter);

  const ROW_LIMIT = 100;

  // Fetch directly from your Supabase pharmacy_prices table
  const loadPrices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pharmacy_prices")
      .select("*")
      .order("product", { ascending: true });

    if (error) {
      console.error("Error fetching pharmacy prices:", error);
    } else {
      setItems(data || []);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPrices();
  }, []);

  const filtered = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    return items.filter((p) => {
      const matchSearch = !q || 
        (p.sku ?? "").toLowerCase().includes(q) || 
        (p.product ?? "").toLowerCase().includes(q) || 
        (p.barcode ?? "").toLowerCase().includes(q) || 
        (p.no ?? "").toLowerCase().includes(q);
      const has = Boolean(p.barcode?.trim());
      return matchSearch && (deferredFilter === "all" || (deferredFilter === "missing" && !has) || (deferredFilter === "has" && has));
    });
  }, [items, deferredSearch, deferredFilter]);

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading products from database…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-hairline pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Products</h1>
          <p className="mt-1 text-sm text-muted">Current product list — read only.</p>
        </div>
        <LastUpdated date={lastUpdated} onRefresh={loadPrices} />
                <th className="px-4 py-3 font-medium text-right">Box Price</th>
                <th className="px-4 py-3 font-medium">Barcode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, ROW_LIMIT).map((p) => (
                <tr key={p.id} className="border-b border-hairline last:border-0 hover:bg-canvas/40">
                  <td className="px-4 py-3"><RefTag>{p.sku || "—"}</RefTag></td>
                  <td className="px-4 py-3 font-mono text-xs text-muted">{p.no || "—"}</td>
                  <td className="px-4 py-3 font-medium text-ink">{p.product || <span className="italic text-muted">Unnamed</span>}</td>
                  <td className="px-4 py-3 text-muted">{p.pack_size || "—"}</td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {p.unit_price ? `$${p.unit_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-ink">
                    {p.box_price ? `$${p.box_price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink">{p.barcode || <span className="text-danger/70">missing</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
