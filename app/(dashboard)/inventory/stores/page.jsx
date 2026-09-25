// path: app/(dashboard)/inventory/stores/page.jsx

"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [branches, setBranches] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function load() {
    fetch("/api/inventory/stores")
      .then((r) => r.json())
      .then((d) => setStores(d.stores || []));
  }
  useEffect(() => {
    load();
    fetch("/api/system/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []));
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []));
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

  async function handleDelete(store) {
    if (!confirm(`Delete "${store.name}"?`)) return;
    const res = await fetch(`/api/inventory/stores/${store.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Store deleted.");
    load();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Stores</h1>
        <button
          onClick={() => setModal({ mode: "create" })}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> New Store
        </button>
      </div>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Name</th>
            <th>Code</th>
            <th>Grade</th>
            <th>Location</th>
            <th className="text-right px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((s) => (
            <tr key={s.id} className="border-b last:border-0">
              <td className="py-3 px-4">{s.name}</td>
              <td className="font-mono text-xs">{s.code}</td>
              <td>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${s.grade === "MAIN" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {s.grade === "MAIN" ? "Main Store" : "Sub Store"}
                </span>
              </td>
              <td className="text-xs text-slate-500">
                {s.branch ? (
                  s.branch.name
                ) : (
                  <span>
                    {s.company?.name}{" "}
                    <span className="text-slate-400">(Standalone)</span>
                  </span>
                )}
              </td>
              <td className="px-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setModal({ mode: "edit", data: s })}
                    className="p-1.5 hover:bg-slate-100 rounded-md"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(s)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modal && (
        <StoreModal
          modal={modal}
          branches={branches}
          companies={companies}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            flash(msg);
            setModal(null);
            load();
          }}
          onError={(msg) => flash(msg, "error")}
        />
      )}
    </div>
  );
}

function StoreModal({ modal, branches, companies, onClose, onSaved, onError }) {
  const isEdit = modal.mode === "edit";
  const [parentType, setParentType] = useState(() =>
    isEdit ? (modal.data.branch_id ? "branch" : "company") : "branch",
  );
  const [form, setForm] = useState(() =>
    isEdit
      ? { ...modal.data }
      : {
          name: "",
          code: "",
          branch_id: "",
          company_id: "",
          grade: "MAIN",
          description: "",
        },
  );

  function handleParentTypeChange(type) {
    setParentType(type);
    setForm((f) => ({
      ...f,
      branch_id: type === "branch" ? f.branch_id : "",
      company_id: type === "company" ? f.company_id : "",
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const url = isEdit
      ? `/api/inventory/stores/${form.id}`
      : "/api/inventory/stores";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error);
      return;
    }
    onSaved(`Store ${isEdit ? "updated" : "created"}.`);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit" : "New"} Store
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <input
            placeholder="Code (e.g. ATL-MAIN)"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            className="w-full border rounded-md px-3 py-2"
            required
          />

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={parentType === "branch"}
                onChange={() => handleParentTypeChange("branch")}
              />
              Under a Branch
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={parentType === "company"}
                onChange={() => handleParentTypeChange("company")}
              />
              Standalone (under a Company)
            </label>
          </div>

          {parentType === "branch" ? (
            <select
              value={form.branch_id}
              onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={form.company_id}
              onChange={(e) => setForm({ ...form, company_id: e.target.value })}
              className="w-full border rounded-md px-3 py-2"
              required
            >
              <option value="">Select company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="MAIN">Main Store (Grade 1) — creates GRNs</option>
            <option value="SUB">
              Sub Store (Grade 2) — receives via transfer
            </option>
          </select>

          <textarea
            placeholder="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            rows={2}
          />

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
