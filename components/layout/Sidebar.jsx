// path: components/layout/Sidebar.jsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import * as Icons from "lucide-react";

const FALLBACK_THEME = {
  name: "Romina PLC",
  logo_url: null,
  primary_color: "#0f172a",
  secondary_color: "#94a3b8",
  accent_color: "#3b82f6",
};

export default function Sidebar() {
  const { data: session } = useSession();
  const [menu, setMenu] = useState([]);
  const [theme, setTheme] = useState(FALLBACK_THEME);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/system/user-menu")
      .then((res) => res.json())
      .then((data) => setMenu(data.paths || []));
  }, []);

  useEffect(() => {
    if (!session) return;
    fetch("/api/system/active-theme")
      .then((res) => res.json())
      .then((data) => setTheme(data.theme || FALLBACK_THEME));
  }, [session?.user?.activeBrandId, session?.user?.activeBranchId]);

  const grouped = menu.reduce((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const sidebarStyle = {
    "--sidebar-secondary": theme.secondary_color,
    "--sidebar-accent": theme.accent_color,
    backgroundColor: theme.primary_color,
  };

  return (
    <aside
      style={sidebarStyle}
      className="w-64 h-screen text-slate-100 p-4 overflow-y-auto"
    >
      <div className="flex items-center gap-2 mb-6">
        {theme.logo_url ? (
          <img
            src={theme.logo_url}
            alt=""
            className="w-7 h-7 object-contain rounded bg-white/10"
          />
        ) : (
          <div className="w-7 h-7 rounded bg-white/20" />
        )}
        <span className="text-xl font-bold truncate">{theme.name}</span>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="mb-6">
          <div
            className="text-xs uppercase mb-2"
            style={{ color: "var(--sidebar-secondary)" }}
          >
            {category}
          </div>
          {items.map((item) => {
            const Icon = Icons[item.icon] || Icons.Circle;
            const active = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm mb-1"
                style={
                  active
                    ? {
                        backgroundColor: "var(--sidebar-accent)",
                        color: "#fff",
                      }
                    : { color: "var(--sidebar-secondary)" }
                }
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
