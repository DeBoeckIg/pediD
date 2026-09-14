import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

describe('Content-Security-Policy', () => {
  it('keeps the existing security headers and removes unsafe inline scripts', async () => {
    const headers = await nextConfig.headers?.();
    const values = Object.fromEntries((headers?.[0]?.headers ?? []).map(header => [header.key, header.value]));
    const csp = values['Content-Security-Policy'];

    expect(values['X-Content-Type-Options']).toBe('nosniff');
    expect(values['X-Frame-Options']).toBe('DENY');
    expect(values['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(values['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(csp).toContain("script-src 'self'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('allows only the origins used by Supabase for images and API connections', async () => {
    const headers = await nextConfig.headers?.();
    const csp = headers?.[0]?.headers.find(header => header.key === 'Content-Security-Policy')?.value ?? '';

    expect(csp).toContain('img-src \'self\' data: https://*.supabase.co');
    expect(csp).toContain('connect-src \'self\' https://*.supabase.co');
    expect(csp).not.toMatch(/img-src ['"]self['"] data: https:(?:\s|;)/);
    expect(csp).not.toContain('https://wa.me');
  });
});
