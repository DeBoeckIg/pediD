export type CheckoutInput = {
  submissionKey: string;
  customerName: string;
  customerSurname: string;
  paymentMethod: 'cash' | 'bank_transfer';
  deliveryMethod: 'pickup' | 'meeting_point';
  items: { productId: string; quantity: number }[];
};

export function validateCheckoutInput(input: Partial<CheckoutInput>): string[] {
  const errors: string[] = [];
  if (!input.submissionKey?.trim()) errors.push('Submission key is required');
  if (!input.customerName?.trim()) errors.push('Customer name is required');
  if (!input.customerSurname?.trim()) errors.push('Customer surname is required');
  if (!['cash', 'bank_transfer'].includes(input.paymentMethod ?? '')) errors.push('Payment method is invalid');
  if (!['pickup', 'meeting_point'].includes(input.deliveryMethod ?? '')) errors.push('Delivery method is invalid');
  if (!input.items?.length) errors.push('Cart cannot be empty');
  if (input.items?.some(item => !item.productId || !Number.isInteger(item.quantity) || item.quantity < 1)) errors.push('Cart quantities are invalid');
  return errors;
}
