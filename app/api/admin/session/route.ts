import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/modules/auth/session';

export async function GET() {
  try { await requireAdminSession(); return NextResponse.json({ authenticated: true }); }
  catch { return NextResponse.json({ authenticated: false }, { status: 401 }); }
}
