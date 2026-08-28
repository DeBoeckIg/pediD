export const ORDER_HANDOFF_STORAGE_KEY = 'pedid-order-handoff';

export type OrderHandoff = {
  reference: string;
  customerName: string;
  customerSurname: string;
  paymentMethod: string;
  deliveryMethod: string;
  items: { name: string; quantity: number; priceArs?: number }[];
};

export function persistOrderHandoff(storage: Pick<Storage, 'setItem'>, handoff: OrderHandoff) {
  storage.setItem(ORDER_HANDOFF_STORAGE_KEY, JSON.stringify(handoff));
}

export function formatWhatsAppMessage(handoff: OrderHandoff, currencyLabel = 'ARS'): string {
  const items = handoff.items.map(item => `- ${item.name} × ${item.quantity}`).join('\n');
  const hasAllPrices = handoff.items.every(item => typeof item.priceArs === 'number' && Number.isFinite(item.priceArs));
  const total = hasAllPrices ? handoff.items.reduce((sum, item) => sum + item.priceArs! * item.quantity, 0).toLocaleString('es-AR') : 'no disponible';
  return `Hola, quisiera confirmar el pedido ${handoff.reference}.\nCliente: ${handoff.customerName} ${handoff.customerSurname}\nPago: ${handoff.paymentMethod}\nEntrega: ${handoff.deliveryMethod}\nProductos:\n${items}\nTotal: ${currencyLabel} ${total}`;
}

export function getWhatsAppUrl(number: string | undefined, message: string): string | null {
  if (!number || !/^\d+$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
