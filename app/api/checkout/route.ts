import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { checkout } from '@/modules/orders/service';
import type { CheckoutInput } from '@/modules/orders/validation';
import { normalizeCheckoutPayload } from '@/modules/orders/http';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await checkout(await createSupabaseServerClient(), normalizeCheckoutPayload(body) as CheckoutInput);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to submit order' }, { status: 400 });
  }
}
