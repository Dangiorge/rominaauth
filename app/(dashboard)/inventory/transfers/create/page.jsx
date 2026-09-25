// path: app/(dashboard)/inventory/transfers/create/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItemLineEditor from "@/components/inventory/ItemLineEditor";
import InlineAlert from "@/components/ui/InlineAlert";

export default function CreateTransferPage() {
  const router = useRouter();
  const [mainStores, setMainStores] = useState([]);
  const [subStores, setSubStores] = useState([]);
  const [form, setForm] = useState({
    from_store_id: "",
    to_store_id: "",
    transfer_date: new Date().toISOString().slice(0, 10),
    remarks: "",
  });
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/inventory/stores")
      .then((r) => r.json())
      .then((d) => {
        setMainStores((d.stores || []).filter((s) => s.grade === "MAIN"));
        setSubStores((d.stores || []).filter((s) => s.grade === "SUB"));
      });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (lines.length === 0) {
      setError("Add at least one line item.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/inventory/transfers", {
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
    router.push("/inventory/transfers");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Internal Transfer</h1>
      <InlineAlert type="error" message={error} />
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              From (Main Store)
            </label>
            <select
              value={form.from_store_id}
              onChange={(e) =>
                setForm({ ...form, from_store_id: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select store</option>
              {mainStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              To (Sub Store)
            </label>
            <select
              value={form.to_store_id}
              onChange={(e) =>
                setForm({ ...form, to_store_id: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select store</option>
              {subStores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Transfer Date
            </label>
            <input
              type="date"
              value={form.transfer_date}
              onChange={(e) =>
                setForm({ ...form, transfer_date: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 block mb-2">
            Line Items
          </label>
          <ItemLineEditor
            lines={lines}
            setLines={setLines}
            showUnitCost={false}
          />
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
          {saving ? "Saving..." : "Create Transfer"}
        </button>
      </form>
    </div>
  );
}
