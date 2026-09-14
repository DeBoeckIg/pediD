import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { updateOrderStatus } from '@/modules/orders/admin-service';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';

export async function POST(request: Request) {
  const forbidden = protectAdminMutation(request); if (forbidden) return forbidden;
  try {
    await requireAdmin();
    const isJsonRequest = request.headers.get('content-type')?.includes('application/json') ?? false;
    const body = isJsonRequest
      ? await request.json()
      : Object.fromEntries((await request.formData()).entries());
    const result = await updateOrderStatus(createSupabaseAdminClient(), String(body.orderId ?? ''), body.status);
    return isJsonRequest
      ? NextResponse.json(result)
      : NextResponse.redirect(new URL('/admin/orders', request.url), 303);
  } catch (error) {
    return apiError(error, { fallback: 'Unable to update order status', request });
  }
}
