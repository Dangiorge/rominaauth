// path: app/(dashboard)/inventory/items/create/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ItemForm from "@/components/items/ItemForm";
import InlineAlert from "@/components/ui/InlineAlert";

export default function CreateItemPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/system/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []));
  }, []);

  async function handleSubmit(form) {
    setError("");
    const res = await fetch("/api/inventory/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    router.push(`/inventory/items/${data.item.id}`);
  }

  if (companies.length === 0) return <div>Loading...</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">New Item</h1>
      <InlineAlert type="error" message={error} />
      <ItemForm
        companies={companies}
        onSubmit={handleSubmit}
        submitLabel="Create Item"
      />
    </div>
  );
}
