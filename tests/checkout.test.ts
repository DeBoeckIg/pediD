import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCheckoutInput } from '../src/modules/orders/validation';
import { checkout } from '../src/modules/orders/service';
import { formatWhatsAppMessage, getWhatsAppUrl, persistOrderHandoff, ORDER_HANDOFF_STORAGE_KEY } from '../src/modules/orders/whatsapp';
import { toCheckoutItems } from '../app/catalog/catalog-client';
import { formatArsAmount, getCartEntrySubtotal, getCartTotal, normalizeCartEntries } from '../src/modules/orders/cart';
import { normalizeCheckoutPayload } from '../src/modules/orders/http';
import { generateSubmissionKey } from '../src/modules/orders/submission-key';

const valid = { submissionKey: 'key', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash' as const, deliveryMethod: 'pickup' as const, items: [{ productId: 'p1', quantity: 1 }] };
describe('checkout validation', () => {
  it('rejects empty carts and unavailable-like invalid quantities', () => { expect(validateCheckoutInput({ ...valid, items: [] })).toContain('Cart cannot be empty'); expect(validateCheckoutInput({ ...valid, items: [{ productId: 'p1', quantity: 0 }] })).toContain('Cart quantities are invalid'); });
  it('rejects null items, oversized carts, duplicate IDs, and overlong strings', () => {
    expect(validateCheckoutInput({ ...valid, items: null as never })).toContain('Cart cannot be empty');
    expect(validateCheckoutInput({ ...valid, items: Array.from({ length: 51 }, (_, index) => ({ productId: `p${index}`, quantity: 1 })) })).toContain('Cart cannot contain more than 50 items');
    expect(validateCheckoutInput({ ...valid, items: [{ productId: 'p1', quantity: 1 }, { productId: 'p1', quantity: 1 }] })).toContain('Cart cannot contain duplicate products');
    expect(validateCheckoutInput({ ...valid, customerName: 'x'.repeat(121) })).toContain('Customer name is required and must be 120 characters or fewer');
    expect(validateCheckoutInput({ ...valid, submissionKey: 'x'.repeat(201) })).toContain('Submission key is required and must be 200 characters or fewer');
  });
});
describe('submission key generation', () => {
  it('uses randomUUID when available', () => expect(generateSubmissionKey({ randomUUID: () => 'native-key' })).toBe('native-key'));
  it('generates a UUID v4 with getRandomValues', () => {
    const cryptoSource = { getRandomValues: (bytes: Uint8Array) => { bytes.fill(0); return bytes; } };
    expect(generateSubmissionKey(cryptoSource)).toBe('00000000-0000-4000-8000-000000000000');
  });
  it('falls back to a unique UUID-shaped key without Web Crypto', () => {
    const first = generateSubmissionKey(null);
    const second = generateSubmissionKey(null);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toMatch(/^[0-9a-f-]{36}$/);
    expect(first).not.toBe(second);
  });
});
describe('cart checkout payload', () => {
  it('formats priced subtotals and totals in ARS', () => {
    const items = normalizeCartEntries(JSON.stringify([{ productId: 'p1', quantity: 2, name: 'Tea', priceArs: 1200 }]));
    expect(getCartEntrySubtotal(items[0])).toBe(2400);
    expect(formatArsAmount(getCartTotal(items))).toBe('ARS 2.400');
  });
  it('shows unavailable values for empty and legacy price-less carts', () => {
    const items = normalizeCartEntries(JSON.stringify([{ product_id: 'old', quantity: 1 }]));
    expect(formatArsAmount(getCartTotal([]))).toBe('Precio no disponible');
    expect(formatArsAmount(getCartTotal(items))).toBe('Precio no disponible');
    expect(formatArsAmount(getCartEntrySubtotal(items[0]))).toBe('Precio no disponible');
  });
  it('normalizes legacy and string-valued cart entries', () => expect(normalizeCartEntries(JSON.stringify([
    { product_id: 'legacy', quantity: '2', productName: 'Tea', price_ars: '1200' },
  ]))).toEqual([{ productId: 'legacy', quantity: 2, name: 'Tea', priceArs: 1200 }]));
  it('returns an empty cart for malformed JSON', () => expect(normalizeCartEntries('{bad json')).toEqual([]));
  it('filters entries with invalid quantities or product IDs', () => expect(normalizeCartEntries(JSON.stringify([
    { productId: 'zero', quantity: 0 }, { productId: 'nan', quantity: 'nope' }, { product_id: '', quantity: 1 }, { productId: 'ok', quantity: 1 },
  ]))).toEqual([{ productId: 'ok', quantity: 1 }]));
  it('strips client-only catalog fields before the RPC request', () => expect(toCheckoutItems([{ productId: 'p1', quantity: 2, name: 'Tea', priceArs: 1200 }])).toEqual([{ product_id: 'p1', quantity: 2 }]));
   it('preserves variant IDs in the RPC request', () => expect(toCheckoutItems([{ productId: 'p1', variantId: 'v1', quantity: 2, name: 'Tea', priceArs: 1200 }])).toEqual([{ product_id: 'p1', variant_id: 'v1', quantity: 2 }]));
   it('keeps presentation and variant price in the checkout summary model', () => { const [item] = normalizeCartEntries(JSON.stringify([{ productId: 'p1', variantId: 'v1', quantity: 2, name: 'Tea', variantLabel: '500 g', priceArs: 1200 }])); expect(item.variantLabel).toBe('500 g'); expect(getCartEntrySubtotal(item)).toBe(2400); });
});
describe('checkout RPC boundary', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('calls the public RPC with product_id payload and returns its reference', async () => { const rpc = vi.fn(async () => ({ data: { order_reference: 'ref' }, error: null })); expect(await checkout({ rpc }, valid)).toEqual({ order_reference: 'ref' }); expect(rpc).toHaveBeenCalledWith('checkout', expect.objectContaining({ items: [{ product_id: 'p1', quantity: 1 }] })); });
  it('preserves duplicate submission responses for idempotent RPC handling', async () => { const rpc = vi.fn().mockResolvedValue({ data: { order_reference: 'same' }, error: null }); const client = { rpc }; await checkout(client, valid); await checkout(client, valid); expect(rpc).toHaveBeenCalledTimes(2); expect((await checkout(client, valid)).order_reference).toBe('same'); });
  it('surfaces unavailable product errors from the RPC', async () => { await expect(checkout({ rpc: async () => ({ data: null, error: new Error('Product unavailable') }) }, valid)).rejects.toThrow('Product unavailable'); });
});
describe('checkout HTTP boundary', () => {
  it('normalizes the browser/RPC item shape for the domain service', () => {
    expect(normalizeCheckoutPayload({ ...valid, items: [{ product_id: 'p1', quantity: 2 }] })).toEqual({ ...valid, items: [{ product_id: 'p1', productId: 'p1', quantity: 2 }] });
  });
  it('does not turn malformed snake_case items into valid service input', () => {
    const normalized = normalizeCheckoutPayload({ ...valid, items: [{ product_id: '', quantity: 0 }] });
    expect(validateCheckoutInput(normalized as Parameters<typeof validateCheckoutInput>[0])).toContain('Cart quantities are invalid');
  });
});
describe('WhatsApp order handoff', () => {
  it('formats details and encodes the message in the URL', () => {
    const message = formatWhatsAppMessage({ reference: 'PED-1', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash', deliveryMethod: 'pickup', items: [{ name: 'Café & cake', quantity: 2, priceArs: 1500 }] });
     expect(message).toContain('Hola');
     expect(message).toContain('Total: ARS 3.000');
    expect(getWhatsAppUrl('5493813531217', message)).toContain(`text=${encodeURIComponent(message)}`);
  });
  it('includes the selected presentation while keeping legacy items valid', () => { expect(formatWhatsAppMessage({ reference: 'PED-3', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash', deliveryMethod: 'pickup', items: [{ name: 'Tea', presentation: '500 g', quantity: 1, priceArs: 1200 }] })).toContain('Tea (500 g) × 1'); expect(formatWhatsAppMessage({ reference: 'PED-4', customerName: 'Ada', customerSurname: 'Lovelace', paymentMethod: 'cash', deliveryMethod: 'pickup', items: [{ name: 'Tea', quantity: 1 }] })).toContain('Tea × 1'); });
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
