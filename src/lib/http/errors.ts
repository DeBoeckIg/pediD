import { NextResponse } from 'next/server';

type ErrorOptions = { fallback: string; request?: Request; status?: number };

const safeMessages = [
  'Invalid credentials', 'Unauthorized', 'Forbidden', 'Invalid provisioning input',
  'Invalid password change', 'Password does not meet policy', 'Invalid image',
  'Product unavailable', 'Order status is invalid', 'Order status update conflict', 'Request body too large',
  'Cart cannot be empty', 'Cart cannot contain more than 50 items',
  'Cart quantities are invalid', 'Cart cannot contain duplicate products',
  'Payment method is invalid', 'Delivery method is invalid',
  'Submission key is required and must be 200 characters or fewer',
  'Customer name is required and must be 120 characters or fewer',
  'Customer surname is required and must be 120 characters or fewer',
  'Reassign every product before deleting this category',
  'Image file is required', 'Product id is required',
  'Name must contain 1 to 160 characters', 'Category is required',
  'Price must be a non-negative whole-number ARS amount',
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

export function apiError(error: unknown, options: ErrorOptions) {
  const message = messageFor(error, options.fallback);
  const status = options.status ?? (message === 'Unauthorized' || message === 'Invalid credentials' ? 401 :
    message === 'Forbidden' ? 403 : message === 'Product unavailable' || message === 'Order status update conflict' || message.startsWith('Cannot change order status') || message.startsWith('Reassign') ? 409 : validationMessages.has(message) ? 400 : 500);
  const requestId = options.request?.headers.get('x-request-id')?.slice(0, 100) ?? crypto.randomUUID();
  console.error(`[api-error] request=${requestId} status=${status} message=${message}`);
  return NextResponse.json({ error: message }, { status, headers: { 'x-request-id': requestId } });
}
