// path: components/ui/LogoUploader.jsx

"use client";

import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";

export default function LogoUploader({
  scope,
  entityId,
  currentUrl,
  onUploaded,
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("scope", scope);
    formData.append("entityId", entityId);

    const res = await fetch("/api/system/upload-logo", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();

    setUploading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }
    onUploaded(data.logoUrl);
  }

  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">Logo</label>
      <div className="flex items-center gap-3">
        <div className="w-16 h-16 border rounded-md flex items-center justify-center bg-slate-50 overflow-hidden">
          {currentUrl ? (
            <img
              src={currentUrl}
              alt="Logo"
              className="w-full h-full object-contain"
            />
          ) : (
            <Upload size={20} className="text-slate-300" />
          )}
        </div>
        <label className="cursor-pointer text-sm text-blue-600 hover:underline">
          {uploading ? (
            <span className="flex items-center gap-1 text-slate-400">
              <Loader2 size={14} className="animate-spin" /> Uploading...
            </span>
          ) : (
            "Upload image"
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      <p className="text-xs text-slate-400 mt-1">
        PNG, JPEG, WEBP, or SVG. Max 2MB.
      </p>
    </div>
  );
}
