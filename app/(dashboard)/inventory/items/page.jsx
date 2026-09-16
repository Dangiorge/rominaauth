// path: app/(dashboard)/inventory/items/page.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Archive, Package, Search } from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";
import { ITEM_TYPE_LABELS } from "@/lib/itemClassification";

export default function ItemsPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [items, setItems] = useState([]);
  const [itemType, setItemType] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => {
        setCompanies(d.companies || []);
        if (d.companies?.length) setCompanyId(String(d.companies[0].id));
      });
  }, []);

  function loadItems() {
    if (!companyId) return;
    const params = new URLSearchParams({ companyId });
    if (itemType) params.set("itemType", itemType);
    if (search) params.set("search", search);
    fetch(`/api/inventory/items?${params}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []));
  }
  useEffect(() => {
    loadItems();
  }, [companyId, itemType, search]);

  function flash(msg, type = "success") {
    if (type === "success") {
      setSuccess(msg);
      setError("");
    } else {
      setError(msg);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);
  }

  async function handleArchive(item) {
    if (!confirm(`Archive "${item.name}"? This can be reversed later.`)) return;
    const res = await fetch(`/api/inventory/items/${item.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Item archived.");
    loadItems();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Item Catalog</h1>
        <Link
          href="/inventory/items/create"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> New Item
        </Link>
      </div>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <div className="flex gap-3 mb-4">
        <select
          value={companyId}
          onChange={(e) => setCompanyId(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={itemType}
          onChange={(e) => setItemType(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {Object.entries(ITEM_TYPE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>
              {label}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            placeholder="Search name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded-md pl-9 pr-3 py-2 text-sm w-full"
          />
        </div>
      </div>

      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Item</th>
            <th>SKU</th>
            <th>Type</th>
            <th>Category</th>
            <th>Sellable</th>
            <th>Cost</th>
            <th className="text-right px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-0">
              <td className="py-2 px-4">
                <div className="flex items-center gap-2">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt=""
                      className="w-8 h-8 object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
                      <Package size={14} className="text-slate-400" />
                    </div>
                  )}
                  {item.name}
                </div>
              </td>
              <td className="font-mono text-xs">{item.sku}</td>
              <td className="text-xs">{ITEM_TYPE_LABELS[item.item_type]}</td>
              <td className="text-xs text-slate-500">
                {item.item_categories?.name || "—"}
              </td>
              <td>
                {item.is_sellable ? (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                    Yes
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">No</span>
                )}
              </td>
              <td className="text-xs">
                {Number(item.default_cost).toFixed(2)}
              </td>
              <td className="px-4">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/inventory/items/${item.id}`}
                    className="p-1.5 hover:bg-slate-100 rounded-md"
                  >
                    <Pencil size={15} />
                  </Link>
                  <button
                    onClick={() => handleArchive(item)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                  >
                    <Archive size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
