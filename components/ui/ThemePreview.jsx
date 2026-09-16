// path: components/ui/ThemePreview.jsx

"use client";

export default function ThemePreview({
  primary,
  secondary,
  accent,
  logoUrl,
  name,
}) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-2">
        Sidebar Preview
      </label>
      <div className="border rounded-lg overflow-hidden w-56">
        <div
          className="p-4 text-white"
          style={{ backgroundColor: primary || "#0f172a" }}
        >
          <div className="flex items-center gap-2 mb-4">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="w-6 h-6 object-contain rounded bg-white/10"
              />
            ) : (
              <div className="w-6 h-6 rounded bg-white/20" />
            )}
            <span className="text-sm font-semibold truncate">
              {name || "Preview"}
            </span>
          </div>
          <div className="space-y-1.5">
            <div
              className="text-xs px-2 py-1.5 rounded"
              style={{ backgroundColor: accent || "#3b82f6" }}
            >
              Active menu item
            </div>
            <div
              className="text-xs px-2 py-1.5 rounded"
              style={{ color: secondary || "#94a3b8" }}
            >
              Inactive menu item
            </div>
            <div
              className="text-xs px-2 py-1.5 rounded"
              style={{ color: secondary || "#94a3b8" }}
            >
              Another item
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
