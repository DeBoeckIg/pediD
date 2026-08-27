export function normalizeCheckoutPayload(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const payload = body as Record<string, unknown>;
  return {
    ...payload,
    items: Array.isArray(payload.items)
      ? payload.items.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
        const checkoutItem = item as Record<string, unknown>;
        return { ...checkoutItem, productId: checkoutItem.product_id };
      })
      : payload.items,
  };
}
