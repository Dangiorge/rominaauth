// path: app/(dashboard)/system/audit-logs/page.jsx

"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ACTION_COLORS = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  soft_delete: "bg-orange-100 text-orange-700",
  hard_delete: "bg-red-100 text-red-700",
};

function actionColor(action) {
  const key = Object.keys(ACTION_COLORS).find((k) => action.includes(k));
  return ACTION_COLORS[key] || "bg-slate-100 text-slate-600";
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState("");
  const [actorEmail, setActorEmail] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const pageSize = 25;

  function loadLogs() {
    const params = new URLSearchParams({ page: String(page) });
    if (entityType) params.set("entityType", entityType);
    if (actorEmail) params.set("actorEmail", actorEmail);

    fetch(`/api/system/audit-logs?${params}`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      });
  }

  useEffect(() => {
    loadLogs();
  }, [page, entityType, actorEmail]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Audit Log</h1>

      <div className="flex gap-3 mb-4">
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="">All entity types</option>
          <option value="user">Users</option>
          <option value="role">Roles</option>
          <option value="path">Paths</option>
          <option value="permission">Permissions</option>
          <option value="company">Companies</option>
          <option value="brand">Brands</option>
          <option value="branch">Branches</option>
          <option value="department">Departments</option>
        </select>
        <input
          placeholder="Filter by actor email"
          value={actorEmail}
          onChange={(e) => {
            setActorEmail(e.target.value);
            setPage(1);
          }}
          className="border rounded-md px-3 py-2 text-sm flex-1"
        />
      </div>

      <div className="bg-white border rounded-lg divide-y">
        {logs.length === 0 && (
          <div className="p-6 text-sm text-slate-400">
            No audit entries found.
          </div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-3">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() =>
                setExpandedId(expandedId === log.id ? null : log.id)
              }
            >
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${actionColor(log.action)}`}
                >
                  {log.action}
                </span>
                <span className="text-sm text-slate-700">
                  {log.actor_email || "System"}
                </span>
                <span className="text-sm text-slate-400">
                  on {log.entity_type} #{log.entity_id}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>

            {expandedId === log.id && (
              <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                {log.before_data && (
                  <div>
                    <div className="font-medium text-slate-500 mb-1">
                      Before
                    </div>
                    <pre className="bg-slate-50 rounded-md p-2 overflow-x-auto">
                      {JSON.stringify(log.before_data, null, 2)}
                    </pre>
                  </div>
                )}
                {log.after_data && (
                  <div>
                    <div className="font-medium text-slate-500 mb-1">After</div>
                    <pre className="bg-slate-50 rounded-md p-2 overflow-x-auto">
                      {JSON.stringify(log.after_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mt-4 text-sm">
        <span className="text-slate-500">
          Page {page} of {totalPages} ({total} total entries)
        </span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-md disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-md disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
