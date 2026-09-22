// path: app/(dashboard)/documents/upload/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadDocumentPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    company_id: "",
    department_id: "",
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => {
        setCompanies(d.companies || []);
        if (d.companies?.length)
          setForm((f) => ({ ...f, company_id: String(d.companies[0].id) }));
      });
    fetch("/api/system/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", form.title);
    formData.append("description", form.description);
    formData.append("company_id", form.company_id);
    if (form.department_id)
      formData.append("department_id", form.department_id);

    const res = await fetch("/api/documents", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push("/documents");
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Upload Document</h1>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}
      <form
        onSubmit={handleSubmit}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <div>
          <label className="text-xs text-slate-500 block mb-1">Title</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            rows={2}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1">Company</label>
            <select
              value={form.company_id}
              onChange={(e) => setForm({ ...form, company_id: e.target.value })}
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
              Department
            </label>
            <select
              value={form.department_id}
              onChange={(e) =>
                setForm({ ...form, department_id: e.target.value })
              }
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <p className="text-xs text-slate-400 mt-1">
            Max 25MB. Uploaded to Google Drive; a SHA-256 hash is recorded for
            tamper detection.
          </p>
        </div>
        <button
          type="submit"
          disabled={uploading}
          className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
    </div>
  );
}
