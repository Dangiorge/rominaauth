// path: app/unauthorized/page.jsx

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-red-600">403</h1>
        <p className="text-slate-500 mt-2">
          You dont have permission to view this page.
        </p>
      </div>
    </div>
  );
}
