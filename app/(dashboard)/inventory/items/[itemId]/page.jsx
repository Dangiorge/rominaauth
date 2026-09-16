// path: app/(dashboard)/inventory/items/[itemId]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ItemForm from "@/components/items/ItemForm";
import InlineAlert from "@/components/ui/InlineAlert";
import LogoUploader from "@/components/ui/LogoUploader";

export default function EditItemPage() {
  const { itemId } = useParams();
  const router = useRouter();
  const [item, setItem] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function loadItem() {
    fetch(`/api/inventory/items/${itemId}`)
      .then((r) => r.json())
      .then((d) => setItem(d.item));
  }

  useEffect(() => {
    loadItem();
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []));
  }, [itemId]);

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

  async function handleSubmit(form) {
    const res = await fetch(`/api/inventory/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      flash(data.error, "error");
      return;
    }
    flash("Item updated.");
    loadItem();
  }

  if (!item || companies.length === 0) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <button
        onClick={() => router.push("/inventory/items")}
        className="text-sm text-slate-500"
      >
        ← Back to catalog
      </button>
      <h1 className="text-2xl font-bold">Edit {item.name}</h1>

      <InlineAlert type="error" message={error} />
      <InlineAlert type="success" message={success} />

      <div className="bg-white border rounded-lg p-6">
        <LogoUploader
          scope="item"
          entityId={item.id}
          currentUrl={item.image_url}
          onUploaded={async (url) => {
            await fetch("/api/inventory/items/upload-image-noop", {
              method: "HEAD",
            }).catch(() => {}); // no-op guard, real upload already happened
            setItem({ ...item, image_url: url });
          }}
        />
      </div>

      <ItemForm
        initialItem={item}
        companies={companies}
        onSubmit={handleSubmit}
        submitLabel="Save Changes"
      />

      <BrandVisibilityPanel
        itemId={item.id}
        companyId={item.company_id}
        onSaved={() => flash("Brand visibility updated.")}
        onError={(msg) => flash(msg, "error")}
      />
    </div>
  );
}

function BrandVisibilityPanel({ itemId, companyId, onSaved, onError }) {
  const [brands, setBrands] = useState([]);
  const [isRestricted, setIsRestricted] = useState(false);
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);

  useEffect(() => {
    fetch("/api/system/brands")
      .then((r) => r.json())
      .then((d) =>
        setBrands((d.brands || []).filter((b) => b.company_id === companyId)),
      );
    fetch(`/api/inventory/items/${itemId}/brand-visibility`)
      .then((r) => r.json())
      .then((d) => {
        setIsRestricted(d.isRestricted);
        setSelectedBrandIds(d.restrictedToBrandIds || []);
      });
  }, [itemId, companyId]);

  function toggleBrand(id) {
    setSelectedBrandIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  async function handleSave() {
    const res = await fetch(`/api/inventory/items/${itemId}/brand-visibility`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isRestricted, brandIds: selectedBrandIds }),
    });
    const data = await res.json();
    if (!res.ok) {
      onError(data.error);
      return;
    }
    onSaved();
  }

  return (
    <div className="bg-white border rounded-lg p-6">
      <h2 className="font-semibold mb-1">Brand Availability</h2>
      <p className="text-xs text-slate-400 mb-3">
        By default, every brand under this company can use this item. Restrict
        it to specific brands only if needed.
      </p>

      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!isRestricted}
            onChange={() => setIsRestricted(false)}
          />
          Available to All Brands
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={isRestricted}
            onChange={() => setIsRestricted(true)}
          />
          Restrict to Specific Brands
        </label>
      </div>

      {isRestricted && (
        <div className="border rounded-md p-3 space-y-1 mb-3">
          {brands.map((b) => (
            <label key={b.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedBrandIds.includes(b.id)}
                onChange={() => toggleBrand(b.id)}
              />
              {b.name}
            </label>
          ))}
        </div>
      )}

      <button
        onClick={handleSave}
        className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
      >
        Save
      </button>
    </div>
  );
}
