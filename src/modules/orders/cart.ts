export type NormalizedCartEntry = {
  productId: string;
  variantId?: string;
  quantity: number;
  name?: string;
  variantLabel?: string;
  priceArs?: number;
};

type CartProduct = { id: string; availability: 'available' | 'unavailable'; variants?: { id: string; availability: 'available' | 'unavailable' }[] };

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
    const variantId = value.variantId ?? value.variant_id;
    if (typeof variantId === 'string' && variantId.trim()) normalized.variantId = variantId.trim();
    const name = value.name ?? value.productName;
    if (typeof name === 'string' && name.trim()) normalized.name = name;
    const variantLabel = value.variantLabel ?? value.variant_label;
    if (typeof variantLabel === 'string' && variantLabel.trim()) normalized.variantLabel = variantLabel.trim();
    const price = value.priceArs ?? value.price_ars;
    if ((typeof price === 'number' || typeof price === 'string') && Number.isFinite(Number(price))) normalized.priceArs = Number(price);
    return [normalized];
  });
}

export function formatArsAmount(value: number | undefined, currencyLabel = 'ARS'): string {
  return typeof value === 'number' && Number.isFinite(value) ? `${currencyLabel} ${value.toLocaleString('es-AR')}` : 'Precio no disponible';
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
  const available = new Map(products.map(product => [product.id, product]));
  return entries.filter(entry => { const product = available.get(entry.productId); if (!product) return false; if (!entry.variantId) return product.availability === 'available'; return product.variants?.some(variant => variant.id === entry.variantId && variant.availability === 'available') ?? false; });
}
