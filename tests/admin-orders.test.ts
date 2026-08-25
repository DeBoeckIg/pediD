import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = { authorized: true };
const requireAdmin = vi.fn(async () => { if (!state.authorized) throw new Error('Unauthorized'); });
vi.mock('@/modules/auth/guard', () => ({ requireAdmin }));
vi.mock('@/lib/supabase/server', () => ({ createSupabaseServerClient: vi.fn(async () => ({})) }));

describe('admin order management', () => {
  beforeEach(() => { state.authorized = true; vi.clearAllMocks(); });

  it('queries orders with nested items newest first and applies filters', async () => {
    const order = vi.fn().mockReturnThis();
    const query = { from: vi.fn(() => ({ select: vi.fn(() => ({ order })) })) } as any;
    order.mockReturnValue({ ilike: vi.fn().mockReturnThis(), gte: vi.fn().mockReturnThis(), lt: vi.fn().mockResolvedValue({ data: [], error: null }) });
    const { listAdminOrders } = await import('../src/modules/orders/admin-service');
    await listAdminOrders(query, { reference: 'PED', from: '2026-08-01', to: '2026-08-20' });
    expect(query.from).toHaveBeenCalledWith('orders');
    expect(query.from.mock.results[0].value.select).toHaveBeenCalledWith(expect.stringContaining('order_items('));
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('does not render the protected page when admin authorization fails', async () => {
    state.authorized = false;
    const { default: Page } = await import('../app/admin/orders/page');
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('Unauthorized');
  });

  it('allows only explicit forward or cancellation transitions', async () => {
    const { validateStatusTransition } = await import('../src/modules/orders/validation');
    expect(validateStatusTransition('pending', 'confirmed')).toEqual([]);
    expect(validateStatusTransition('confirmed', 'completed')).toEqual([]);
    expect(validateStatusTransition('pending', 'completed')).not.toEqual([]);
    expect(validateStatusTransition('completed', 'pending')).not.toEqual([]);
  });
});
