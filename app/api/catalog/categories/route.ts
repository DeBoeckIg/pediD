import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listPublicCategories } from '@/modules/catalog/service';
import { apiError } from '@/lib/http/errors';

export async function GET(request: Request) {
  try {
    return NextResponse.json(await listPublicCategories(createSupabaseAdminClient()));
  } catch (error) {
    return apiError(error, { fallback: 'Unable to list categories', request, code: 'CATALOG_CATEGORIES_UNAVAILABLE' });
  }
}
