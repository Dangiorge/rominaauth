// path: app/(dashboard)/system/paths/page.jsx

"use client";

import { useEffect, useState } from "react";

export default function SystemPathsPage() {
  const [paths, setPaths] = useState([]);
  const [form, setForm] = useState({
    path: "",
    label: "",
    icon: "",
    category: "",
  });

  function loadPaths() {
    fetch("/api/system/paths")
      .then((res) => res.json())
      .then((data) => setPaths(data.paths || []));
  }

  useEffect(() => {
    loadPaths();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    await fetch("/api/system/paths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ path: "", label: "", icon: "", category: "" });
    loadPaths();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Registered Paths</h1>

      <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-3 mb-6">
        <input
          placeholder="/koba/inventory"
          value={form.path}
          onChange={(e) => setForm({ ...form, path: e.target.value })}
          className="border rounded-md px-3 py-2"
          required
        />
        <input
          placeholder="Label"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
          className="border rounded-md px-3 py-2"
          required
        />
        <input
          placeholder="Icon (e.g. Package)"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="border rounded-md px-3 py-2"
        />
        <button
          type="submit"
          className="col-span-4 bg-slate-900 text-white py-2 rounded-md"
        >
          Register Path
        </button>
      </form>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Path</th>
            <th>Label</th>
            <th>Category</th>
          </tr>
        </thead>
        <tbody>
          {paths.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="py-2">{p.path}</td>
              <td>{p.label}</td>
              <td>{p.category}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
