// path: components/layout/Header.jsx

"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Header() {
  const { data: session, update } = useSession();
  const [scopeData, setScopeData] = useState(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetch("/api/account/my-scopes")
      .then((res) => res.json())
      .then(setScopeData);
  }, []);

  async function handleBrandChange(e) {
    setSwitching(true);
    await update({ activeBrandId: e.target.value, activeBranchId: "ALL" });
    setSwitching(false);
  }

  async function handleBranchChange(e) {
    setSwitching(true);
    await update({ activeBranchId: e.target.value });
    setSwitching(false);
  }

  if (!session || !scopeData) {
    return (
      <header className="h-16 flex items-center justify-end px-6 border-b bg-white">
        <div className="text-sm text-slate-400">Loading...</div>
      </header>
    );
  }

  const isGlobal = scopeData.isGlobal;
  const showBrandSwitcher = !isGlobal && scopeData.brands.length > 1;
  const branchesForActiveBrand = scopeData.branches.filter(
    (b) =>
      session.user.activeBrandId === "ALL" ||
      b.brand_id === Number(session.user.activeBrandId),
  );
  const showBranchSwitcher = !isGlobal && branchesForActiveBrand.length > 1;

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b bg-white">
      <div className="flex items-center gap-3">
        {showBrandSwitcher && (
          <select
            value={session.user.activeBrandId || "ALL"}
            onChange={handleBrandChange}
            disabled={switching}
            className="text-sm border rounded-md px-2 py-1.5"
          >
            <option value="ALL">All Brands</option>
            {scopeData.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
        {showBranchSwitcher && (
          <select
            value={session.user.activeBranchId || "ALL"}
            onChange={handleBranchChange}
            disabled={switching}
            className="text-sm border rounded-md px-2 py-1.5"
          >
            <option value="ALL">All Branches</option>
            {branchesForActiveBrand.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm text-slate-500">
          Welcome, {session.user.name}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm text-red-600 hover:underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
