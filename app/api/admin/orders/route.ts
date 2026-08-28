import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminOrders } from '@/modules/orders/admin-service';

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
    const message = error instanceof Error ? error.message : 'Unable to list orders';
    return NextResponse.json({ error: message }, { status: message === 'Unauthorized' ? 401 : 400 });
  }
}
