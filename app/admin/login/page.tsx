import AdminLoginForm from './form';

export default function AdminLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">pediD</p><h1 className="mt-2 text-2xl font-bold">Acceso de administración</h1>
      <AdminLoginForm />
      </section>
    </main>
  );
}
