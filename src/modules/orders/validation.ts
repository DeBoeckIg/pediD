export type CheckoutInput = {
  submissionKey: string;
  customerName: string;
  customerSurname: string;
  paymentMethod: 'cash' | 'bank_transfer';
  deliveryMethod: 'pickup' | 'meeting_point';
  items: { productId: string; quantity: number }[];
};

export type OrderStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'], completed: [], cancelled: [],
};

export function validateStatusTransition(current: string, next: string): string[] {
  if (!Object.keys(transitions).includes(current) || !Object.keys(transitions).includes(next)) return ['Order status is invalid'];
  if (!transitions[current as OrderStatus].includes(next as OrderStatus)) return [`Cannot change order status from ${current} to ${next}`];
  return [];
}

export function validateCheckoutInput(input: Partial<CheckoutInput>): string[] {
  const errors: string[] = [];
  if (!input.submissionKey?.trim() || input.submissionKey.trim().length > 200) errors.push('Submission key is required and must be 200 characters or fewer');
  if (!input.customerName?.trim() || input.customerName.trim().length > 120) errors.push('Customer name is required and must be 120 characters or fewer');
  if (!input.customerSurname?.trim() || input.customerSurname.trim().length > 120) errors.push('Customer surname is required and must be 120 characters or fewer');
  if (!['cash', 'bank_transfer'].includes(input.paymentMethod ?? '')) errors.push('Payment method is invalid');
  if (!['pickup', 'meeting_point'].includes(input.deliveryMethod ?? '')) errors.push('Delivery method is invalid');
  if (!input.items?.length) errors.push('Cart cannot be empty');
  if (input.items && input.items.length > 50) errors.push('Cart cannot contain more than 50 items');
  if (input.items?.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) errors.push('Cart quantities are invalid');
  if (input.items && new Set(input.items.map(item => item.productId)).size !== input.items.length) errors.push('Cart cannot contain duplicate products');
  return errors;
}
