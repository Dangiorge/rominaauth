// path: app/documents/access-control/page.jsx

"use client";

import { useState, useEffect } from "react";

export default function DocumentAccessControlPage() {
  const [roles, setRoles] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Active form state for adding/updating a role assignment for a specific category
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [assignmentForm, setAssignmentForm] = useState({
    role_id: "",
    company_id: "",
    permissions: {
      view: true,
      submit: false,
      approve: false,
      check: false,
      request_edit: false,
      approve_edit: false,
      view_type: "STANDARD", // Added View Access Type
    },
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roleRes, compRes, catRes, polRes] = await Promise.all([
        fetch("/api/system/roles"),
        fetch("/api/system/companies"),
        fetch("/api/documents/categories"),
        fetch("/api/documents/access-policies"),
      ]);

      const roleData = await roleRes.json();
      const compData = await compRes.json();
      const catData = await catRes.json();
      const polData = await polRes.json();

      if (roleData.roles) setRoles(roleData.roles);
      if (compData.companies) setCompanies(compData.companies);
      if (catData.categories) setCategories(catData.categories);
      if (polData.policies) setPolicies(polData.policies);
    } catch (err) {
      setError("Failed to load access control configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckboxChange = (permKey) => {
    setAssignmentForm({
      ...assignmentForm,
      permissions: {
        ...assignmentForm.permissions,
        [permKey]: !assignmentForm.permissions[permKey],
      },
    });
  };

  const handleSavePolicy = async (companyId, categoryId) => {
    setError(null);
    setSuccessMsg(null);

    if (!assignmentForm.role_id) {
      setError("Please select a role to assign.");
      return;
    }

    const payload = {
      company_id: parseInt(companyId),
      category_id: categoryId ? parseInt(categoryId) : null,
      role_id: parseInt(assignmentForm.role_id),
      access_level: assignmentForm.permissions.view ? "VIEW" : "NONE",
      permissions: assignmentForm.permissions,
    };

    const res = await fetch("/api/documents/access-policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccessMsg("Role permissions saved successfully!");
      setActiveCategoryId(null);
      setAssignmentForm({
        role_id: "",
        company_id: "",
        permissions: {
          view: true,
          submit: false,
          approve: false,
          check: false,
          request_edit: false,
          approve_edit: false,
          view_type: "STANDARD",
        },
      });
      fetchData();
    }
  };

  const handleDelete = async (policyId) => {
    if (!confirm("Are you sure you want to revoke this role's access?")) return;
    const res = await fetch(`/api/documents/access-policies?id=${policyId}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setSuccessMsg(data.message);
      fetchData();
    }
  };

  const getRoleName = (roleId) => {
    const role = roles.find((r) => r.id === roleId);
    return role ? role.name : `Role #${roleId}`;
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Category-Based Document Permissions
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage what roles can view, submit, approve, and edit documents under
          each category.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-100 text-green-700 rounded-md">
          {successMsg}
        </div>
      )}

      {loading ? (
        <p>Loading categories and policies...</p>
      ) : categories.length === 0 ? (
        <p className="text-slate-500">
          No categories found. Please create categories first.
        </p>
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => {
            const categoryPolicies = policies.filter(
              (p) => p.category_id === cat.id,
            );
            const isAdding = activeCategoryId === cat.id;

            return (
              <div
                key={cat.id}
                className="bg-white border border-slate-200 shadow-sm rounded-lg p-6 space-y-4"
              >
                {/* Category Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 pb-4 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="text-lg font-bold text-slate-800">
                        {cat.name}
                      </h2>
                      {cat.code && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
                          {cat.code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Company ID: {cat.company_id}{" "}
                      {cat.description && `• ${cat.description}`}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveCategoryId(isAdding ? null : cat.id);
                      setAssignmentForm({
                        ...assignmentForm,
                        company_id: cat.company_id,
                      });
                    }}
                    className="bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold px-3 py-2 rounded-md transition"
                  >
                    {isAdding ? "Cancel" : "+ Assign Role Permission"}
                  </button>
                </div>

                {/* Assigned Roles List */}
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                    Roles with Access
                  </h3>
                  {categoryPolicies.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">
                      No specific role permissions assigned to this category
                      yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryPolicies.map((p) => {
                        const perms = p.permissions || {};
                        return (
                          <div
                            key={p.id}
                            className="border border-slate-200 rounded-md p-3 bg-slate-50 flex flex-col justify-between space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-semibold text-slate-700 text-sm">
                                {getRoleName(p.role_id)}
                              </span>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Revoke
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-1 items-center">
                              {/* View Type Badge */}
                              <span className="bg-slate-200 text-slate-800 text-[10px] px-2 py-0.5 rounded font-bold">
                                VIEW: {perms.view_type || "STANDARD"}
                              </span>
                              {Object.entries(perms).map(
                                ([k, v]) =>
                                  k !== "view_type" &&
                                  v && (
                                    <span
                                      key={k}
                                      className="bg-white border border-slate-200 text-slate-700 text-[10px] px-2 py-0.5 rounded uppercase font-bold"
                                    >
                                      {k.replace("_", " ")}
                                    </span>
                                  ),
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Inline Assignment Form for this Category */}
                {isAdding && (
                  <div className="mt-4 pt-4 border-t border-slate-200 bg-blue-50/50 p-4 rounded-lg space-y-4">
                    <h4 className="text-sm font-bold text-slate-700">
                      Assign Role & Privileges to &quot;{cat.name}&quot;
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Select Role
                        </label>
                        <select
                          className="w-full border rounded p-2 text-sm border-slate-300 bg-white"
                          value={assignmentForm.role_id}
                          onChange={(e) =>
                            setAssignmentForm({
                              ...assignmentForm,
                              role_id: e.target.value,
                            })
                          }
                        >
                          <option value="">-- Choose Role --</option>
                          {roles.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          View Access Type
                        </label>
                        <select
                          className="w-full border rounded p-2 text-sm border-slate-300 bg-white"
                          value={assignmentForm.permissions.view_type}
                          onChange={(e) =>
                            setAssignmentForm({
                              ...assignmentForm,
                              permissions: {
                                ...assignmentForm.permissions,
                                view_type: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="STANDARD">
                            Standard View & Download
                          </option>
                          <option value="VIEW_ONLY">
                            View Only (No Download/Print)
                          </option>
                          <option value="WATERMARKED">
                            View with Security Watermark
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-2">
                        Configure Privileges
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        {[
                          { key: "view", label: "View Access" },
                          { key: "submit", label: "Submit" },
                          { key: "approve", label: "Approve" },
                          { key: "check", label: "Check" },
                          { key: "request_edit", label: "Request Edit" },
                          { key: "approve_edit", label: "Approve Edit" },
                        ].map((perm) => (
                          <label
                            key={perm.key}
                            className="flex items-center space-x-1.5 text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 cursor-pointer shadow-2xs"
                          >
                            <input
                              type="checkbox"
                              checked={assignmentForm.permissions[perm.key]}
                              onChange={() => handleCheckboxChange(perm.key)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-medium">{perm.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setActiveCategoryId(null)}
                        className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePolicy(cat.company_id, cat.id)}
                        className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
                      >
                        Save Assignment
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
