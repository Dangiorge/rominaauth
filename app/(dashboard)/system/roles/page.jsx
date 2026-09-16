// path: app/(dashboard)/system/roles/page.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ShieldCheck, Trash2, Users as UsersIcon } from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function RolesPage() {
  const [roles, setRoles] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function loadRoles() {
    fetch("/api/system/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.roles || []));
  }

  useEffect(() => {
    loadRoles();
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
    const res = await fetch("/api/system/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    setName("");
    setDescription("");
    flash("Role created.");
    loadRoles();
  }

  async function handleDelete(role) {
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/system/roles/${role.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Role deleted.");
    loadRoles();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Roles</h1>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
        <input
          placeholder="koba_manager"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded-md px-3 py-2"
          required
        />
        <input
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border rounded-md px-3 py-2 flex-1"
        />
        <button
          type="submit"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> Add Role
        </button>
      </form>

      <div className="bg-white border rounded-lg divide-y">
        {roles.map((r) => (
          <div
            key={r.id}
            className="flex justify-between items-center px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <div>
                <div className="font-medium flex items-center gap-2">
                  {r.name}
                  {r.is_system && (
                    <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                      <ShieldCheck size={11} /> System role
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500">{r.description}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-slate-500">
                <UsersIcon size={14} />
                {r.user_count} user{r.user_count === 1 ? "" : "s"}
              </div>

              <Link
                href={`/system/roles/${r.id}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Edit permissions
              </Link>

              {r.is_system ? (
                <span
                  className="text-xs text-slate-400 px-2"
                  title="System roles cannot be deleted"
                >
                  Protected
                </span>
              ) : r.user_count > 0 ? (
                <button
                  disabled
                  title={`Cannot delete: ${r.user_count} user(s) are assigned to this role`}
                  className="p-1.5 text-slate-300 cursor-not-allowed"
                >
                  <Trash2 size={15} />
                </button>
              ) : (
                <button
                  onClick={() => handleDelete(r)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                  title="Delete role"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
