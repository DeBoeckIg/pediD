export type PersistedOrderItem = {
  unit_price_ars?: unknown;
  quantity?: unknown;
};

export function calculateOrderTotal(items: readonly PersistedOrderItem[] | null | undefined): number {
  return (items ?? []).reduce((total, item) => {
    const unitPrice = Number(item?.unit_price_ars);
    const quantity = Number(item?.quantity);
    if (!Number.isFinite(unitPrice) || !Number.isFinite(quantity)) return total;
    return total + unitPrice * quantity;
  }, 0);
}
