"use client";

import { useEffect, useState } from "react";
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

export default function StaffProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const loadPrices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("pharmacy_prices")
        .select("*")
        .limit(1000);

      if (error) {
        console.error("Supabase Error:", error.message);
      } else if (data) {
        setItems(data);
      }
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrices();
  }, []);

  const filtered = items.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      (p.product || "").toLowerCase().includes(q) ||
      (p.sku || "").toLowerCase().includes(q) ||
      (p.barcode || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-gray-500">Read-only product catalog</p>
        </div>
        <button
          onClick={loadPrices}
          className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search product, SKU, or barcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border rounded-md text-sm"
        />
      </div>

      <div className="text-sm font-medium">
        Total Products: {items.length} | Showing: {filtered.length}
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading database records...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">No</th>
                <th className="p-3">Product</th>
                <th className="p-3">Pack Size</th>
                <th className="p-3 text-right">Unit Price</th>
                <th className="p-3 text-right">Box Price</th>
                <th className="p-3">Barcode</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono">{p.sku || "—"}</td>
                  <td className="p-3">{p.no || "—"}</td>
                  <td className="p-3 font-medium">{p.product || "Unnamed"}</td>
                  <td className="p-3">{p.pack_size || "—"}</td>
                  <td className="p-3 text-right font-mono">
                    {p.unit_price ? `$${Number(p.unit_price).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {p.box_price ? `$${Number(p.box_price).toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 font-mono">{p.barcode || "missing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

