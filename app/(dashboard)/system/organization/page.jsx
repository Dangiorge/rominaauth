// path: app/(dashboard)/system/organization/page.jsx

"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Tag,
  MapPin,
} from "lucide-react";
import InlineAlert from "@/components/ui/InlineAlert";
import ColorPicker from "@/components/ui/ColorPicker";
import LogoUploader from "@/components/ui/LogoUploader";
import ThemePreview from "@/components/ui/ThemePreview";

export default function OrganizationPage() {
  const [companies, setCompanies] = useState([]);
  const [brands, setBrands] = useState([]);
  const [branches, setBranches] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState(null);

  function loadAll() {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []));
    fetch("/api/system/brands")
      .then((r) => r.json())
      .then((d) => setBrands(d.brands || []));
    fetch("/api/system/branches")
      .then((r) => r.json())
      .then((d) => setBranches(d.branches || []));
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggle(id) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  }

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

  async function handleDelete(type, id, endpoint) {
    if (
      !confirm(
        `Delete this ${type}? This cannot be undone if there are no dependents.`,
      )
    )
      return;
    const res = await fetch(endpoint, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash(`${type[0].toUpperCase() + type.slice(1)} deleted.`);
    loadAll();
  }

  const brandsFor = (companyId) =>
    brands.filter((b) => b.company_id === companyId);
  const branchesFor = (brandId) =>
    branches.filter((b) => b.brand_id === brandId);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Organization Structure</h1>
        <button
          onClick={() => setModal({ type: "company", mode: "create" })}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> New Company
        </button>
      </div>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <div className="bg-white border rounded-lg divide-y">
        {companies.length === 0 && (
          <div className="p-6 text-sm text-slate-400">
            No companies yet. Create one to get started.
          </div>
        )}
        {companies.map((company) => (
          <div key={company.id}>
            <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50">
              <button
                onClick={() => toggle(company.id)}
                className="flex items-center gap-2 flex-1 text-left"
              >
                {expanded[company.id] ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt=""
                    className="w-5 h-5 object-contain rounded"
                  />
                ) : (
                  <Building2 size={16} className="text-slate-500" />
                )}
                <span className="font-medium">{company.name}</span>
                <span className="text-xs text-slate-400">({company.code})</span>
                <span
                  className="inline-block w-3 h-3 rounded-full border"
                  style={{ backgroundColor: company.primary_color }}
                  title="Theme color"
                />
                {!company.is_active && (
                  <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    Inactive
                  </span>
                )}
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() =>
                    setModal({
                      type: "brand",
                      mode: "create",
                      companyId: company.id,
                    })
                  }
                  className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded-md"
                >
                  + Brand
                </button>
                <button
                  onClick={() =>
                    setModal({ type: "company", mode: "edit", data: company })
                  }
                  className="p-1.5 hover:bg-slate-100 rounded-md"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() =>
                    handleDelete(
                      "company",
                      company.id,
                      `/api/system/companies/${company.id}`,
                    )
                  }
                  className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {expanded[company.id] && (
              <div className="pl-8 pb-2">
                {brandsFor(company.id).length === 0 && (
                  <div className="text-xs text-slate-400 px-4 py-2">
                    No brands under this company.
                  </div>
                )}
                {brandsFor(company.id).map((brand) => (
                  <div key={brand.id} className="border-l pl-4 ml-2">
                    <div className="flex items-center justify-between px-2 py-2 hover:bg-slate-50 rounded-md">
                      <button
                        onClick={() => toggle(`brand-${brand.id}`)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {expanded[`brand-${brand.id}`] ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt=""
                            className="w-4 h-4 object-contain rounded"
                          />
                        ) : (
                          <Tag size={14} className="text-slate-500" />
                        )}
                        <span className="text-sm font-medium">
                          {brand.name}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({brand.slug})
                        </span>
                        {brand.uses_custom_theme && (
                          <span
                            className="inline-block w-3 h-3 rounded-full border"
                            style={{ backgroundColor: brand.primary_color }}
                            title="Custom theme"
                          />
                        )}
                        {!brand.is_active && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={() =>
                            setModal({
                              type: "branch",
                              mode: "create",
                              brandId: brand.id,
                            })
                          }
                          className="text-xs text-blue-600 px-2 py-1 hover:bg-blue-50 rounded-md"
                        >
                          + Branch
                        </button>
                        <button
                          onClick={() =>
                            setModal({
                              type: "brand",
                              mode: "edit",
                              data: brand,
                            })
                          }
                          className="p-1.5 hover:bg-slate-100 rounded-md"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(
                              "brand",
                              brand.id,
                              `/api/system/brands/${brand.id}`,
                            )
                          }
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded-md"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {expanded[`brand-${brand.id}`] && (
                      <div className="pl-8 pb-2">
                        {branchesFor(brand.id).length === 0 && (
                          <div className="text-xs text-slate-400 px-2 py-2">
                            No branches under this brand.
                          </div>
                        )}
                        {branchesFor(brand.id).map((branch) => (
                          <div
                            key={branch.id}
                            className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-md"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin size={13} className="text-slate-400" />
                              <span className="text-sm">{branch.name}</span>
                              <span className="text-xs text-slate-400">
                                ({branch.code}
                                {branch.city ? `, ${branch.city}` : ""})
                              </span>
                              {!branch.is_active && (
                                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  setModal({
                                    type: "branch",
                                    mode: "edit",
                                    data: branch,
                                  })
                                }
                                className="p-1.5 hover:bg-slate-100 rounded-md"
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(
                                    "branch",
                                    branch.id,
                                    `/api/system/branches/${branch.id}`,
                                  )
                                }
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
        <OrgModal
          modal={modal}
          companies={companies}
          brands={brands}
          onClose={() => setModal(null)}
          onSaved={(msg) => {
            flash(msg);
            setModal(null);
            loadAll();
          }}
          onError={(msg) => flash(msg, "error")}
        />
      )}
    </div>
  );
}

function OrgModal({ modal, companies, brands, onClose, onSaved, onError }) {
  const isEdit = modal.mode === "edit";
  const [form, setForm] = useState(() => {
    if (isEdit) return { ...modal.data };
    if (modal.type === "brand")
      return {
        name: "",
        slug: "",
        company_id: modal.companyId,
        uses_custom_theme: false,
        primary_color: "#0f172a",
        secondary_color: "#94a3b8",
        accent_color: "#3b82f6",
      };
    if (modal.type === "branch")
      return { name: "", code: "", city: "", brand_id: modal.brandId };
    return {
      name: "",
      code: "",
      primary_color: "#0f172a",
      secondary_color: "#94a3b8",
      accent_color: "#3b82f6",
    };
  });

  const titleMap = { company: "Company", brand: "Brand", branch: "Branch" };

  async function handleSubmit(e) {
    e.preventDefault();
    let url;
    if (modal.type === "company")
      url = isEdit
        ? `/api/system/companies/${form.id}`
        : "/api/system/companies";
    else if (modal.type === "brand")
      url = isEdit ? `/api/system/brands/${form.id}` : "/api/system/brands";
    else
      url = isEdit ? `/api/system/branches/${form.id}` : "/api/system/branches";

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
    onSaved(`${titleMap[modal.type]} ${isEdit ? "updated" : "created"}.`);
  }

  const inputField = (key, label, placeholder = "") => (
    <div>
      <label className="text-xs text-slate-500 block mb-1">{label}</label>
      <input
        value={form[key] || ""}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        placeholder={placeholder}
        className="w-full border rounded-md px-3 py-2"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl my-8">
        <h2 className="text-lg font-semibold mb-4">
          {isEdit ? "Edit" : "New"} {titleMap[modal.type]}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 max-h-[75vh] overflow-y-auto pr-1"
        >
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            {inputField("name", "Name")}
            {modal.type === "company" && inputField("code", "Code (e.g. ROM)")}
            {modal.type === "brand" && (
              <>
                {inputField("slug", "Slug (e.g. koba-pastry)")}
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Company
                  </label>
                  <select
                    value={form.company_id || ""}
                    onChange={(e) =>
                      setForm({ ...form, company_id: Number(e.target.value) })
                    }
                    className="w-full border rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select company</option>
                    {companies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            {modal.type === "branch" && (
              <>
                {inputField("code", "Code (e.g. ATL)")}
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Brand
                  </label>
                  <select
                    value={form.brand_id || ""}
                    onChange={(e) =>
                      setForm({ ...form, brand_id: Number(e.target.value) })
                    }
                    className="w-full border rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select brand</option>
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
              Contact
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {inputField("email", "Email")}
              {inputField("phone", "Phone")}
              {modal.type === "company" && inputField("website", "Website")}
              {modal.type === "company" &&
                inputField("tax_id", "Tax / Registration ID")}
              {modal.type === "branch" &&
                inputField("manager_name", "Branch Manager")}
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
              Address
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {inputField("address_line1", "Address Line 1")}
              {inputField("address_line2", "Address Line 2")}
              {inputField("city", "City")}
              {inputField("region", "Region / State")}
              {inputField("country", "Country")}
              {inputField("postal_code", "Postal Code")}
            </div>
          </div>

          {/* Branding — only for companies and brands */}
          {(modal.type === "company" || modal.type === "brand") && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase mb-2">
                Branding
              </h3>

              {modal.type === "brand" && (
                <label className="flex items-center gap-2 text-sm mb-3">
                  <input
                    type="checkbox"
                    checked={form.uses_custom_theme || false}
                    onChange={(e) =>
                      setForm({ ...form, uses_custom_theme: e.target.checked })
                    }
                  />
                  Use a custom theme for this brand (otherwise it inherits the
                  parent company&apos;s colors)
                </label>
              )}

              {(modal.type === "company" || form.uses_custom_theme) && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <ColorPicker
                    label="Primary"
                    value={form.primary_color}
                    onChange={(v) => setForm({ ...form, primary_color: v })}
                  />
                  <ColorPicker
                    label="Secondary"
                    value={form.secondary_color}
                    onChange={(v) => setForm({ ...form, secondary_color: v })}
                  />
                  <ColorPicker
                    label="Accent"
                    value={form.accent_color}
                    onChange={(v) => setForm({ ...form, accent_color: v })}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {isEdit ? (
                  <LogoUploader
                    scope={modal.type}
                    entityId={form.id}
                    currentUrl={form.logo_url}
                    onUploaded={(url) => setForm({ ...form, logo_url: url })}
                  />
                ) : (
                  <p className="text-xs text-slate-400">
                    Save this {modal.type} first, then edit it to upload a logo.
                  </p>
                )}

                <ThemePreview
                  name={form.name}
                  logoUrl={form.logo_url}
                  primary={
                    modal.type === "company" || form.uses_custom_theme
                      ? form.primary_color
                      : companies.find((c) => c.id === form.company_id)
                          ?.primary_color
                  }
                  secondary={
                    modal.type === "company" || form.uses_custom_theme
                      ? form.secondary_color
                      : companies.find((c) => c.id === form.company_id)
                          ?.secondary_color
                  }
                  accent={
                    modal.type === "company" || form.uses_custom_theme
                      ? form.accent_color
                      : companies.find((c) => c.id === form.company_id)
                          ?.accent_color
                  }
                />
              </div>
            </div>
          )}

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

          <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-white">
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
