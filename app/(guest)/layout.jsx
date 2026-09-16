// path: app/(guest)/layout.jsx

export default function GuestLayout({ children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      {children}
    </div>
  );
}
