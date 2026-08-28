import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCatalog, listPublicCategories } from '@/modules/catalog/service';
import { groupPublicCatalog } from '@/modules/catalog/dto';
import { createCatalogImageUrlMap, publicCatalogImageUrlFor } from '@/modules/catalog/images';
export async function GET() { const client = await createSupabaseServerClient(); const [rows, metadata] = await Promise.all([listPublicCatalog(client), listPublicCategories(client)]); const imageUrls = await createCatalogImageUrlMap(createSupabaseAdminClient(), rows.map((row: { image_path: string | null }) => row.image_path)); return NextResponse.json({ categories: groupPublicCatalog(rows, publicCatalogImageUrlFor(imageUrls), metadata), products: rows }); }
