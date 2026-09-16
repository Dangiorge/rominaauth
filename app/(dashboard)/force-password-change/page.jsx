// path: app/(dashboard)/force-password-change/page.jsx

"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ForcePasswordChangePage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const res = await fetch("/api/account/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    // Force a fresh login so the JWT no longer carries mustChangePassword: true
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-lg shadow-md w-96"
      >
        <h1 className="text-xl font-bold mb-2">Change Your Password</h1>
        <p className="text-sm text-slate-500 mb-6">
          You&apos;re required to set a new password before continuing.
        </p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <input
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full border rounded-md px-3 py-2 mb-3"
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border rounded-md px-3 py-2 mb-4"
          required
        />
        <button
          type="submit"
          className="w-full bg-slate-900 text-white py-2 rounded-md"
        >
          Set New Password
        </button>
      </form>
    </div>
  );
}
