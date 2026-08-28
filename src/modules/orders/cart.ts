export type NormalizedCartEntry = {
  productId: string;
  quantity: number;
  name?: string;
  priceArs?: number;
};

type CartProduct = { id: string; availability: 'available' | 'unavailable' };

function positiveInteger(value: unknown): number | null {
  const number = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(number) && Number.isInteger(number) && number > 0 ? number : null;
}

export function normalizeCartEntries(raw: string | null): NormalizedCartEntry[] {
  if (!raw) return [];

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(parsed)) return [];

  return parsed.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return [];
    const value = entry as Record<string, unknown>;
    const productId = value.productId ?? value.product_id;
    const quantity = positiveInteger(value.quantity);
    if (typeof productId !== 'string' || !productId.trim() || quantity === null) return [];

    const normalized: NormalizedCartEntry = { productId: productId.trim(), quantity };
    const name = value.name ?? value.productName;
    if (typeof name === 'string' && name.trim()) normalized.name = name;
    const price = value.priceArs ?? value.price_ars;
    if ((typeof price === 'number' || typeof price === 'string') && Number.isFinite(Number(price))) normalized.priceArs = Number(price);
    return [normalized];
  });
}

export function formatArsAmount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `ARS ${value.toLocaleString('es-AR')}` : 'Precio no disponible';
}

export function getCartEntrySubtotal(entry: NormalizedCartEntry): number | undefined {
  return entry.priceArs === undefined ? undefined : entry.priceArs * entry.quantity;
}

export function getCartTotal(entries: NormalizedCartEntry[]): number | undefined {
  if (!entries.length) return undefined;
  const subtotals = entries.map(getCartEntrySubtotal);
  return subtotals.every(subtotal => subtotal !== undefined)
    ? subtotals.reduce((total, subtotal) => total + subtotal!, 0)
    : undefined;
}

export function pruneCartEntries(entries: NormalizedCartEntry[], products: CartProduct[]): NormalizedCartEntry[] {
  const availableProductIds = new Set(products.filter(product => product.availability === 'available').map(product => product.id));
  return entries.filter(entry => availableProductIds.has(entry.productId));
}
