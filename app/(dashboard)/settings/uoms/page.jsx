// path: app/(dashboard)/settings/uoms/page.jsx

"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function UomsPage() {
  const [classes, setClasses] = useState([]);
  const [uoms, setUoms] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [classForm, setClassForm] = useState({ name: "" });
  const [uomForm, setUomForm] = useState({
    code: "",
    name: "",
    class_id: "",
    is_base_unit: false,
  });
  const [convForm, setConvForm] = useState({
    from_uom_id: "",
    to_uom_id: "",
    conversion_factor: "",
  });

  function loadAll() {
    fetch("/api/settings/uom-classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
    fetch("/api/settings/uoms")
      .then((r) => r.json())
      .then((d) => setUoms(d.uoms || []));
    fetch("/api/settings/uom-conversions")
      .then((r) => r.json())
      .then((d) => setConversions(d.conversions || []));
  }
  useEffect(() => {
    loadAll();
  }, []);

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

  async function handleAddClass(e) {
    e.preventDefault();
    const res = await fetch("/api/settings/uom-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(classForm),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    setClassForm({ name: "" });
    flash("Unit class added.");
    loadAll();
  }

  async function handleDeleteClass(cls) {
    if (!confirm(`Delete class "${cls.name}"?`)) return;
    const res = await fetch(`/api/settings/uom-classes/${cls.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Class deleted.");
    loadAll();
  }

  async function handleAddUom(e) {
    e.preventDefault();
    const res = await fetch("/api/settings/uoms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uomForm),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    setUomForm({ code: "", name: "", class_id: "", is_base_unit: false });
    flash("Unit added.");
    loadAll();
  }

  async function handleDeleteUom(uom) {
    if (!confirm(`Delete unit "${uom.name}"?`)) return;
    const res = await fetch(`/api/settings/uoms/${uom.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Unit deleted.");
    loadAll();
  }

  async function handleAddConversion(e) {
    e.preventDefault();
    const res = await fetch("/api/settings/uom-conversions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(convForm),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    setConvForm({ from_uom_id: "", to_uom_id: "", conversion_factor: "" });
    flash("Conversion added.");
    loadAll();
  }

  async function handleDeleteConversion(conv) {
    if (!confirm("Delete this conversion?")) return;
    const res = await fetch(`/api/settings/uom-conversions/${conv.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Conversion deleted.");
    loadAll();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Units of Measure</h1>
      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <section>
        <h2 className="font-semibold mb-3">Unit Classes</h2>
        <form onSubmit={handleAddClass} className="flex gap-3 mb-4">
          <input
            placeholder="Class name (e.g. Weight)"
            value={classForm.name}
            onChange={(e) => setClassForm({ name: e.target.value })}
            className="border rounded-md px-3 py-2 flex-1"
            required
          />
          <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm">
            <Plus size={16} /> Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-2 bg-slate-100 text-sm px-3 py-1.5 rounded-full"
            >
              {c.name}
              <button
                onClick={() => handleDeleteClass(c)}
                className="text-slate-400 hover:text-red-600"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Units</h2>
        <form onSubmit={handleAddUom} className="grid grid-cols-4 gap-3 mb-4">
          <input
            placeholder="Code (e.g. kg)"
            value={uomForm.code}
            onChange={(e) => setUomForm({ ...uomForm, code: e.target.value })}
            className="border rounded-md px-3 py-2"
            required
          />
          <input
            placeholder="Name (e.g. Kilogram)"
            value={uomForm.name}
            onChange={(e) => setUomForm({ ...uomForm, name: e.target.value })}
            className="border rounded-md px-3 py-2"
            required
          />
          <select
            value={uomForm.class_id}
            onChange={(e) =>
              setUomForm({ ...uomForm, class_id: e.target.value })
            }
            className="border rounded-md px-3 py-2"
            required
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={uomForm.is_base_unit}
              onChange={(e) =>
                setUomForm({ ...uomForm, is_base_unit: e.target.checked })
              }
            />
            Base unit for class
          </label>
          <button className="col-span-4 flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-md text-sm">
            <Plus size={16} /> Add Unit
          </button>
        </form>
        <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="text-left border-b bg-slate-50">
              <th className="py-2 px-4">Code</th>
              <th>Name</th>
              <th>Class</th>
              <th>Base?</th>
              <th className="text-right px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {uoms.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="py-2 px-4 font-mono">{u.code}</td>
                <td>{u.name}</td>
                <td>{u.uom_classes?.name}</td>
                <td>{u.is_base_unit ? "Yes" : ""}</td>
                <td className="px-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteUom(u)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Conversions</h2>
        <form
          onSubmit={handleAddConversion}
          className="grid grid-cols-4 gap-3 mb-4"
        >
          <select
            value={convForm.from_uom_id}
            onChange={(e) =>
              setConvForm({ ...convForm, from_uom_id: e.target.value })
            }
            className="border rounded-md px-3 py-2"
            required
          >
            <option value="">From unit</option>
            {uoms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </select>
          <select
            value={convForm.to_uom_id}
            onChange={(e) =>
              setConvForm({ ...convForm, to_uom_id: e.target.value })
            }
            className="border rounded-md px-3 py-2"
            required
          >
            <option value="">To unit</option>
            {uoms.map((u) => (
              <option key={u.id} value={u.id}>
                {u.code}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="any"
            placeholder="Factor (1 from = X to)"
            value={convForm.conversion_factor}
            onChange={(e) =>
              setConvForm({ ...convForm, conversion_factor: e.target.value })
            }
            className="border rounded-md px-3 py-2"
            required
          />
          <button className="flex items-center justify-center gap-2 bg-slate-900 text-white py-2 rounded-md text-sm">
            <Plus size={16} /> Add
          </button>
        </form>
        <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
          <thead>
            <tr className="text-left border-b bg-slate-50">
              <th className="py-2 px-4">From</th>
              <th>To</th>
              <th>Factor</th>
              <th className="text-right px-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {conversions.map((c) => (
              <tr key={c.id} className="border-b last:border-0">
                <td className="py-2 px-4">{c.from_uom?.code}</td>
                <td>{c.to_uom?.code}</td>
                <td>{c.conversion_factor}</td>
                <td className="px-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteConversion(c)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
