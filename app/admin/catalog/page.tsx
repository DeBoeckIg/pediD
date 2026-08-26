import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminCatalog } from '@/modules/catalog/service';
import AdminCatalogClient from './client';
export default async function AdminCatalogPage() { await requireAdmin(); return <main><nav className="mx-auto flex max-w-6xl gap-4 p-4"><a href="/admin/catalog">Catalog</a><a href="/admin/orders">Orders</a></nav><AdminCatalogClient initial={await listAdminCatalog(createSupabaseAdminClient())} /></main>; }
