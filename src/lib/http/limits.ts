import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const MAX_JSON_BYTES = 32 * 1024;
export const MAX_MEDIA_REQUEST_BYTES = 5 * 1024 * 1024 + 64 * 1024;
type Entry = { count: number; resetAt: number };
const entries = new Map<string, Entry>();
let upstash: Redis | null | undefined;
const limiters = new Map<string, Ratelimit>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return (forwarded?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown').slice(0, 128);
}
export function rateLimit(request: Request, endpoint: string, limit: number, windowMs: number): Response | null {
  const now = Date.now(); const key = `${endpoint}:${clientIp(request)}`; const current = entries.get(key);
  if (!current || current.resetAt <= now) entries.set(key, { count: 1, resetAt: now + windowMs }); else current.count += 1;
  const entry = entries.get(key)!; if (entry.count <= limit) return null;
  return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))) } });
}
function configuredRedis(): Redis | null { if (upstash !== undefined) return upstash; upstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN ? Redis.fromEnv() : null; return upstash; }
export async function distributedRateLimit(request: Request, endpoint: string, limit: number, windowMs: number, failure: 'closed' | 'local' = 'local'): Promise<Response | null> {
  const redis = configuredRedis(); if (!redis) return rateLimit(request, endpoint, limit, windowMs);
  try { let limiter = limiters.get(`${endpoint}:${limit}:${windowMs}`); if (!limiter) { limiter = new Ratelimit({ redis, prefix: 'pedid:ratelimit', limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`), timeout: 1000 }); limiters.set(`${endpoint}:${limit}:${windowMs}`, limiter); } const result = await limiter.limit(`${endpoint}:${clientIp(request)}`); if (result.success) return null; return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: { 'Retry-After': String(Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))) } }); } catch { if (failure === 'closed') return NextResponse.json({ error: 'Rate limiting service unavailable' }, { status: 503 }); return rateLimit(request, endpoint, limit, windowMs); }
}
export async function readJson(request: Request, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  const declared = Number(request.headers.get('content-length')); if (Number.isFinite(declared) && declared > maxBytes) throw new RequestSizeError();
  const text = await request.text(); if (new TextEncoder().encode(text).byteLength > maxBytes) throw new RequestSizeError(); return JSON.parse(text);
}
export class RequestSizeError extends Error { constructor() { super('Request body too large'); } }
/** Process-local best effort only; Vercel instances do not share this map. */
export function resetRateLimits() { entries.clear(); upstash = undefined; limiters.clear(); }
