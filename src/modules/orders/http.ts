export function normalizeCheckoutPayload(body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const payload = body as Record<string, unknown>;
  return {
    ...payload,
    customerPhone: payload.customerPhone ?? payload.customer_phone,
    items: Array.isArray(payload.items)
      ? payload.items.map(item => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
        const checkoutItem = item as Record<string, unknown>;
        return {
          ...checkoutItem,
          productId: checkoutItem.productId ?? checkoutItem.product_id,
          variantId: checkoutItem.variantId ?? checkoutItem.variant_id,
        };
      })
      : payload.items,
  };
}
