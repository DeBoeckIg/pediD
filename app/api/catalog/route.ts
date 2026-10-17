import { NextResponse } from 'next/server';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCatalog } from '@/modules/catalog/service';
import { groupPublicCatalog } from '@/modules/catalog/dto';
import { createCatalogImageUrlMap, publicCatalogImageUrlFor } from '@/modules/catalog/images';
export async function GET() { const client = await createSupabaseServerClient(); const rows = await listPublicCatalog(client); const imageUrls = await createCatalogImageUrlMap(createSupabaseAdminClient(), rows.flatMap((row: { image_path: string | null; image_paths?: string[] }) => row.image_paths?.length ? row.image_paths.slice(0, 6) : row.image_path ? [row.image_path] : [])); return NextResponse.json(groupPublicCatalog(rows, publicCatalogImageUrlFor(imageUrls)), { headers: { 'Cache-Control': 'no-store' } }); }
