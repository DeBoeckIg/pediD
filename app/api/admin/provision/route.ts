import { NextResponse } from 'next/server';
import { provisionAdmin } from '@/modules/auth/service';
import { distributedRateLimit, readJson, RequestSizeError } from '@/lib/http/limits';
import { apiError } from '@/lib/http/errors';

export async function POST(request: Request) {
  if (request.headers.get('x-provisioning-secret') !== process.env.PROVISIONING_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const limited = await distributedRateLimit(request, 'admin-provision', 5, 60_000, 'closed'); if (limited) return limited;
  try {
    const body = await readJson(request) as { businessCode?: string; password?: string };
    if (!body.businessCode || !body.password) return NextResponse.json({ error: 'Invalid provisioning input' }, { status: 400 });
    await provisionAdmin(body.businessCode, body.password);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof RequestSizeError) return apiError(error, { fallback: 'Request body too large', request, status: 413 });
    return apiError(error, { fallback: 'Provisioning failed', request });
  }
}
