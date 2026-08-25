import { validateCheckoutInput, type CheckoutInput } from './validation';

export async function checkout(client: any, input: CheckoutInput) {
  const errors = validateCheckoutInput(input);
  if (errors.length) throw new Error(errors.join(', '));
  const { data, error } = await client.rpc('checkout', {
    submission_key: input.submissionKey.trim(), customer_name: input.customerName.trim(),
    customer_surname: input.customerSurname.trim(), payment_method: input.paymentMethod,
    delivery_method: input.deliveryMethod, items: input.items.map(item => ({ product_id: item.productId, quantity: item.quantity })),
  });
  if (error) throw error;
  return data;
}
