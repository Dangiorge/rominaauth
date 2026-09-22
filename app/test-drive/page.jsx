"use client";

import { useState } from "react";

export default function TestDrivePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function testConnection() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/test-drive");
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, error: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-xl mx-auto font-sans">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">
        Google Drive OAuth Test
      </h1>
      <p className="text-slate-600 mb-6 text-sm">
        Click the button below to test your OAuth 2.0 refresh token connection
        with Google Drive.
      </p>

      <button
        onClick={testConnection}
        disabled={loading}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {loading ? "Testing Connection..." : "Test Google Drive API"}
      </button>

      {result && (
        <div
          className={`mt-6 p-4 rounded-lg border text-sm ${
            result.success
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
