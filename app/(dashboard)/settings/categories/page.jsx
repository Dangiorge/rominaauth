// path: app/(dashboard)/settings/categories/page.jsx

"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Layers,
  Folder,
  FolderOpen,
} from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";

export default function CategoriesPage() {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [categories, setCategories] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => {
        setCompanies(d.companies || []);
        if (d.companies?.length) setCompanyId(String(d.companies[0].id));
      });
  }, []);

  function loadCategories() {
    if (!companyId) return;
    fetch(`/api/settings/categories?companyId=${companyId}`)
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []));
  }
  useEffect(() => {
    loadCategories();
  }, [companyId]);

  function flash(msg, type = "success") {
    if (type === "success") {
      setSuccess(msg);
      setError("");
    } else {
      setError(msg);
      setSuccess("");
    }
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 4000);
  }

  function toggle(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

  async function handleDelete(cat) {
    if (!confirm(`Delete "${cat.name}"?`)) return;
    const res = await fetch(`/api/settings/categories/${cat.id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Category deleted.");
    loadCategories();
  }

  const segments = categories.filter((c) => c.level === "segment");
  const categoriesOf = (segId) =>
    categories.filter((c) => c.level === "category" && c.parent_id === segId);
  const subcategoriesOf = (catId) =>
    categories.filter(
      (c) => c.level === "subcategory" && c.parent_id === catId,
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Item Categories</h1>
        <div className="flex items-center gap-3">
          <select
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setModal({ mode: "create", level: "segment" })}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
          >
            <Plus size={16} /> New Segment
          </button>
        </div>
      </div>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <div className="bg-white border rounded-lg divide-y">
        {segments.length === 0 && (
          <div className="p-6 text-sm text-slate-400">
            No segments yet for this company.
          </div>
        )}
        {segments.map((seg) => (
          <div key={seg.id}>
            <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <button
                onClick={() => toggle(seg.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expanded[seg.id] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <Layers size={16} className="text-slate-500" />
                <span className="font-medium">{seg.name}</span>
                <span className="text-xs text-slate-400">({seg.code})</span>
                {!seg.is_active && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    Inactive
                  </span>
                )}
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setModal({
                      mode: "create",
                      level: "category",
                      parent_id: seg.id,
                    })
                  }
                  className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded-md"
                >
                  + Category
                </button>
                <button
                  onClick={() => setModal({ mode: "edit", data: seg })}
                  className="p-1.5 hover:bg-slate-100 rounded-md"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(seg)}
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expanded[seg.id] && (
              <div className="pl-8 pb-2">
                {categoriesOf(seg.id).length === 0 && (
                  <div className="text-xs text-slate-400 px-4 py-2">
                    No categories under this segment.
                  </div>
                )}
                {categoriesOf(seg.id).map((cat) => (
                  <div key={cat.id} className="border-l pl-4 ml-2">
                    <div className="flex items-center justify-between px-2 py-2 hover:bg-slate-50 rounded-md">
                      <button
                        onClick={() => toggle(`cat-${cat.id}`)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {expanded[`cat-${cat.id}`] ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        <Folder size={14} className="text-slate-500" />
                        <span className="text-sm font-medium">{cat.name}</span>
                        <span className="text-xs text-slate-400">
                          ({cat.code})
                        </span>
                        {!cat.is_active && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setModal({
                              mode: "create",
                              level: "subcategory",
                              parent_id: cat.id,
                            })
                          }
                          className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded-md"
                        >
                          + Sub-category
                        </button>
                        <button
                          onClick={() => setModal({ mode: "edit", data: cat })}
                          className="p-1.5 hover:bg-slate-100 rounded-md"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(cat)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {expanded[`cat-${cat.id}`] && (
                      <div className="pl-8 pb-2">
                        {subcategoriesOf(cat.id).length === 0 && (
                          <div className="text-xs text-slate-400 px-2 py-2">
                            No sub-categories yet.
                          </div>
                        )}
                        {subcategoriesOf(cat.id).map((sub) => (
                          <div
                            key={sub.id}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <FolderOpen
                                size={13}
                                className="text-slate-400"
                              />
                              <span className="text-sm">{sub.name}</span>
                              <span className="text-xs text-slate-400">
                                ({sub.code})
                              </span>
                              {!sub.is_active && (
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  setModal({ mode: "edit", data: sub })
                                }
                                className="p-1.5 hover:bg-slate-100 rounded-md"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => handleDelete(sub)}
                                className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {modal && (
        <CategoryModal
          modal={modal}
          companyId={companyId}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            flash(msg);
            setModal(null);
            loadCategories();
          }}
          onError={(msg) => flash(msg, "error")}
        />
      )}
    </div>
  );
}

function CategoryModal({ modal, companyId, onClose, onSaved, onError }) {
  const isEdit = modal.mode === "edit";
  const [form, setForm] = useState(() =>
    isEdit
      ? { ...modal.data }
      : {
          name: "",
          code: "",
          level: modal.level,
          parent_id: modal.parent_id || null,
          company_id: Number(companyId),
        },
  );

  async function handleSubmit(e) {
    e.preventDefault();
    const url = isEdit
      ? `/api/settings/categories/${form.id}`
      : "/api/settings/categories";
    const res = await fetch(url, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error);
      return;
    }
    onSaved(
      `${form.level[0].toUpperCase() + form.level.slice(1)} ${isEdit ? "updated" : "created"}.`,
    );
  }

  const levelLabel = {
    segment: "Segment",
    category: "Category",
    subcategory: "Sub-category",
  }[form.level];

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit" : "New"} {levelLabel}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            placeholder="Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <input
            placeholder="Code (e.g. BEV)"
            value={form.code || ""}
            onChange={(e) =>
              setForm({ ...form, code: e.target.value.toUpperCase() })
            }
            className="w-full border rounded-md px-3 py-2"
            required
          />
          {isEdit && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active ?? true}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active
            </label>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-slate-900 text-white"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
