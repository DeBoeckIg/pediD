import { NextResponse } from 'next/server';

type ErrorOptions = { fallback: string; request?: Request; status?: number; code?: string; fields?: Record<string, string | string[]> };

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
  'Reassign every product before deleting this category',
  'Image file is required', 'Product id is required', 'Image order must contain between 1 and 6 unique image IDs', 'Image order must contain the exact current images',
  'Invalid product', 'Name must contain 1 to 160 characters', 'Category is required', 'At least one presentation is required', 'Label must contain 1 to 80 characters',
  'Price must be a non-negative whole-number ARS amount', 'Published must be a boolean',
  'Stock must be a non-negative integer',
  'Category name must contain 1 to 120 characters',
  'No se puede eliminar: la categoría tiene productos asociados. Reasigná esos productos primero.',
];
const validationMessages = new Set(safeMessages.filter((message) => message.includes('invalid') || message.includes('required') || message.includes('must contain') || message.includes('non-negative') || message.includes('cannot be empty') || message.includes('quantities') || message.includes('duplicate') || message.includes('policy')));

const translations: Record<string, [string, string]> = {
  'Invalid credentials': ['AUTH_INVALID_CREDENTIALS', 'Las credenciales no son válidas'],
  Unauthorized: ['AUTH_UNAUTHORIZED', 'No autorizado'], Forbidden: ['AUTH_FORBIDDEN', 'Acceso prohibido'],
  'Cart cannot be empty': ['CHECKOUT_CART_EMPTY', 'El carrito no puede estar vacío'],
  'Cart quantities are invalid': ['CHECKOUT_ITEMS_INVALID', 'Las cantidades del carrito no son válidas'],
  'Payment method is invalid': ['CHECKOUT_PAYMENT_INVALID', 'El medio de pago no es válido'],
  'Delivery method is invalid': ['CHECKOUT_DELIVERY_INVALID', 'El método de entrega no es válido'],
  'Customer phone must be a valid Argentine mobile number': ['CHECKOUT_PHONE_INVALID', 'El teléfono debe ser un celular argentino válido'],
  'Product unavailable': ['PRODUCT_UNAVAILABLE', 'El producto ya no está disponible'],
  'Invalid product': ['CATALOG_PRODUCT_INVALID', 'Los datos del producto no son válidos'],
  'Invalid image': ['MEDIA_INVALID', 'La imagen no es válida'],
  'Invalid category': ['CATALOG_CATEGORY_INVALID', 'Los datos de la categoría no son válidos'],
  'Invalid subscription': ['PUSH_SUBSCRIPTION_INVALID', 'La suscripción de notificaciones no es válida'],
  'Invalid endpoint': ['PUSH_ENDPOINT_INVALID', 'El endpoint de notificaciones no es válido'],
  'Push notifications are unavailable': ['PUSH_UNAVAILABLE', 'Las notificaciones push no están disponibles'],
};

function messageFor(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : '';
  if (/migration|supabase|postgres|database|function\s+public|could not find the function/i.test(message)) return fallback;
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
  const rawMessage = messageFor(error, options.fallback);
  const translated = translations[rawMessage];
  const message = translated?.[1] ?? (rawMessage === options.fallback || statusFor(error, rawMessage) === undefined && !validationMessages.has(rawMessage) ? 'No se pudo completar la solicitud' : rawMessage);
  const status = options.status ?? statusFor(error, rawMessage) ?? (rawMessage === 'Unauthorized' || rawMessage === 'Invalid credentials' ? 401 :
    rawMessage === 'Forbidden' ? 403 : rawMessage === 'Product unavailable' || rawMessage === 'Order status update conflict' || rawMessage.startsWith('Cannot change order status') || rawMessage.startsWith('Reassign') ? 409 : validationMessages.has(rawMessage) || rawMessage === 'Items must be an array' ? 400 : 500);
  const requestId = options.request?.headers.get('x-request-id')?.slice(0, 100) ?? crypto.randomUUID();
  const databaseCode = error && typeof error === 'object' && 'code' in error ? String(error.code).slice(0, 32) : '';
  const code = options.code ?? translated?.[0] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_INVALID');
  console.error(`[api-error] request=${requestId} status=${status}${databaseCode ? ` code=${databaseCode}` : ''} message=${rawMessage}`);
  return NextResponse.json({ code, message, ...(options.fields ? { fields: options.fields } : {}) }, { status, headers: { 'x-request-id': requestId } });
}
