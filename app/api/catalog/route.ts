import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCatalog } from '@/modules/catalog/service';
import { groupPublicCatalog } from '@/modules/catalog/dto';
import { createCatalogImageUrlMap, publicCatalogImageUrlFor } from '@/modules/catalog/images';
export async function GET() { const client = await createSupabaseServerClient(); const rows = await listPublicCatalog(client); const imageUrls = await createCatalogImageUrlMap(client, rows.map((row: { image_path: string | null }) => row.image_path)); return NextResponse.json(groupPublicCatalog(rows, publicCatalogImageUrlFor(imageUrls))); }
