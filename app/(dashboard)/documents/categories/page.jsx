// path: app/documents/categories/page.jsx

"use client";

import { useState, useEffect } from "react";

export default function CategoryManagementPage() {
  const [categories, setCategories] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form states
  const [catForm, setCatForm] = useState({
    company_id: "",
    name: "",
    code: "",
    description: "",
  });
  const [subForm, setSubForm] = useState({
    category_id: "",
    name: "",
    code: "",
    description: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [catRes, compRes] = await Promise.all([
        fetch("/api/documents/categories"),
        fetch("/api/metadata/organization"),
      ]);
      const catData = await catRes.json();
      const compData = await compRes.json();

      if (catData.categories) setCategories(catData.categories);
      if (compData.companies) setCompanies(compData.companies);
    } catch (err) {
      setError("Failed to load management data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const res = await fetch("/api/documents/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(catForm),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setSuccessMsg("Category created successfully!");
      setCatForm({ company_id: "", name: "", code: "", description: "" });
      fetchData();
    }
  };

  const handleCreateSubcategory = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const res = await fetch("/api/documents/subcategories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subForm),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setSuccessMsg("Subcategory created successfully!");
      setSubForm({ category_id: "", name: "", code: "", description: "" });
      fetchData();
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    setError(null);
    setSuccessMsg(null);

    const res = await fetch(`/api/documents/categories/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setSuccessMsg(data.message);
      fetchData();
    }
  };

  const handleDeleteSubcategory = async (id) => {
    if (!confirm("Are you sure you want to delete this subcategory?")) return;
    setError(null);
    setSuccessMsg(null);

    const res = await fetch(`/api/documents/subcategories/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) setError(data.error);
    else {
      setSuccessMsg(data.message);
      fetchData();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">
        Document Categories & Subcategories
      </h1>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-md border border-red-200">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-green-100 text-green-700 rounded-md border border-green-200">
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Category Form */}
        <form
          onSubmit={handleCreateCategory}
          className="bg-white p-6 shadow rounded-lg space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-700">
            Add New Category
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Company
            </label>
            <select
              required
              className="mt-1 w-full border rounded p-2 border-slate-300"
              value={catForm.company_id}
              onChange={(e) =>
                setCatForm({ ...catForm, company_id: e.target.value })
              }
            >
              <option value="">Select Company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Name
            </label>
            <input
              type="text"
              required
              className="mt-1 w-full border rounded p-2 border-slate-300"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Code
            </label>
            <input
              type="text"
              className="mt-1 w-full border rounded p-2 border-slate-300"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
          >
            Create Category
          </button>
        </form>

        {/* Create Subcategory Form */}
        <form
          onSubmit={handleCreateSubcategory}
          className="bg-white p-6 shadow rounded-lg space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-700">
            Add New Subcategory
          </h2>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Parent Category
            </label>
            <select
              required
              className="mt-1 w-full border rounded p-2 border-slate-300"
              value={subForm.category_id}
              onChange={(e) =>
                setSubForm({ ...subForm, category_id: e.target.value })
              }
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Name
            </label>
            <input
              type="text"
              required
              className="mt-1 w-full border rounded p-2 border-slate-300"
              value={subForm.name}
              onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600">
              Code
            </label>
            <input
              type="text"
              className="mt-1 w-full border rounded p-2 border-slate-300"
              value={subForm.code}
              onChange={(e) => setSubForm({ ...subForm, code: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-emerald-600 text-white p-2 rounded hover:bg-emerald-700"
          >
            Create Subcategory
          </button>
        </form>
      </div>

      {/* Category & Subcategory List View */}
      <div className="bg-white p-6 shadow rounded-lg">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">
          Existing Categories & Subcategories
        </h2>
        {loading ? (
          <p>Loading...</p>
        ) : categories.length === 0 ? (
          <p className="text-slate-500">No categories found.</p>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="border border-slate-200 rounded-lg p-4 space-y-2"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-800">{cat.name}</span>{" "}
                    {cat.code && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        ({cat.code})
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="text-sm bg-red-50 text-red-600 px-3 py-1 rounded hover:bg-red-100"
                  >
                    Delete Category
                  </button>
                </div>

                {/* Subcategories nested list */}
                <div className="pl-6 pt-2 border-t border-slate-100 space-y-2">
                  {cat.subcategories && cat.subcategories.length > 0 ? (
                    cat.subcategories.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex justify-between items-center text-sm text-slate-600"
                      >
                        <span>
                          ↳ {sub.name} {sub.code && `(${sub.code})`}
                        </span>
                        <button
                          onClick={() => handleDeleteSubcategory(sub.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Delete Subcategory
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      No subcategories
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
