import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCatalog } from '@/modules/catalog/service';
import { groupPublicCatalog } from '@/modules/catalog/dto';
export async function GET() { const client = await createSupabaseServerClient(); const rows = await listPublicCatalog(client); return NextResponse.json(groupPublicCatalog(rows)); }
