// path: app/(dashboard)/inventory/transfers/page.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function TransfersListPage() {
  const [transfers, setTransfers] = useState([]);

  useEffect(() => {
    fetch("/api/inventory/transfers")
      .then((r) => r.json())
      .then((d) => setTransfers(d.transfers || []));
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Internal Transfers</h1>
        <Link
          href="/inventory/transfers/create"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-md text-sm"
        >
          <Plus size={16} /> New Transfer
        </Link>
      </div>
      <table className="w-full text-sm border-collapse bg-white rounded-lg overflow-hidden">
        <thead>
          <tr className="text-left border-b bg-slate-50">
            <th className="py-3 px-4">Transfer #</th>
            <th>From</th>
            <th>To</th>
            <th>Lines</th>
            <th>By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id} className="border-b last:border-0">
              <td className="py-3 px-4 font-mono text-xs">
                {t.transfer_number}
              </td>
              <td className="text-xs">{t.fromStore?.name}</td>
              <td className="text-xs">{t.toStore?.name}</td>
              <td className="text-xs">{t._count?.lines}</td>
              <td className="text-xs">{t.creator?.full_name}</td>
              <td className="text-xs">
                {new Date(t.transfer_date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
