import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminCatalog } from '@/modules/catalog/service';
import AdminCatalogClient from './client';
export default async function AdminCatalogPage() { await requireAdmin(); return <main><nav className="mx-auto flex max-w-6xl gap-5 border-b border-slate-200 px-4 py-5 text-sm font-semibold sm:px-6"><a className="text-indigo-600" href="/admin/catalog">Catálogo</a><a className="text-slate-500 hover:text-indigo-600" href="/admin/orders">Pedidos</a></nav><AdminCatalogClient initial={await listAdminCatalog(createSupabaseAdminClient())} /></main>; }
