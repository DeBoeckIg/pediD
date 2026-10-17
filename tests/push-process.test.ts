import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendNotification = vi.fn();
const setVapidDetails = vi.fn();
const requireAdmin = vi.fn();
const protectAdminMutation = vi.fn(() => undefined);
const db = { from: vi.fn() };
const createSupabaseAdminClient = vi.fn(() => db);

vi.mock('web-push', () => ({ default: { sendNotification, setVapidDetails } }));
vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/http/csrf', () => ({ protectAdminMutation }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseAdminClient }));

const job = { id: 'job-1', attempts: 0, max_attempts: 5, order_reference: 'PED-1', total_ars: 1200 };
const subscription = { endpoint: 'https://push.example/sub', p256dh: 'p256', auth: 'auth' };

function configureDatabase(subscriptions = [subscription]) {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const remove = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  db.from.mockImplementation((table: string) => {
    if (table === 'admin_push_outbox') return { select: vi.fn(() => ({ in: vi.fn(() => ({ lte: vi.fn(() => ({ lt: vi.fn(() => ({ limit: vi.fn().mockResolvedValue({ data: [job] }) })) })) })) })), update };
    return { select: vi.fn(() => Promise.resolve({ data: subscriptions })), delete: remove };
  });
  return { update, remove, subscriptions };
}

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  process.env.VAPID_PUBLIC_KEY = 'public'; process.env.VAPID_PRIVATE_KEY = 'private'; process.env.VAPID_SUBJECT = 'mailto:test@example.com';
});

describe('push processor', () => {
  it('marks a delivered job as sent', async () => {
    const { update } = configureDatabase(); sendNotification.mockResolvedValue(undefined);
    const { POST } = await import('../app/api/admin/push/process/route');
    await POST(new Request('http://localhost', { method: 'POST', headers: { 'x-push-cron-secret': 'cron' } }));
    expect(update).toHaveBeenCalled();
    expect(update.mock.calls[0][0]).toMatchObject({ status: 'sent' });
  });

  it('retries when there are no subscriptions', async () => {
    const { update } = configureDatabase([]);
    const { POST } = await import('../app/api/admin/push/process/route'); await POST(new Request('http://localhost', { method: 'POST', headers: { 'x-push-cron-secret': 'cron' } }));
    expect(update.mock.calls[0][0]).toMatchObject({ status: 'pending' });
  });

  it.each([404, 410])('removes an endpoint on push status %s', async status => {
    const { remove } = configureDatabase(); sendNotification.mockRejectedValue({ statusCode: status, message: 'gone' });
    const { POST } = await import('../app/api/admin/push/process/route'); await POST(new Request('http://localhost', { method: 'POST', headers: { 'x-push-cron-secret': 'cron' } }));
    expect(remove).toHaveBeenCalled();
  });

  it('returns 503 when VAPID configuration is missing', async () => {
    delete process.env.VAPID_PRIVATE_KEY; configureDatabase();
    const { POST } = await import('../app/api/admin/push/process/route'); expect((await POST(new Request('http://localhost', { method: 'POST', headers: { 'x-push-cron-secret': 'cron' } }))).status).toBe(503);
  });
});
