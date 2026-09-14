import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkout } from '@/modules/orders/service';
import type { CheckoutInput } from '@/modules/orders/validation';
import { normalizeCheckoutPayload } from '@/modules/orders/http';
import { distributedRateLimit, readJson, RequestSizeError } from '@/lib/http/limits';
import { apiError } from '@/lib/http/errors';

export async function POST(request: Request) {
  try {
    const limited = await distributedRateLimit(request, 'checkout', 30, 60_000, 'local'); if (limited) return limited;
    const body = await readJson(request);
    const result = await checkout(await createSupabaseServerClient(), normalizeCheckoutPayload(body) as CheckoutInput);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof RequestSizeError) return apiError(error, { fallback: 'Request body too large', request, status: 413 });
    return apiError(error, { fallback: 'Unable to submit order', request });
  }
}
