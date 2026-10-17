import { afterEach, describe, expect, it, vi } from 'vitest';
import { validateRequestOrigin } from '../src/lib/http/csrf';

function request(origin: string, url = 'http://localhost:3000/api/test') {
  return new Request(url, { headers: { origin } });
}

describe('CSRF request origins', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts the backend origin', () => expect(validateRequestOrigin(request('http://localhost:3000'))).toBe(true));
  it('accepts the local frontend only in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(validateRequestOrigin(request('http://localhost:5173'))).toBe(true);
    expect(validateRequestOrigin(request('http://127.0.0.1:5173'))).toBe(true);
  });
  it('rejects cross-origin requests', () => expect(validateRequestOrigin(request('https://evil.example'))).toBe(false));
  it('rejects localhost in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(validateRequestOrigin(request('http://localhost:5173'))).toBe(false);
    expect(validateRequestOrigin(request('http://127.0.0.1:5173'))).toBe(false);
  });
  it('rejects arbitrary schemes and malformed origins', () => {
    vi.stubEnv('NODE_ENV', 'development');
    expect(validateRequestOrigin(request('javascript://localhost:5173'))).toBe(false);
    expect(validateRequestOrigin(request('not-an-origin'))).toBe(false);
  });
});
