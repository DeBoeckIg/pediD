import { NextResponse } from 'next/server';

type ErrorOptions = { fallback: string; request?: Request; status?: number };

const safeMessages = [
  'Invalid credentials', 'Unauthorized', 'Forbidden', 'Invalid provisioning input',
  'Invalid password change', 'Password does not meet policy', 'Invalid image',
  'Product unavailable', 'Order status is invalid', 'Order status update conflict', 'Request body too large',
  'Cart cannot be empty', 'Cart cannot contain more than 50 items',
  'Cart quantities are invalid', 'Cart cannot contain duplicate products',
  'Submission key is invalid', 'Customer name is invalid', 'Customer surname is invalid',
  'Items must be an array', 'Cart items are invalid',
  'Payment method is invalid', 'Delivery method is invalid',
  'Submission key is required and must be 200 characters or fewer',
  'Customer name is required and must be 120 characters or fewer',
  'Customer surname is required and must be 120 characters or fewer',
  'Customer phone must be a valid Argentine mobile number',
  'Customer phone is invalid',
  'Checkout RPC is unavailable: apply migration 0021_checkout_customer_phone.sql to the database',
  'Reassign every product before deleting this category',
  'Image file is required', 'Product id is required', 'Image order must contain between 1 and 6 unique image IDs', 'Image order must contain the exact current images', 'Image reorder is unavailable: apply migration 0013_atomic_product_image_reorder.sql to the database',
  'Invalid product', 'Name must contain 1 to 160 characters', 'Category is required', 'At least one presentation is required', 'Label must contain 1 to 80 characters',
  'Price must be a non-negative whole-number ARS amount', 'Published must be a boolean',
  'Stock must be a non-negative integer',
  'Category name must contain 1 to 120 characters',
  'No se puede eliminar: la categoría tiene productos asociados. Reasigná esos productos primero.',
];
const validationMessages = new Set(safeMessages.filter((message) => message.includes('invalid') || message.includes('required') || message.includes('must contain') || message.includes('non-negative') || message.includes('cannot be empty') || message.includes('quantities') || message.includes('duplicate') || message.includes('policy')));

function messageFor(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (safeMessages.includes(message)) return message;
  if (/^Cannot change order status from (pending|confirmed|completed|cancelled) to (pending|confirmed|completed|cancelled)$/.test(message)) return message;
  if (/^(Category has associated products|Product id is required)/.test(message)) return message;
  return fallback;
}

function statusFor(error: unknown, message: string) {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (message === 'Product unavailable' || message === 'Order status update conflict' || message.startsWith('Cannot change order status') || message.startsWith('Reassign')) return 409;
  if (code === '23505' || code === '40001' || code === '40P01') return 409;
  if (code === '22P02' || code === '23514' || code === '23502' || code === '22001') return 400;
  return undefined;
}

export function apiError(error: unknown, options: ErrorOptions) {
  const message = messageFor(error, options.fallback);
  const status = options.status ?? statusFor(error, message) ?? (message === 'Unauthorized' || message === 'Invalid credentials' ? 401 :
    message === 'Forbidden' ? 403 : message === 'Checkout RPC is unavailable: apply migration 0021_checkout_customer_phone.sql to the database' ? 503 : message === 'Product unavailable' || message === 'Order status update conflict' || message.startsWith('Cannot change order status') || message.startsWith('Reassign') ? 409 : validationMessages.has(message) || message === 'Items must be an array' ? 400 : 500);
  const requestId = options.request?.headers.get('x-request-id')?.slice(0, 100) ?? crypto.randomUUID();
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code).slice(0, 32) : '';
  console.error(`[api-error] request=${requestId} status=${status}${code ? ` code=${code}` : ''} message=${message}`);
  return NextResponse.json({ error: message }, { status, headers: { 'x-request-id': requestId } });
}
