// path: components/users/ScopeAssignment.jsx

"use client";

import { useEffect, useState } from "react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function ScopeAssignment({ userId }) {
  const [companies, setCompanies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selected, setSelected] = useState({
    companyIds: [],
    brandIds: [],
    branchIds: [],
    primaryBranchId: null,
  });
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []));
    fetch("/api/system/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []));
    fetch("/api/system/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []));
    fetch(`/api/system/users/${userId}/scopes`)
      .then((r) => r.json())
      .then(setSelected);
  }, [userId]);

  function toggle(listKey, id) {
    setSelected((s) => {
      const has = s[listKey].includes(id);
      return {
        ...s,
        [listKey]: has
          ? s[listKey].filter((x) => x !== id)
          : [...s[listKey], id],
      };
    });
  }

  async function handleSave() {
    setError("");
    setSuccess("");
    const res = await fetch(`/api/system/users/${userId}/scopes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setSuccess("Access scope saved.");
  }

  const isGlobal =
    selected.companyIds.length === 0 &&
    selected.brandIds.length === 0 &&
    selected.branchIds.length === 0;

  return (
    <div>
      <h2 className="font-semibold mb-1">Data Access Scope</h2>
      <p className="text-xs text-slate-400 mb-3">
        {isGlobal
          ? "No scopes assigned — this user has global access to all data (unless overridden by role permissions)."
          : "This user will only see data for the checked companies, brands, and branches below."}
      </p>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">
            Companies
          </div>
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {companies.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.companyIds.includes(c.id)}
                  onChange={() => toggle("companyIds", c.id)}
                />
                {c.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">Brands</div>
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {brands.map((b) => (
              <label key={b.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.brandIds.includes(b.id)}
                  onChange={() => toggle("brandIds", b.id)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs font-medium text-slate-500 mb-2">
            Branches
          </div>
          <div className="border rounded-md p-2 max-h-48 overflow-y-auto space-y-1">
            {branches.map((br) => (
              <label key={br.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.branchIds.includes(br.id)}
                  onChange={() => toggle("branchIds", br.id)}
                />
                {br.name}
                {selected.branchIds.includes(br.id) && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelected((s) => ({ ...s, primaryBranchId: br.id }))
                    }
                    className={`ml-auto text-xs px-1.5 py-0.5 rounded-full ${
                      selected.primaryBranchId === br.id
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {selected.primaryBranchId === br.id
                      ? "Primary"
                      : "Set primary"}
                  </button>
                )}
              </label>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        className="mt-4 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
      >
        Save Access Scope
      </button>
    </div>
  );
}
