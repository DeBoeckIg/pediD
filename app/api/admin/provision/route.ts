import { NextResponse } from 'next/server';
import { provisionAdmin } from '@/modules/auth/service';

export async function POST(request: Request) {
  if (request.headers.get('x-provisioning-secret') !== process.env.PROVISIONING_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const body = await request.json() as { businessCode?: string; password?: string };
    if (!body.businessCode || !body.password) return NextResponse.json({ error: 'Invalid provisioning input' }, { status: 400 });
    await provisionAdmin(body.businessCode, body.password);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Provisioning failed' }, { status: 400 });
  }
}
