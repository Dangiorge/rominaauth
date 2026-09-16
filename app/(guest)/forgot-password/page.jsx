// path: app/(guest)/forgot-password/page.jsx

"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    setMessage(
      data.message || "If that email exists, a reset link has been sent.",
    );
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-96">
      <h1 className="text-xl font-bold mb-2">Forgot Password</h1>
      <p className="text-sm text-slate-500 mb-6">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {message ? (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-4 py-3">
          {message}
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-4"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white py-2 rounded-md disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <Link
        href="/login"
        className="block text-center text-sm text-slate-500 mt-4 hover:underline"
      >
        Back to login
      </Link>
    </div>
  );
}
