import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/modules/auth/session';
import { changePassword } from '@/modules/auth/service';
import { protectAdminMutation } from '@/lib/http/csrf';
import { apiError } from '@/lib/http/errors';

export async function POST(request: Request) {
  const forbidden = protectAdminMutation(request); if (forbidden) return forbidden;
  try {
    await requireAdminSession();
    const body = await request.json() as { businessCode?: string; currentPassword?: string; newPassword?: string };
    if (!body.businessCode || !body.currentPassword || !body.newPassword) return NextResponse.json({ error: 'Invalid password change' }, { status: 400 });
    await changePassword(body.businessCode, body.currentPassword, body.newPassword);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error, { fallback: 'Unable to change password', request });
  }
}
