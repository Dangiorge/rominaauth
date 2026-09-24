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
  FileEdit,
  Folder,
  ChevronRight,
  ArrowLeft,
  FileText,
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
  const [loading, setLoading] = useState(true);

  // Navigation states
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);

  // Verification states
  const [verifying, setVerifying] = useState(null);
  const [verifyResults, setVerifyResults] = useState({});

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        setDocuments(data.documents || []);
      } catch (err) {
        console.error("Failed to load documents", err);
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

  // Group documents by Category -> Subcategory
  const categoriesMap = {};
  documents.forEach((doc) => {
    const catId = doc.category?.id || "uncategorized";
    const catName = doc.category?.name || "General Documents";

    if (!categoriesMap[catId]) {
      categoriesMap[catId] = {
        id: catId,
        name: catName,
        subcategories: {},
        count: 0,
      };
    }

    categoriesMap[catId].count += 1;

    const subId = doc.subcategory?.id || "general";
    const subName = doc.subcategory?.name || "General Files";

    if (!categoriesMap[catId].subcategories[subId]) {
      categoriesMap[catId].subcategories[subId] = {
        id: subId,
        name: subName,
        documents: [],
      };
    }

    categoriesMap[catId].subcategories[subId].documents.push(doc);
  });

  const categories = Object.values(categoriesMap);

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSelectedSubcategory(null);
              }}
              className="hover:text-slate-800 font-medium"
            >
              Categories
            </button>
            {selectedCategory && (
              <>
                <ChevronRight size={14} />
                <button
                  onClick={() => setSelectedSubcategory(null)}
                  className="hover:text-slate-800 font-medium"
                >
                  {selectedCategory.name}
                </button>
              </>
            )}
            {selectedSubcategory && (
              <>
                <ChevronRight size={14} />
                <span className="text-slate-800 font-semibold">
                  {selectedSubcategory.name}
                </span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {selectedSubcategory
              ? selectedSubcategory.name
              : selectedCategory
                ? `Subcategories in ${selectedCategory.name}`
                : "Document Repository"}
          </h1>
        </div>

        <Link
          href="/documents/upload"
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium shadow"
        >
          <Plus size={16} /> Upload Document
        </Link>
      </div>

      {loading ? (
        <p className="text-slate-500">Loading document folders...</p>
      ) : documents.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow border border-slate-200 text-center text-slate-500">
          No documents available or you do not have view access to current
          records.
        </div>
      ) : (
        <>
          {/* LEVEL 1: CATEGORIES GRID */}
          {!selectedCategory && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat)}
                  className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 hover:border-slate-400 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Folder size={24} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-800">
                        {cat.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {Object.keys(cat.subcategories).length} subcategories ·{" "}
                        {cat.count} files
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-slate-400 group-hover:translate-x-1 transition-transform"
                  />
                </div>
              ))}
            </div>
          )}

          {/* LEVEL 2: SUBCATEGORIES GRID */}
          {selectedCategory && !selectedSubcategory && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                <ArrowLeft size={16} /> Back to Categories
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(selectedCategory.subcategories).map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub)}
                    className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 hover:border-slate-400 cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                        <Folder size={24} />
                      </div>
                      <div>
                        <h2 className="font-semibold text-slate-800">
                          {sub.name}
                        </h2>
                        <p className="text-xs text-slate-500">
                          {sub.documents.length} document
                          {sub.documents.length === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      size={18}
                      className="text-slate-400 group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LEVEL 3: DOCUMENTS TABLE INSIDE SUBCATEGORY */}
          {selectedSubcategory && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedSubcategory(null)}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 font-medium"
              >
                <ArrowLeft size={16} /> Back to Subcategories
              </button>

              <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left border-b bg-slate-50 text-slate-600">
                      <th className="py-3 px-4">Document Title</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Integrity</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedSubcategory.documents.map((doc) => {
                      const result = verifyResults[doc.id];
                      const perms = doc.user_permissions || {};

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText
                                size={16}
                                className="text-slate-400 shrink-0"
                              />
                              <div>
                                <div className="font-medium text-slate-800">
                                  {doc.title}
                                </div>
                                <div className="text-xs text-slate-400">
                                  {(doc.file_size / 1024).toFixed(0)} KB ·{" "}
                                  {doc.mime_type || "file"}
                                </div>
                              </div>
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
                                    <Loader2
                                      size={12}
                                      className="animate-spin"
                                    />
                                  )}
                                  Check Integrity
                                </button>
                              )
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {perms.view && (
                                <a
                                  href={`/api/documents/${doc.id}/download`}
                                  title="Download Document"
                                  className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded text-xs font-semibold"
                                >
                                  <Download size={14} /> Download
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
