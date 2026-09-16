// path: app/(dashboard)/system/roles/[roleId]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function RolePermissionsPage() {
  const { roleId } = useParams();
  const [permissions, setPermissions] = useState([]);

  useEffect(() => {
    fetch(`/api/system/roles/${roleId}/permissions`)
      .then((res) => res.json())
      .then((data) => setPermissions(data.permissions || []));
  }, [roleId]);

  async function toggle(pathId, field, currentValue, perm) {
    const updated = { ...perm, [field]: !currentValue };
    setPermissions((prev) =>
      prev.map((p) => (p.path_id === pathId ? updated : p)),
    );

    await fetch(`/api/system/roles/${roleId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pathId,
        can_view: updated.can_view,
        can_create: updated.can_create,
        can_edit: updated.can_edit,
        can_delete: updated.can_delete,
        custom_flags: updated.custom_flags,
      }),
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Role Permissions</h1>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2">Path</th>
            <th>View</th>
            <th>Create</th>
            <th>Edit</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {permissions.map((p) => (
            <tr key={p.path_id} className="border-b">
              <td className="py-2">
                {p.label} <span className="text-slate-400">({p.path})</span>
              </td>
              {["can_view", "can_create", "can_edit", "can_delete"].map(
                (field) => (
                  <td key={field}>
                    <input
                      type="checkbox"
                      checked={p[field]}
                      onChange={() => toggle(p.path_id, field, p[field], p)}
                    />
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
