import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { authorized: true, adminClient: {} as any };
const requireAdmin = vi.fn(async () => { if (!state.authorized) throw new Error('Unauthorized'); });
const createServerClient = vi.fn(async () => ({}));
const createAdminClient = vi.fn(() => state.adminClient);
vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: createServerClient, createSupabaseAdminClient: createAdminClient }));

describe('admin order management', () => {
  beforeEach(() => { state.authorized = true; state.adminClient = {}; vi.clearAllMocks(); });

  it('queries orders with nested items newest first and applies filters', async () => {
    const order = vi.fn().mockReturnThis();
    const query = { from: vi.fn(() => ({ select: vi.fn(() => ({ order })) })) } as any;
    order.mockReturnValue({ ilike: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lt: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const { listAdminOrders } = await import('../src/modules/orders/admin-service');
    await listAdminOrders(query, { reference: 'PED', from: '2026-08-01', to: '2026-08-20' });
    expect(query.from).toHaveBeenCalledWith('orders');
    expect(query.from.mock.results[0].value.select).toHaveBeenCalledWith(expect.stringContaining('order_items('));
    expect(query.from.mock.results[0].value.select).toHaveBeenCalledWith(expect.stringContaining('variant_label'));
    expect(query.from.mock.results[0].value.select).toHaveBeenCalledWith(expect.stringContaining('customer_phone'));
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('does not render the protected page when admin authorization fails', async () => {
    state.authorized = false;
    const { default: Page } = await import('../app/admin/orders/page');
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('Unauthorized');
  });

  it('uses the service-role client only after the admin guard', async () => {
    const source = await import('node:fs/promises').then(fs => fs.readFile('app/admin/orders/page.tsx', 'utf8'));
    const guardPosition = source.indexOf('await requireAdmin()');
    const clientPosition = source.indexOf('createSupabaseAdminClient()');

    expect(source).toContain("import { createSupabaseAdminClient } from '@/lib/supabase/server';");
    expect(source).not.toContain('createSupabaseServerClient');
    expect(clientPosition).toBeGreaterThan(guardPosition);
  });

  it('allows only explicit forward or cancellation transitions', async () => {
    const { validateStatusTransition } = await import('../src/modules/orders/validation');
    expect(validateStatusTransition('pending', 'confirmed')).toEqual([]);
    expect(validateStatusTransition('confirmed', 'completed')).toEqual([]);
    expect(validateStatusTransition('pending', 'completed')).not.toEqual([]);
    expect(validateStatusTransition('completed', 'pending')).not.toEqual([]);
  });

  it('uses the atomic RPC with the status observed for its compare-and-swap', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'order-1', status: 'confirmed' }, error: null });
    const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }) })) })) })), rpc };
    const { updateOrderStatus } = await import('../src/modules/orders/admin-service');
    await expect(updateOrderStatus(client, 'order-1', 'confirmed')).resolves.toEqual({ id: 'order-1', status: 'confirmed' });
    expect(rpc).toHaveBeenCalledWith('update_order_status_atomic', { order_id: 'order-1', expected_status: 'pending', next_status: 'confirmed' });
  });

  it('deletes orders through the atomic admin RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const { deleteOrder } = await import('../src/modules/orders/admin-service');
    await deleteOrder({ rpc }, '11111111-1111-4111-8111-111111111111');
    expect(rpc).toHaveBeenCalledWith('delete_order_atomic', { order_id: '11111111-1111-4111-8111-111111111111' });
  });

  it('protects order deletion and returns no content for a valid admin request', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    state.adminClient = { rpc };
    const { DELETE } = await import('../app/api/admin/orders/route');
    const headers = { origin: 'http://localhost', cookie: 'pedid_csrf_token=test-token', 'x-csrf-token': 'test-token' };
    const request = () => new Request('http://localhost/api/admin/orders?id=11111111-1111-4111-8111-111111111111', { method: 'DELETE', headers });
    expect((await DELETE(request())).status).toBe(204);
    expect(rpc).toHaveBeenCalledWith('delete_order_atomic', { order_id: '11111111-1111-4111-8111-111111111111' });
    state.authorized = false;
    expect((await DELETE(request())).status).toBe(401);
  });

  it('rejects missing or malformed order ids before deletion', async () => {
    const { DELETE } = await import('../app/api/admin/orders/route');
    const headers = { origin: 'http://localhost', cookie: 'pedid_csrf_token=test-token', 'x-csrf-token': 'test-token' };
    expect((await DELETE(new Request('http://localhost/api/admin/orders', { method: 'DELETE', headers }))).status).toBe(400);
    expect((await DELETE(new Request('http://localhost/api/admin/orders?id=not-an-id', { method: 'DELETE', headers }))).status).toBe(400);
  });

  it('surfaces an atomic transition conflict without changing the route contract', async () => {
    const client = { from: vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { status: 'pending' }, error: null }) })) })) })), rpc: vi.fn().mockResolvedValue({ data: null, error: new Error('Order status update conflict') }) };
    const { updateOrderStatus } = await import('../src/modules/orders/admin-service');
    await expect(updateOrderStatus(client, 'order-1', 'confirmed')).rejects.toThrow('Order status update conflict');
  });

  it('calculates totals from multiple persisted order items', async () => {
    const { calculateOrderTotal } = await import('../src/modules/orders/totals');
    expect(calculateOrderTotal([
      { unit_price_ars: 1250, quantity: 2 },
      { unit_price_ars: '300.50', quantity: 3 },
    ])).toBe(3401.5);
  });

  it('returns zero for missing, empty, or malformed items', async () => {
    const { calculateOrderTotal } = await import('../src/modules/orders/totals');
    expect(calculateOrderTotal(undefined)).toBe(0);
    expect(calculateOrderTotal([])).toBe(0);
    expect(calculateOrderTotal([{ unit_price_ars: 'not-a-price', quantity: 2 }, {}])).toBe(0);
  });
});
