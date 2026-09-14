import { describe, expect, it, vi } from 'vitest';
import { hashPassword, validatePassword, verifyPassword } from '../src/modules/auth/password';

vi.mock('../src/modules/auth/service', () => ({ provisionAdmin: vi.fn() }));

describe('admin password boundary', () => {
  it('rejects weak passwords', () => expect(validatePassword('password')).toBe(false));
  it('hashes and verifies without storing plaintext', async () => {
    const plain = 'SecureAdmin123'; const hash = await hashPassword(plain);
    expect(hash).not.toContain(plain); expect(await verifyPassword(plain, hash)).toBe(true); expect(await verifyPassword('wrong', hash)).toBe(false);
  });
});

describe('security protections', () => {
  it('does not grant direct public product access and grants only the projection', async () => {
    const sql = await import('node:fs/promises').then((fs) => fs.readFile('supabase/migrations/0001_foundation.sql', 'utf8'));
    expect(sql).toContain('revoke all on table public.products from anon, authenticated');
    expect(sql).toContain('grant select on public.public_catalog to anon, authenticated');
    expect(sql).toContain("case when p.stock_quantity > 0 then 'available'");
  });
  it('keeps admin session and provisioning routes behind their boundaries', async () => {
    vi.stubEnv('PROVISIONING_SECRET', 'secret');
    const provision = await import('../app/api/admin/provision/route');
    const denied = await provision.POST(new Request('http://localhost/api/admin/provision', { method: 'POST', body: '{}' }));
    expect(denied.status).toBe(401);
    vi.unstubAllEnvs();
  });
});
