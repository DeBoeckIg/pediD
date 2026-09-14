import { afterEach, describe, expect, it } from 'vitest';
import { rateLimit, readJson, resetRateLimits } from '../src/lib/http/limits';

afterEach(() => resetRateLimits());

describe('high-risk HTTP limits', () => {
  it('returns 429 with Retry-After after the endpoint quota', () => {
    const request = new Request('http://localhost', { headers: { 'x-forwarded-for': '198.51.100.10' } });
    expect(rateLimit(request, 'login', 1, 60_000)).toBeNull();
    const response = rateLimit(request, 'login', 1, 60_000);
    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toMatch(/^\d+$/);
  });

  it('rejects declared and actual JSON bodies over the limit', async () => {
    await expect(readJson(new Request('http://localhost', { method: 'POST', body: '12345', headers: { 'content-length': '999' } }), 10)).rejects.toThrow('Request body too large');
    await expect(readJson(new Request('http://localhost', { method: 'POST', body: '12345678901' }), 10)).rejects.toThrow('Request body too large');
  });

  it('keeps valid JSON behavior', async () => {
    await expect(readJson(new Request('http://localhost', { method: 'POST', body: JSON.stringify({ ok: true }) }))).resolves.toEqual({ ok: true });
  });
});
