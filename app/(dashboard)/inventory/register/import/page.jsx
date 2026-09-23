// path: app/(dashboard)/inventory/register/import/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";

const ACTION_STYLES = {
  NEW: "bg-green-100 text-green-700",
  CHANGED: "bg-blue-100 text-blue-700",
  ERROR: "bg-red-100 text-red-700",
};

export default function InventoryImportPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null); // { batchId, counts, totalRows, rows }

  useEffect(() => {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []));
  }, []);

  async function handlePreview(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (companyId) formData.append("company_id", companyId);

    const res = await fetch("/api/inventory/register/import/preview", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setPreview(data);
  }

  async function handleCommit() {
    setCommitting(true);
    const res = await fetch(
      `/api/inventory/register/import/${preview.batchId}/commit`,
      { method: "POST" },
    );
    const data = await res.json();
    setCommitting(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push("/inventory/register");
  }

  async function handleDiscard() {
    await fetch(`/api/inventory/register/import/${preview.batchId}/discard`, {
      method: "POST",
    });
    setPreview(null);
    setFile(null);
  }

  if (preview) {
    const { counts, totalRows, rows } = preview;
    return (
      <div>
        <h1 className="text-2xl font-bold mb-4">Import Preview</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{totalRows}</div>
            <div className="text-xs text-slate-500">Total Rows</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {counts.new}
            </div>
            <div className="text-xs text-green-700">New</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">
              {counts.changed}
            </div>
            <div className="text-xs text-blue-700">Changed</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-700">
              {counts.error}
            </div>
            <div className="text-xs text-red-700">Errors</div>
          </div>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          {counts.unchanged} row(s) are already up to date and won&apos;t be
          touched. Only New and Changed rows below will be applied on commit.
        </p>

        {rows.length > 0 && (
          <div className="bg-white border rounded-lg overflow-hidden mb-6 max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left border-b">
                  <th className="py-2 px-4">Row</th>
                  <th>Action</th>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2 px-4 text-xs text-slate-400">
                      {r.row_number}
                    </td>
                    <td>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${ACTION_STYLES[r.action]}`}
                      >
                        {r.action}
                      </span>
                    </td>
                    <td className="text-xs font-mono">{r.code}</td>
                    <td className="text-xs">{r.name}</td>
                    <td className="text-xs text-slate-500">
                      {r.action === "ERROR" && r.error_message}
                      {r.action === "CHANGED" &&
                        Object.entries(r.changed_fields).map(([f, v]) => (
                          <div key={f}>
                            {f}:{" "}
                            <span className="text-red-500">
                              {String(v.old ?? "—")}
                            </span>{" "}
                            →{" "}
                            <span className="text-green-600">
                              {String(v.new ?? "—")}
                            </span>
                          </div>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCommit}
            disabled={committing || counts.new + counts.changed === 0}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
          >
            {committing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Commit {counts.new + counts.changed} Row(s)
          </button>
          <button
            onClick={handleDiscard}
            className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md text-sm"
          >
            <XCircle size={16} /> Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">
        Import Inventory Item Register
      </h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}
      <form
        onSubmit={handlePreview}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Company (optional context tag)
          </label>
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Excel File
          </label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <AlertTriangle size={12} /> Re-uploading the same file only applies
            rows that are new or changed.
          </p>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {uploading ? "Analyzing..." : "Preview Import"}
        </button>
      </form>
    </div>
  );
}
