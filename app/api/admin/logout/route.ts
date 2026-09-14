import { NextResponse } from 'next/server';
import { protectAdminMutation } from '@/lib/http/csrf';
export async function POST(request: Request) { const denied = protectAdminMutation(request); if (denied) return denied; const response = NextResponse.json({ ok: true }); response.cookies.set('pedid_admin_session', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', expires: new Date(0), path: '/' }); return response; }
