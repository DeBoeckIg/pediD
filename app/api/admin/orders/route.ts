import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminOrders } from '@/modules/orders/admin-service';
import { apiError } from '@/lib/http/errors';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const orders = await listAdminOrders(createSupabaseAdminClient(), {
      reference: url.searchParams.get('reference') ?? undefined,
      from: url.searchParams.get('from') ?? undefined,
      to: url.searchParams.get('to') ?? undefined,
    });
    return NextResponse.json(orders);
  } catch (error) {
    return apiError(error, { fallback: 'Unable to list orders', request });
  }
}
