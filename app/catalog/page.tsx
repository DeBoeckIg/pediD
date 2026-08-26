import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCatalog } from '@/modules/catalog/service';
import { groupPublicCatalog } from '@/modules/catalog/dto';
import { createCatalogImageUrlMap, publicCatalogImageUrlFor } from '@/modules/catalog/images';
import CatalogClient from './catalog-client';
export default async function CatalogPage() { const client = await createSupabaseServerClient(); const rows = await listPublicCatalog(client); const imageUrls = await createCatalogImageUrlMap(client, rows.map((row: { image_path: string | null }) => row.image_path)); const categories = groupPublicCatalog(rows, publicCatalogImageUrlFor(imageUrls)); return <main className="mx-auto max-w-5xl p-4"><h1 className="text-2xl font-bold">Catalog</h1><CatalogClient categories={categories} /></main>; }
