// path: app/(guest)/login/page.jsx

"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      // NextAuth v4 CredentialsProvider funnels thrown Error messages into res.error as "CredentialsSignin"
      // when NEXTAUTH_URL/pages are set up simply — but with a thrown Error() in authorize(), the message
      // itself IS available in res.error in most v4 setups. Fall back to a generic message if not.
      setError(
        res.error === "CredentialsSignin"
          ? "Invalid email or password."
          : res.error,
      );
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-lg shadow-md w-96"
    >
      <h1 className="text-2xl font-bold mb-6">Romina PLC Login</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full border rounded-md px-3 py-2 mb-3"
        required
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full border rounded-md px-3 py-2 mb-4"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-slate-900 text-white py-2 rounded-md disabled:opacity-50"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
      <a
        href="/forgot-password"
        className="block text-center text-sm text-slate-500 mt-4 hover:underline"
      >
        Forgot your password?
      </a>
    </form>
  );
}
