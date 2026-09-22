// path: app/(dashboard)/documents/page.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Download,
  ShieldCheck,
  ShieldAlert,
  Loader2,
} from "lucide-react";

const STATUS_STYLES = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  EDIT_UNLOCKED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [verifying, setVerifying] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => setDocuments(d.documents || []));
  }, []);

  async function handleVerify(id) {
    setVerifying(id);
    const res = await fetch(`/api/documents/${id}/verify`, { method: "POST" });
    const data = await res.json();
    setVerifying(null);
    setVerifyResults((v) => ({ ...v, [id]: data }));
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Document Repository</h1>
        <Link
          href="/documents/upload"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> Upload Document
        </Link>
      </div>

      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Title</th>
            <th>Department</th>
            <th>Uploaded By</th>
            <th>Status</th>
            <th>Integrity</th>
            <th className="text-right px-4">Actions</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => {
            const result = verifyResults[doc.id];
            return (
              <tr key={doc.id} className="border-b last:border-0">
                <td className="py-3 px-4">
                  <div className="font-medium">{doc.title}</div>
                  <div className="text-xs text-slate-400">
                    {doc.mime_type} · {(doc.file_size / 1024).toFixed(0)} KB
                  </div>
                </td>
                <td className="text-xs">{doc.department?.name || "—"}</td>
                <td className="text-xs">{doc.uploader?.full_name}</td>
                <td>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[doc.status] || ""}`}
                  >
                    {doc.status}
                  </span>
                </td>
                <td className="text-xs">
                  {result ? (
                    result.matches ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <ShieldCheck size={14} /> Verified
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <ShieldAlert size={14} /> Mismatch
                      </span>
                    )
                  ) : (
                    <button
                      onClick={() => handleVerify(doc.id)}
                      disabled={verifying === doc.id}
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      {verifying === doc.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : null}{" "}
                      Check
                    </button>
                  )}
                </td>
                <td className="px-4">
                  <div className="flex justify-end">
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="p-1.5 hover:bg-slate-100 rounded-md"
                    >
                      <Download size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
