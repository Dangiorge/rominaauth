// path: app/(dashboard)/system/users/[userId]/page.jsx (replace the whole file)

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ScopeAssignment from "@/components/users/ScopeAssignment";

export default function EditUserPage() {
  const { userId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch(`/api/system/users/${userId}`)
      .then((res) => res.json())
      .then((data) => setUser(data.user));
    fetch("/api/system/roles")
      .then((res) => res.json())
      .then((data) => setRoles(data.roles || []));
    fetch("/api/system/departments")
      .then((res) => res.json())
      .then((data) => setDepartments(data.departments || []));
  }, [userId]);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const payload = { ...user };
    delete payload.roles;
    delete payload.role_name;
    delete payload.departments;
    if (newPassword) payload.new_password = newPassword;

    const res = await fetch(`/api/system/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setSuccess("Saved successfully.");
    setNewPassword("");
  }

  if (!user) return <div>Loading...</div>;

  const field = (key, label, type = "text") => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        type={type}
        value={user[key] || ""}
        onChange={(e) => setUser({ ...user, [key]: e.target.value })}
        className="w-full border rounded-md px-3 py-2"
      />
    </div>
  );

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-slate-500 mb-4"
      >
        ← Back
      </button>
      <h1 className="text-2xl font-bold mb-6">Edit {user.full_name}</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white border rounded-lg p-6 space-y-6"
      >
        <div>
          <h2 className="font-semibold mb-3">Basic Info</h2>
          <div className="grid grid-cols-2 gap-4">
            {field("full_name", "Full Name")}
            {field("email", "Email", "email")}
            {field("phone", "Phone")}
            {field("employee_id", "Employee ID")}
            {field("date_of_birth", "Date of Birth", "date")}
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Gender
              </label>
              <select
                value={user.gender || ""}
                onChange={(e) => setUser({ ...user, gender: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                <option value="">—</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Address</h2>
          <div className="grid grid-cols-2 gap-4">
            {field("address", "Address")}
            {field("city", "City")}
            {field("country", "Country")}
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Employment</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-500 block mb-1">
                Department
              </label>
              <select
                value={user.department_id || ""}
                onChange={(e) =>
                  setUser({
                    ...user,
                    department_id: e.target.value
                      ? Number(e.target.value)
                      : null,
                  })
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
            {field("job_title", "Job Title")}
            {field("hire_date", "Hire Date", "date")}
            <div>
              <label className="text-xs text-slate-500 block mb-1">Role</label>
              <select
                value={user.role_id || ""}
                onChange={(e) => setUser({ ...user, role_id: e.target.value })}
                className="w-full border rounded-md px-3 py-2"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <h2 className="font-semibold mb-3">Security</h2>
          <div>
            <label className="text-xs text-slate-500 block mb-1">
              Reset Password (leave blank to keep current)
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full border rounded-md px-3 py-2"
            />
            <p className="text-xs text-slate-400 mt-1">
              Min 8 chars, 1 uppercase, 1 lowercase, 1 number. User will be
              required to change it on next login.
            </p>
          </div>
        </div>

        <button
          type="submit"
          className="bg-slate-900 text-white px-6 py-2 rounded-md"
        >
          Save Changes
        </button>
      </form>

      <div className="bg-white border rounded-lg p-6 mt-6">
        <ScopeAssignment userId={userId} />
      </div>
    </div>
  );
}
