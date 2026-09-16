// path: app/(guest)/reset-password/page.jsx

"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push("/login"), 2500);
  }

  if (!token) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
        <p className="text-red-600 text-sm">
          Missing reset token. Please use the link from your email.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-96">
      <h1 className="text-xl font-bold mb-6">Set a New Password</h1>

      {success ? (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          Password updated! Redirecting you to login...
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
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
            Reset Password
          </button>
        </form>
      )}
    </div>
  );
}
