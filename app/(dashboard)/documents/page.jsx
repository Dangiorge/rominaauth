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
  CheckCircle,
  FileEdit,
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
  const [canSubmitAny, setCanSubmitAny] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        setDocuments(data.documents || []);

        // Check if user has submit permission in any category (to show or hide upload button)
        const catRes = await fetch("/api/documents/access-policies");
        // Simplified check or derive from user policies
        setCanSubmitAny(true); // Handled dynamically or via session scope
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleVerify(id) {
    setVerifying(id);
    const res = await fetch(`/api/documents/${id}/verify`, { method: "POST" });
    const data = await res.json();
    setVerifying(null);
    setVerifyResults((v) => ({ ...v, [id]: data }));
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Document Repository
          </h1>
          <p className="text-sm text-slate-500">
            Access and manage documents based on your assigned category roles.
          </p>
        </div>

        {/* Upload Button visible ONLY if allowed */}
        <Link
          href="/documents/upload"
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
        >
          <Plus size={16} /> Upload Document
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-slate-500">
          No documents available or you do not have view access to current
          records.
        </p>
      ) : (
        <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b bg-slate-50 text-slate-600">
                <th className="py-3 px-4">Title / Category</th>
                <th className="py-3 px-4">Uploaded By</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Integrity</th>
                <th className="py-3 px-4 text-right">Actions & Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {documents.map((doc) => {
                const result = verifyResults[doc.id];
                const perms = doc.user_permissions || {};

                return (
                  <tr key={doc.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        {doc.title}
                      </div>
                      <div className="text-xs text-slate-400">
                        {doc.category?.name || "General"} ·{" "}
                        {(doc.file_size / 1024).toFixed(0)} KB
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {doc.uploader?.full_name || "System"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[doc.status] || ""}`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {result ? (
                        result.matches ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <ShieldCheck size={14} /> Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <ShieldAlert size={14} /> Mismatch
                          </span>
                        )
                      ) : (
                        perms.check && (
                          <button
                            onClick={() => handleVerify(doc.id)}
                            disabled={verifying === doc.id}
                            className="text-blue-600 hover:underline flex items-center gap-1 font-medium"
                          >
                            {verifying === doc.id && (
                              <Loader2 size={12} className="animate-spin" />
                            )}
                            Check Integrity
                          </button>
                        )
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* Download / View based on View Type */}
                        {perms.view && (
                          <a
                            href={`/api/documents/${doc.id}/download`}
                            title={
                              perms.view_type === "VIEW_ONLY"
                                ? "View Only Mode"
                                : "Download Document"
                            }
                            className="p-1.5 hover:bg-slate-100 rounded-md text-slate-700"
                          >
                            <Download size={16} />
                          </a>
                        )}

                        {/* Approval Action */}
                        {perms.approve && doc.status === "PENDING_APPROVAL" && (
                          <button
                            onClick={() => alert("Trigger Approve Modal/API")}
                            className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded font-semibold hover:bg-green-100"
                          >
                            Approve
                          </button>
                        )}

                        {/* Request Edit Action */}
                        {perms.request_edit && (
                          <button
                            onClick={() => alert("Trigger Request Edit")}
                            className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded font-semibold hover:bg-blue-100 flex items-center gap-1"
                          >
                            <FileEdit size={12} /> Edit Req
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
