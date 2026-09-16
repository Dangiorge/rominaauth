// path: app/(dashboard)/settings/taxes/page.jsx

"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function TaxesPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [taxes, setTaxes] = useState([]);
  const [modal, setModal] = useState(null);
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

  function loadTaxes() {
    if (!companyId) return;
    fetch(`/api/settings/taxes?companyId=${companyId}`)
      .then((r) => r.json())
      .then((d) => setTaxes(d.taxes || []));
  }
  useEffect(() => {
    loadTaxes();
  }, [companyId]);

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

  async function handleDelete(tax) {
    if (!confirm(`Delete "${tax.name}"?`)) return;
    const res = await fetch(`/api/settings/taxes/${tax.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Tax class deleted.");
    loadTaxes();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Tax Classes</h1>
        <div className="flex items-center gap-3">
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
          <button
            onClick={() => setModal({ mode: "create" })}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
          >
            <Plus size={16} /> New Tax Class
          </button>
        </div>
      </div>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Name</th>
            <th>Code</th>
            <th>Rate</th>
            <th>Type</th>
            <th className="text-right px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {taxes.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-3 px-4">{t.name}</td>
              <td>{t.code}</td>
              <td>{t.is_taxable ? `${t.rate}%` : "—"}</td>
              <td className="text-xs text-slate-500">
                {!t.is_taxable
                  ? "Exempt"
                  : t.is_inclusive
                    ? "Inclusive"
                    : "Exclusive"}
              </td>
              <td className="px-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setModal({ mode: "edit", data: t })}
                    className="p-1.5 hover:bg-slate-100 rounded-md"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(t)}
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
        <TaxModal
          modal={modal}
          companyId={companyId}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            flash(msg);
            setModal(null);
            loadTaxes();
          }}
          onError={(msg) => flash(msg, "error")}
        />
      )}
    </div>
  );
}

function TaxModal({ modal, companyId, onClose, onSaved, onError }) {
  const isEdit = modal.mode === "edit";
  const [form, setForm] = useState(() =>
    isEdit
      ? { ...modal.data }
      : {
          name: "",
          code: "",
          rate: 0,
          is_inclusive: false,
          is_taxable: true,
          company_id: Number(companyId),
        },
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const url = isEdit
      ? `/api/settings/taxes/${form.id}`
      : "/api/settings/taxes";
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
    onSaved(`Tax class ${isEdit ? "updated" : "created"}.`);
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit" : "New"} Tax Class
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Name (e.g. Standard VAT)"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <input
            placeholder="Code (e.g. VAT15)"
            value={form.code || ""}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            className="w-full border rounded-md px-3 py-2"
            required
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_taxable ?? true}
              onChange={(e) =>
                setForm({ ...form, is_taxable: e.target.checked })
              }
            />
            This class is taxable (uncheck for Exempt / Zero-rated)
          </label>

          {form.is_taxable && (
            <>
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.rate ?? 0}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                  className="w-full border rounded-md px-3 py-2"
                  required
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.is_inclusive || false}
                  onChange={(e) =>
                    setForm({ ...form, is_inclusive: e.target.checked })
                  }
                />
                Price is tax-inclusive
              </label>
            </>
          )}

          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active
            </label>
          )}

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
