import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getAdminStatistics } from '@/modules/analytics/admin-service';
import { apiError } from '@/lib/http/errors';

export async function GET(request: Request) {
  try { await requireAdmin(); const url = new URL(request.url); return NextResponse.json(await getAdminStatistics(createSupabaseAdminClient(), { from: url.searchParams.get('from') ?? undefined, to: url.searchParams.get('to') ?? undefined })); }
  catch (error) { return apiError(error, { fallback: 'Unable to load statistics', request }); }
}
