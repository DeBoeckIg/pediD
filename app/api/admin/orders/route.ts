import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminOrders } from '@/modules/orders/admin-service';
import { deleteOrder } from '@/modules/orders/admin-service';
import { protectAdminMutation } from '@/lib/http/csrf';
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

export async function DELETE(request: Request) {
  const forbidden = protectAdminMutation(request);
  if (forbidden) return forbidden;
  try {
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return apiError(new Error('Order id is required'), { fallback: 'Invalid order id', request, status: 400 });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
      return apiError(new Error('Order id is invalid'), { fallback: 'Invalid order id', request, status: 400 });
    }
    await requireAdmin();
    await deleteOrder(createSupabaseAdminClient(), id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, { fallback: 'Unable to delete order', request });
  }
}
