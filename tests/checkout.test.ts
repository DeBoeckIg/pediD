import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCheckoutInput } from '../src/modules/orders/validation';
import { checkout } from '../src/modules/orders/service';

const valid = { submissionKey: 'key', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash' as const, deliveryMethod: 'pickup' as const, items: [{ productId: 'p1', quantity: 1 }] };
describe('checkout validation', () => {
  it('rejects empty carts and unavailable-like invalid quantities', () => { expect(validateCheckoutInput({ ...valid, items: [] })).toContain('Cart cannot be empty'); expect(validateCheckoutInput({ ...valid, items: [{ productId: 'p1', quantity: 0 }] })).toContain('Cart quantities are invalid'); });
});
describe('checkout RPC boundary', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('calls the public RPC with product_id payload and returns its reference', async () => { const rpc = vi.fn(async () => ({ data: { order_reference: 'ref' }, error: null })); expect(await checkout({ rpc }, valid)).toEqual({ order_reference: 'ref' }); expect(rpc).toHaveBeenCalledWith('checkout', expect.objectContaining({ items: [{ product_id: 'p1', quantity: 1 }] })); });
  it('preserves duplicate submission responses for idempotent RPC handling', async () => { const rpc = vi.fn().mockResolvedValue({ data: { order_reference: 'same' }, error: null }); const client = { rpc }; await checkout(client, valid); await checkout(client, valid); expect(rpc).toHaveBeenCalledTimes(2); expect((await checkout(client, valid)).order_reference).toBe('same'); });
  it('surfaces unavailable product errors from the RPC', async () => { await expect(checkout({ rpc: async () => ({ data: null, error: new Error('Product unavailable') }) }, valid)).rejects.toThrow('Product unavailable'); });
});
