import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
export const CSRF_COOKIE = 'pedid_csrf_token';
export const CSRF_HEADER = 'x-csrf-token';
const LOCAL_DEVELOPMENT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

function parseOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function allowedOrigins() {
  const configured = (process.env.CSRF_ALLOWED_ORIGINS ?? '').split(',').map(value => value.trim()).filter(Boolean);
  const origins = process.env.NODE_ENV === 'production' ? configured : [...LOCAL_DEVELOPMENT_ORIGINS, ...configured];
  return new Set(origins.map(parseOrigin).filter((origin): origin is string => origin !== null));
}

function sameOrigin(request: Request, required: boolean) {
  const expected = parseOrigin(new URL(request.url).origin);
  if (!expected) return false;
  const allowed = allowedOrigins();
  allowed.add(expected);
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  if (origin) return parseOrigin(origin) !== null && allowed.has(parseOrigin(origin)!);
  if (referer) { try { const refererOrigin = parseOrigin(new URL(referer).origin); return refererOrigin !== null && allowed.has(refererOrigin); } catch { return false; } }
  return !required;
}
export function validateRequestOrigin(request: Request) { return sameOrigin(request, false); }
export function issueCsrfToken() { return randomBytes(32).toString('hex'); }
export function protectAdminMutation(request: Request) { if (!sameOrigin(request, true)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const cookie = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]+)`))?.[1]; const header = request.headers.get(CSRF_HEADER); if (!cookie || !header) return NextResponse.json({ error: 'Forbidden' }, { status: 403 }); const a = createHash('sha256').update(cookie).digest(); const b = createHash('sha256').update(header).digest(); return timingSafeEqual(a, b) ? null : NextResponse.json({ error: 'Forbidden' }, { status: 403 }); }
export function setCsrfCookie(response: NextResponse, token: string) { response.cookies.set(CSRF_COOKIE, token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 8, path: '/' }); return response; }
