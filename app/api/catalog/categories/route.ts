import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listPublicCategories } from '@/modules/catalog/service';

export async function GET() {
  try {
    return NextResponse.json(await listPublicCategories(await createSupabaseServerClient()));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to list categories' }, { status: 500 });
  }
}
