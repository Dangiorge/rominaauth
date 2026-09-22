// path: app/(dashboard)/settings/google-drive/page.jsx

"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function GoogleDrivePage() {
  const [form, setForm] = useState({
    client_email: "",
    private_key: "",
    project_id: "",
    shared_drive_id: "",
  });
  const [hasKey, setHasKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [savedTestResult, setSavedTestResult] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/settings/google-drive")
      .then((r) => r.json())
      .then((d) => {
        if (d.config) {
          setForm({
            client_email: d.config.client_email,
            private_key: "",
            project_id: d.config.project_id,
            shared_drive_id: d.config.shared_drive_id || "",
          });
          setHasKey(d.config.has_private_key);
        }
      });
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    const payload = { ...form };
    if (!payload.private_key && hasKey) delete payload.private_key; // don't overwrite with blank if unchanged
    const res = await fetch("/api/settings/google-drive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setHasKey(true);
    setForm((f) => ({ ...f, private_key: "" }));
    setNotice("Google Drive configuration saved securely.");
  }

  async function handleTest(useSavedConfig = false) {
    setError("");
    setNotice("");
    setTesting(true);
    if (useSavedConfig) setSavedTestResult(null);
    else setTestResult(null);
    const res = await fetch("/api/settings/google-drive/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        useSavedConfig ? { use_saved_config: true } : form,
      ),
    });
    const data = await res.json();
    setTesting(false);
    if (useSavedConfig) setSavedTestResult(data);
    else setTestResult(data);
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Google Drive Connection</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {notice && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3 mb-4">
          {notice}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="bg-white border rounded-lg p-6 space-y-4"
      >
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Service Account Email
          </label>
          <input
            value={form.client_email}
            onChange={(e) => setForm({ ...form, client_email: e.target.value })}
            placeholder="xxx@project.iam.gserviceaccount.com"
            className="w-full border rounded-md px-3 py-2 font-mono text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Private Key{" "}
            {hasKey && (
              <span className="text-green-600">
                (already saved — leave blank to keep it)
              </span>
            )}
          </label>
          <textarea
            value={form.private_key}
            onChange={(e) => setForm({ ...form, private_key: e.target.value })}
            placeholder={
              hasKey
                ? "••••••••••••••"
                : "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
            }
            rows={5}
            className="w-full border rounded-md px-3 py-2 font-mono text-xs"
            required={!hasKey}
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Project ID
          </label>
          <input
            value={form.project_id}
            onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            className="w-full border rounded-md px-3 py-2 font-mono text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">
            Destination Folder URL or Shared Drive ID
          </label>
          <input
            value={form.shared_drive_id}
            onChange={(e) =>
              setForm({ ...form, shared_drive_id: e.target.value })
            }
            className="w-full border rounded-md px-3 py-2 font-mono text-sm"
            placeholder="https://drive.google.com/drive/folders/..."
          />
          <p className="text-xs text-slate-500 mt-1">
            Paste a folder URL to test the exact upload destination. Use a Shared
            Drive ID only when you want to test the whole Shared Drive.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Configuration"}
        </button>
      </form>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => handleTest(false)}
          disabled={
            testing ||
            !form.client_email.trim() ||
            !form.project_id.trim() ||
            (!form.private_key.trim() && !hasKey)
          }
          className="flex items-center gap-2 bg-white border px-4 py-2 rounded-md text-sm disabled:opacity-50"
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : null}
          Test Current Form (does not save)
        </button>

        {testResult && (
          <div
            className={`mt-3 flex items-start gap-2 text-sm rounded-md px-4 py-3 ${testResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}
          >
            {testResult.success ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {hasKey && (
          <button
            type="button"
            onClick={() => handleTest(true)}
            disabled={testing}
            className="mt-3 flex items-center gap-2 text-slate-700 underline text-sm disabled:opacity-50"
          >
            Test Last Saved Configuration
          </button>
        )}

        {savedTestResult && (
          <div
            className={`mt-3 flex items-start gap-2 text-sm rounded-md px-4 py-3 ${savedTestResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}
          >
            {savedTestResult.success ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0" />
            )}
            <span>{savedTestResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
