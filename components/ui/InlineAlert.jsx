// path: components/ui/InlineAlert.jsx

"use client";

export default function InlineAlert({ type = "error", message }) {
  if (!message) return null;
  const styles =
    type === "error"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-green-50 border-green-200 text-green-700";
  return (
    <div className={`border text-sm rounded-md px-4 py-3 mb-4 ${styles}`}>
      {message}
    </div>
  );
}
