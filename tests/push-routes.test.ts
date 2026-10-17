import { beforeEach, describe, expect, it, vi } from 'vitest';

const requireAdmin = vi.fn(async () => undefined);
const protectAdminMutation = vi.fn(() => new Response('csrf', { status: 403 }));
vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/http/csrf', () => ({ protectAdminMutation }));
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() } }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseAdminClient: vi.fn() }));

describe('push process route protection', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); process.env.VAPID_PUBLIC_KEY = 'public'; process.env.VAPID_PRIVATE_KEY = 'private'; process.env.VAPID_SUBJECT = 'mailto:test@example.com'; });
  it('falls through to admin protection when cron authorization fails', async () => {
    const { POST } = await import('../app/api/admin/push/process/route');
    const response = await POST(new Request('http://localhost', { method: 'POST' }));
    expect(response.status).toBe(403);
    expect(protectAdminMutation).toHaveBeenCalled();
    expect(requireAdmin).not.toHaveBeenCalled();
  });
});
