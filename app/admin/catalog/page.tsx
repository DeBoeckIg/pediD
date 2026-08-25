import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAdminCatalog } from '@/modules/catalog/service';
import AdminCatalogClient from './client';
export default async function AdminCatalogPage() { await requireAdmin(); return <AdminCatalogClient initial={await listAdminCatalog(await createSupabaseServerClient())} />; }
