import { afterEach, describe, expect, it, vi } from 'vitest';
import { distributedRateLimit, resetRateLimits } from '../src/lib/http/limits';

afterEach(() => { delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN; resetRateLimits(); vi.restoreAllMocks(); });

describe('distributed rate limiting', () => {
  it('uses the local fallback when Upstash is not configured', async () => {
    const request = new Request('http://localhost', { headers: { 'x-forwarded-for': '198.51.100.20' } });
    expect(await distributedRateLimit(request, 'checkout', 1, 60_000)).toBeNull();
    expect((await distributedRateLimit(request, 'checkout', 1, 60_000))?.status).toBe(429);
  });

  it('fails closed for sensitive endpoints when Upstash fails', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'; process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    vi.mock('@upstash/redis', () => ({ Redis: { fromEnv: () => ({}) } }));
    vi.mock('@upstash/ratelimit', () => ({ Ratelimit: class { static slidingWindow() { return {}; } constructor() {} limit() { return Promise.reject(new Error('offline')); } } }));
    const response = await distributedRateLimit(new Request('http://localhost'), 'admin-login', 1, 60_000, 'closed');
    expect(response?.status).toBe(503);
  });
});
