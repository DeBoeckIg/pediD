export type CheckoutInput = {
  submissionKey: string;
  customerName: string;
  customerSurname: string;
  customerPhone: string;
  paymentMethod: 'cash' | 'bank_transfer';
  deliveryMethod: 'pickup' | 'meeting_point';
  items: { productId: string; variantId?: string; quantity: number }[];
};

const argentineAreaCodes = new Set(['11', '220', '221', '223', '230', '236', '237', '249', '260', '261', '280', '290', '291', '294', '2954', '2966', '299', '336', '341', '342', '343', '345', '348', '351', '353', '358', '362', '364', '370', '376', '379', '380', '381', '383', '385', '387', '388']);

export function normalizeArgentineMobile(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || /[a-z]/i.test(value)) return null;
  const raw = value.trim();
  const international = raw.startsWith('+54') || raw.replace(/[\s().-]/g, '').startsWith('54');
  let digits = raw.replace(/\D/g, '');
  if (international) {
    if (!digits.startsWith('549')) return null;
    digits = digits.slice(3);
  } else if (digits.startsWith('0')) digits = digits.slice(1);
  const areaCode = [...argentineAreaCodes].find(code => digits.startsWith(code));
  if (!areaCode) return null;
  const subscriberWithPrefix = digits.slice(areaCode.length);
  const subscriber = subscriberWithPrefix.startsWith('15') ? subscriberWithPrefix.slice(2) : subscriberWithPrefix;
  digits = `${areaCode}${subscriber}`;
  if (digits.length !== 10 || /^(\d)\1+$/.test(digits) || /^(.{2,5})\1+$/.test(digits)) return null;
  return `+549${digits}`;
}

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
  if (!normalizeArgentineMobile(input.customerPhone)) errors.push('Customer phone must be a valid Argentine mobile number');
  if (!['cash', 'bank_transfer'].includes(input.paymentMethod ?? '')) errors.push('Payment method is invalid');
  if (!['pickup', 'meeting_point'].includes(input.deliveryMethod ?? '')) errors.push('Delivery method is invalid');
  if (!input.items?.length) errors.push('Cart cannot be empty');
  if (input.items && input.items.length > 50) errors.push('Cart cannot contain more than 50 items');
  if (input.items?.some(item => !item.productId || (item.variantId !== undefined && !item.variantId) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) errors.push('Cart quantities are invalid');
  if (input.items && new Set(input.items.map(item => `${item.productId}:${item.variantId ?? ''}`)).size !== input.items.length) errors.push('Cart cannot contain duplicate products');
  return errors;
}
