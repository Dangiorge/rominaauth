// path: app/(dashboard)/inventory/grn/create/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItemLineEditor from "@/components/inventory/ItemLineEditor";
import InlineAlert from "@/components/ui/InlineAlert";

export default function CreateGrnPage() {
  const router = useRouter();
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState({
    store_id: "",
    supplier_name: "",
    reference_note: "",
    received_date: new Date().toISOString().slice(0, 10),
    remarks: "",
  });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/inventory/stores")
      .then((r) => r.json())
      .then((d) =>
        setStores((d.stores || []).filter((s) => s.grade === "MAIN")),
      );
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/inventory/grn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lines }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push("/inventory/grn");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Goods Receipt Note</h1>
      <InlineAlert type="error" message={error} />
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Main Store
            </label>
            <select
              value={form.store_id}
              onChange={(e) => setForm({ ...form, store_id: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Received Date
            </label>
            <input
              type="date"
              value={form.received_date}
              onChange={(e) =>
                setForm({ ...form, received_date: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Supplier
            </label>
            <input
              value={form.supplier_name}
              onChange={(e) =>
                setForm({ ...form, supplier_name: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Reference / Delivery Note #
            </label>
            <input
              value={form.reference_note}
              onChange={(e) =>
                setForm({ ...form, reference_note: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-2">
            Line Items
          </label>
          <ItemLineEditor lines={lines} setLines={setLines} showUnitCost />
        </div>

        <textarea
          placeholder="Remarks"
          value={form.remarks}
          onChange={(e) => setForm({ ...form, remarks: e.target.value })}
          className="w-full border rounded-md px-3 py-2"
          rows={2}
        />

        <button
          type="submit"
          disabled={saving}
          className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Create GRN"}
        </button>
      </form>
    </div>
  );
}
