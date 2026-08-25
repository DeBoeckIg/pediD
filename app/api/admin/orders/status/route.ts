import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { updateOrderStatus } from '@/modules/orders/admin-service';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = request.headers.get('content-type')?.includes('application/json')
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
    const result = await updateOrderStatus(createSupabaseAdminClient(), String(body.orderId ?? ''), body.status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to update order status' }, { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 400 });
  }
}
