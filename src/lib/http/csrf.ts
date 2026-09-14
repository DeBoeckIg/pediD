import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
export const CSRF_COOKIE = 'pedid_csrf_token';
export const CSRF_HEADER = 'x-csrf-token';
function sameOrigin(request: Request, required: boolean) { const expected = new URL(request.url).origin; const origin = request.headers.get('origin'); const referer = request.headers.get('referer'); if (origin) return origin === expected; if (referer) { try { return new URL(referer).origin === expected; } catch { return false; } } return !required; }
export function validateRequestOrigin(request: Request) { return sameOrigin(request, false); }
export function issueCsrfToken() { return randomBytes(32).toString('hex'); }
export function protectAdminMutation(request: Request) { if (!sameOrigin(request, true)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const cookie = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`))?.[1]; const header = request.headers.get(CSRF_HEADER); if (!cookie || !header) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const a = createHash('sha256').update(cookie).digest(); const b = createHash('sha256').update(header).digest(); return timingSafeEqual(a, b) ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
export function setCsrfCookie(response: NextResponse, token: string) { response.cookies.set(CSRF_COOKIE, token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 8, path: '/' }); return response; }
