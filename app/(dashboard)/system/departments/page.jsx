// path: app/(dashboard)/system/departments/page.jsx

"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", code: "" });

  function loadDepartments() {
    fetch("/api/system/departments")
      .then((r) => r.json())
      .then((d) => setDepartments(d.departments || []));
  }

  useEffect(() => {
    loadDepartments();
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

  async function handleSubmit(e) {
    e.preventDefault();
    const url = editing
      ? `/api/system/departments/${editing.id}`
      : "/api/system/departments";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash(editing ? "Department updated." : "Department created.");
    setForm({ name: "", code: "" });
    setEditing(null);
    loadDepartments();
  }

  async function handleDelete(dept) {
    if (!confirm(`Delete "${dept.name}"?`)) return;
    const res = await fetch(`/api/system/departments/${dept.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Department deleted.");
    loadDepartments();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Departments</h1>
      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          placeholder="Name (e.g. Kitchen)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="border rounded-md px-3 py-2 flex-1"
          required
        />
        <input
          placeholder="Code (e.g. KIT)"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: e.target.value.toUpperCase() })
          }
          className="border rounded-md px-3 py-2 w-40"
          required
        />
        <button
          type="submit"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> {editing ? "Update" : "Add"}
        </button>
        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm({ name: "", code: "" });
            }}
            className="px-4 py-2 text-sm rounded-md border"
          >
            Cancel
          </button>
        )}
      </form>

      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Name</th>
            <th>Code</th>
            <th className="text-right px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id} className="border-b last:border-0">
              <td className="py-3 px-4">{d.name}</td>
              <td>{d.code}</td>
              <td className="px-4">
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setEditing(d);
                      setForm({ name: d.name, code: d.code });
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-md"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(d)}
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
    </div>
  );
}
