// path: components/ui/ColorPicker.jsx

"use client";

export default function ColorPicker({ label, value, onChange }) {
  return (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded-md border cursor-pointer"
        />
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#0f172a"
          className="border rounded-md px-3 py-2 flex-1 text-sm font-mono"
        />
      </div>
    </div>
  );
}
