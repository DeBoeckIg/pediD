import { normalizeArgentineMobile, validateCheckoutInput, type CheckoutInput } from './validation';

export class CheckoutRpcError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: string) {
    super(message);
    this.name = 'CheckoutRpcError';
  }
}

export async function checkout(client: any, input: CheckoutInput) {
  const errors = validateCheckoutInput(input);
  if (errors.length) throw new Error(errors.join(', '));
  const { data, error } = await client.rpc('checkout', {
    submission_key: input.submissionKey.trim(), customer_name: input.customerName.trim(),
    customer_surname: input.customerSurname.trim(), customer_phone: normalizeArgentineMobile(input.customerPhone), payment_method: input.paymentMethod,
    delivery_method: input.deliveryMethod, items: input.items.map(item => ({ product_id: item.productId, ...(item.variantId ? { variant_id: item.variantId } : {}), quantity: item.quantity })),
  });
  if (error) {
    const code = String(error.code ?? '');
    const message = String(error.message ?? '');
    if (code === '42883' || /function\s+public?\.?(checkout|checkout\s*\()/i.test(message) || /could not find the function.*checkout/i.test(message)) {
      throw new Error('Checkout RPC is unavailable: apply migration 0021_checkout_customer_phone.sql to the database');
    }
    throw new CheckoutRpcError(code, message, String(error.details ?? error.hint ?? ''));
  }
  return data;
}
