// path: app/(dashboard)/system/users/page.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, UserX, UserCheck, Plus } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    employee_id: "",
    department: "",
    job_title: "",
    role_id: "",
  });

  function loadUsers() {
    fetch("/api/system/users")
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []));
  }

  useEffect(() => {
    loadUsers();
    fetch("/api/system/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.roles || []));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/system/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const responseText = await res.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!res.ok) {
        setError(data.error || "Failed to create user.");
        return;
      }

      setForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        employee_id: "",
        department: "",
        job_title: "",
        role_id: "",
      });
      setShowForm(false);
      loadUsers();
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    }
  }

  async function handleToggleActive(user) {
    setError("");
    const res = await fetch(`/api/system/users/${user.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      setError(data.error);
      return;
    }
    loadUsers();
  }

  async function handleDelete(user) {
    if (
      !confirm(`Archive ${user.full_name}? This is reversible (soft delete).`)
    )
      return;
    setError("");
    const res = await fetch(`/api/system/users/${user.id}`, {
      method: "DELETE",
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : {};
    if (!res.ok) {
      setError(data.error);
      return;
    }
    loadUsers();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> New User
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="border rounded-lg p-4 mb-6 grid grid-cols-3 gap-3 bg-white"
        >
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="border rounded-md px-3 py-2"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="border rounded-md px-3 py-2"
            required
          />
          <input
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="border rounded-md px-3 py-2"
            required
          />
          <input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            placeholder="Employee ID"
            value={form.employee_id}
            onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <input
            placeholder="Job title"
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            className="border rounded-md px-3 py-2"
          />
          <select
            value={form.role_id}
            onChange={(e) => setForm({ ...form, role_id: e.target.value })}
            className="border rounded-md px-3 py-2"
            required
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="bg-slate-900 text-white py-2 rounded-md"
          >
            Create User
          </button>
        </form>
      )}

      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Status</th>
            <th className="text-right px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b last:border-0">
              <td className="py-3 px-4">{u.full_name}</td>
              <td>{u.email}</td>
              <td>{u.role_name}</td>
              <td>{u.department || "—"}</td>
              <td>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    u.deleted_at
                      ? "bg-slate-100 text-slate-500"
                      : u.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {u.deleted_at
                    ? "Archived"
                    : u.is_active
                      ? "Active"
                      : "Suspended"}
                </span>
              </td>
              <td className="px-4">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/system/users/${u.id}`}
                    className="p-1.5 hover:bg-slate-100 rounded-md"
                    title="Edit"
                  >
                    <Pencil size={15} />
                  </Link>
                  {!u.deleted_at && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      className="p-1.5 hover:bg-slate-100 rounded-md"
                      title={u.is_active ? "Suspend" : "Reactivate"}
                    >
                      {u.is_active ? (
                        <UserX size={15} />
                      ) : (
                        <UserCheck size={15} />
                      )}
                    </button>
                  )}
                  {!u.deleted_at && (
                    <button
                      onClick={() => handleDelete(u)}
                      className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                      title="Archive"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
