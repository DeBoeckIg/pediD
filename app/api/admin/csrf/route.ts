import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/modules/auth/session';
import { issueCsrfToken, setCsrfCookie } from '@/lib/http/csrf';
export async function GET() { try { await requireAdminSession(); const token = issueCsrfToken(); return setCsrfCookie(NextResponse.json({ token }), token); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } }
