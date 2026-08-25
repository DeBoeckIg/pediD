import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/modules/auth/session';
import { changePassword } from '@/modules/auth/service';

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await request.json() as { businessCode?: string; currentPassword?: string; newPassword?: string };
    if (!body.businessCode || !body.currentPassword || !body.newPassword) return NextResponse.json({ error: 'Invalid password change' }, { status: 400 });
    await changePassword(body.businessCode, body.currentPassword, body.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unauthorized' }, { status: 401 });
  }
}
