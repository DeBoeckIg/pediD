import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCatalog } from '@/modules/catalog/service';
import { groupPublicCatalog } from '@/modules/catalog/dto';
import CatalogClient from './catalog-client';
export default async function CatalogPage() { const rows = await listPublicCatalog(await createSupabaseServerClient()); const categories = groupPublicCatalog(rows); return <main className="mx-auto max-w-5xl p-4"><h1 className="text-2xl font-bold">Catalog</h1><CatalogClient categories={categories} /></main>; }
