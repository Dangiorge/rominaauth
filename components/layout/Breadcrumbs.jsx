// path: components/layout/Breadcrumbs.jsx

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  return (
    <nav className="px-6 py-3 text-sm text-slate-500">
      <Link href="/dashboard" className="hover:underline">
        Home
      </Link>
      {parts.map((part, i) => {
        const href = "/" + parts.slice(0, i + 1).join("/");
        return (
          <span key={href}>
            {" / "}
            <Link href={href} className="hover:underline capitalize">
              {part}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
