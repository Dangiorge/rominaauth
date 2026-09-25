// path: app/(dashboard)/inventory/grn/page.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function GrnListPage() {
  const [grns, setGrns] = useState([]);

  useEffect(() => {
    fetch("/api/inventory/grn")
      .then((r) => r.json())
      .then((d) => setGrns(d.grns || []));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Goods Receipt Notes</h1>
        <Link
          href="/inventory/grn/create"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> New GRN
        </Link>
      </div>
      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">GRN #</th>
            <th>Store</th>
            <th>Supplier</th>
            <th>Lines</th>
            <th>Received By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {grns.map((g) => (
            <tr key={g.id} className="border-b last:border-0">
              <td className="py-3 px-4 font-mono text-xs">{g.grn_number}</td>
              <td className="text-xs">{g.store?.name}</td>
              <td className="text-xs">{g.supplier_name || "—"}</td>
              <td className="text-xs">{g._count?.lines}</td>
              <td className="text-xs">{g.creator?.full_name}</td>
              <td className="text-xs">
                {new Date(g.received_date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
