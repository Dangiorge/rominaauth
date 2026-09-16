// path: components/items/ItemForm.jsx

"use client";

import { useEffect, useState } from "react";
import {
  ITEM_TYPE_DEFAULTS,
  ITEM_TYPE_LABELS,
  getDefaultFlags,
} from "@/lib/itemClassification";

export default function ItemForm({
  initialItem,
  companies,
  onSubmit,
  submitLabel,
}) {
  const [form, setForm] = useState(
    () =>
      initialItem || {
        company_id: companies[0]?.id || "",
        sku: "",
        barcode: "",
        name: "",
        description: "",
        item_type: "ingredient",
        is_sellable: false,
        is_inventory: true,
        is_recipe_linked: false,
        category_id: "",
        base_uom_id: "",
        purchase_uom_id: "",
        sales_uom_id: "",
        tax_class_id: "",
        default_cost: 0,
        is_batch_tracked: false,
        track_expiry: false,
        shelf_life_days: "",
      },
  );
  const [categories, setCategories] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [taxes, setTaxes] = useState([]);

  useEffect(() => {
    if (!form.company_id) return;
    fetch(`/api/settings/categories?companyId=${form.company_id}`)
      .then((r) => r.json())
      .then((d) =>
        setCategories(
          d.categories?.filter((c) => c.level === "subcategory") || [],
        ),
      );
    fetch(`/api/settings/taxes?companyId=${form.company_id}`)
      .then((r) => r.json())
      .then((d) => setTaxes(d.taxes || []));
  }, [form.company_id]);

  useEffect(() => {
    fetch("/api/settings/uoms")
      .then((r) => r.json())
      .then((d) => setUoms(d.uoms || []));
  }, []);

  function handleTypeChange(newType) {
    const defaults = getDefaultFlags(newType);
    setForm((f) => ({
      ...f,
      item_type: newType,
      is_sellable: defaults.is_sellable,
      is_inventory: defaults.is_inventory,
      is_recipe_linked: defaults.is_recipe_linked,
    }));
  }

  const sellableLocked =
    !ITEM_TYPE_DEFAULTS[form.item_type]?.sellableOverridable &&
    form.item_type !== "service" &&
    form.item_type !== "finished_product";
  const inventoryLocked = ["service", "asset", "expense"].includes(
    form.item_type,
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
      className="space-y-6"
    >
      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Identity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Company</label>
            <select
              value={form.company_id}
              onChange={(e) =>
                setForm({ ...form, company_id: Number(e.target.value) })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Item Type
            </label>
            <select
              value={form.item_type}
              onChange={(e) => handleTypeChange(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              {Object.entries(ITEM_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">SKU</label>
            <input
              value={form.sku}
              onChange={(e) =>
                setForm({ ...form, sku: e.target.value.toUpperCase() })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Barcode (optional)
            </label>
            <input
              value={form.barcode || ""}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Category
            </label>
            <select
              value={form.category_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  category_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Description
          </label>
          <textarea
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            rows={2}
          />
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Operational Flags</h2>
        <p className="text-xs text-slate-400">
          Set automatically based on item type.{" "}
          {form.item_type === "semi_processed" &&
            "Semi-processed items may optionally be marked sellable."}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <label
            className={`flex items-center gap-2 text-sm ${sellableLocked ? "opacity-50" : ""}`}
          >
            <input
              type="checkbox"
              checked={form.is_sellable}
              disabled={sellableLocked}
              onChange={(e) =>
                setForm({ ...form, is_sellable: e.target.checked })
              }
            />
            Sellable
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${inventoryLocked ? "opacity-50" : ""}`}
          >
            <input
              type="checkbox"
              checked={form.is_inventory}
              disabled={inventoryLocked}
              onChange={(e) =>
                setForm({ ...form, is_inventory: e.target.checked })
              }
            />
            Tracked as Inventory
          </label>
          <label className="flex items-center gap-2 text-sm opacity-50">
            <input type="checkbox" checked={form.is_recipe_linked} disabled />
            Recipe-Linked
          </label>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Units & Tax</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Base Unit
            </label>
            <select
              value={form.base_uom_id || ""}
              onChange={(e) =>
                setForm({ ...form, base_uom_id: Number(e.target.value) })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select unit</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Tax Class
            </label>
            <select
              value={form.tax_class_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  tax_class_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">—</option>
              {taxes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Purchase Unit (optional)
            </label>
            <select
              value={form.purchase_uom_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  purchase_uom_id: e.target.value
                    ? Number(e.target.value)
                    : null,
                })
              }
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">—</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Sales Unit (optional)
            </label>
            <select
              value={form.sales_uom_id || ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  sales_uom_id: e.target.value ? Number(e.target.value) : null,
                })
              }
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">—</option>
              {uoms.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.code} — {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <h2 className="font-semibold">Costing & Traceability</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Default Cost
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.default_cost}
              onChange={(e) =>
                setForm({ ...form, default_cost: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_batch_tracked}
              onChange={(e) =>
                setForm({ ...form, is_batch_tracked: e.target.checked })
              }
            />
            Track by Batch/Lot
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.track_expiry}
              onChange={(e) =>
                setForm({ ...form, track_expiry: e.target.checked })
              }
            />
            Track Expiry
          </label>
          {form.track_expiry && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                placeholder="Days"
                value={form.shelf_life_days || ""}
                onChange={(e) =>
                  setForm({ ...form, shelf_life_days: e.target.value })
                }
                className="w-24 border rounded-md px-2 py-1 text-sm"
                required
              />
              <span className="text-xs text-slate-400">shelf life (days)</span>
            </div>
          )}
        </div>
      </div>

      {initialItem && (
        <div>
          <label className="text-xs text-slate-500 block mb-1">Status</label>
          <select
            value={form.status || "active"}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border rounded-md px-3 py-2"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      )}

      <button
        type="submit"
        className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm"
      >
        {submitLabel}
      </button>
    </form>
  );
}
