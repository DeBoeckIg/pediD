import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCheckoutInput } from '../src/modules/orders/validation';
import { checkout } from '../src/modules/orders/service';
import { formatWhatsAppMessage, getWhatsAppUrl, persistOrderHandoff, ORDER_HANDOFF_STORAGE_KEY } from '../src/modules/orders/whatsapp';
import { toCheckoutItems } from '../app/catalog/catalog-client';

const valid = { submissionKey: 'key', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash' as const, deliveryMethod: 'pickup' as const, items: [{ productId: 'p1', quantity: 1 }] };
describe('checkout validation', () => {
  it('rejects empty carts and unavailable-like invalid quantities', () => { expect(validateCheckoutInput({ ...valid, items: [] })).toContain('Cart cannot be empty'); expect(validateCheckoutInput({ ...valid, items: [{ productId: 'p1', quantity: 0 }] })).toContain('Cart quantities are invalid'); });
});
describe('cart checkout payload', () => {
  it('strips client-only catalog fields before the RPC request', () => expect(toCheckoutItems([{ productId: 'p1', quantity: 2, name: 'Tea', priceArs: 1200 }])).toEqual([{ product_id: 'p1', quantity: 2 }]));
});
describe('checkout RPC boundary', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('calls the public RPC with product_id payload and returns its reference', async () => { const rpc = vi.fn(async () => ({ data: { order_reference: 'ref' }, error: null })); expect(await checkout({ rpc }, valid)).toEqual({ order_reference: 'ref' }); expect(rpc).toHaveBeenCalledWith('checkout', expect.objectContaining({ items: [{ product_id: 'p1', quantity: 1 }] })); });
  it('preserves duplicate submission responses for idempotent RPC handling', async () => { const rpc = vi.fn().mockResolvedValue({ data: { order_reference: 'same' }, error: null }); const client = { rpc }; await checkout(client, valid); await checkout(client, valid); expect(rpc).toHaveBeenCalledTimes(2); expect((await checkout(client, valid)).order_reference).toBe('same'); });
  it('surfaces unavailable product errors from the RPC', async () => { await expect(checkout({ rpc: async () => ({ data: null, error: new Error('Product unavailable') }) }, valid)).rejects.toThrow('Product unavailable'); });
});
describe('WhatsApp order handoff', () => {
  it('formats details and encodes the message in the URL', () => {
    const message = formatWhatsAppMessage({ reference: 'PED-1', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash', deliveryMethod: 'pickup', items: [{ name: 'Café & cake', quantity: 2, priceArs: 1500 }] });
     expect(message).toContain('Hola');
     expect(message).toContain('Total: ARS 3.000');
    expect(getWhatsAppUrl('5493813531217', message)).toContain(`text=${encodeURIComponent(message)}`);
  });
  it('does not represent an old cart with missing prices as zero', () => {
    expect(formatWhatsAppMessage({ reference: 'PED-2', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash', deliveryMethod: 'pickup', items: [{ name: 'Producto antiguo', quantity: 1 }] })).toContain('Total: ARS no disponible');
  });
  it('persists handoff details before cart cleanup', () => {
    const values = new Map<string, string>();
    persistOrderHandoff({ setItem: (key, value) => values.set(key, value) }, { reference: 'PED-1', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash', deliveryMethod: 'pickup', items: [] });
    expect(JSON.parse(values.get(ORDER_HANDOFF_STORAGE_KEY)!)).toMatchObject({ reference: 'PED-1', customerSurname: 'Lovelace' });
  });
  it('rejects invalid numbers', () => expect(getWhatsAppUrl('+549', 'message')).toBeNull());
});
