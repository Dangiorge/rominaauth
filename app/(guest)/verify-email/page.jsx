// path: app/(guest)/verify-email/page.jsx

"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState("verifying");
  const [error, setError] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return; // prevents React Strict Mode's double-invoke in dev from double-consuming the token
    hasRun.current = true;

    if (!token) {
      setStatus("error");
      setError("Missing verification token.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStatus("success");
        else {
          setStatus("error");
          setError(data.error);
        }
      });
  }, [token]);

  return (
    <div className="bg-white p-8 rounded-lg shadow-md w-96 text-center">
      {status === "verifying" && (
        <p className="text-sm text-slate-500">Verifying your email...</p>
      )}
      {status === "success" && (
        <>
          <p className="text-green-700 font-medium mb-4">
            Your email has been verified!
          </p>
          <Link href="/login" className="text-sm text-blue-600 hover:underline">
            Go to login
          </Link>
        </>
      )}
      {status === "error" && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}
