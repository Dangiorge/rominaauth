// path: app/(dashboard)/layout.jsx

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 min-h-screen bg-slate-50">
        <Header />
        <Breadcrumbs />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
