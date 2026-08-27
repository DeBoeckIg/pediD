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

export function formatWhatsAppMessage(handoff: OrderHandoff): string {
  const items = handoff.items.map(item => `- ${item.name} × ${item.quantity}`).join('\n');
  const total = handoff.items.reduce((sum, item) => sum + (item.priceArs ?? 0) * item.quantity, 0);
  return `Hello, I would like to confirm order ${handoff.reference}.\nCustomer: ${handoff.customerName} ${handoff.customerSurname}\nPayment: ${handoff.paymentMethod}\nDelivery: ${handoff.deliveryMethod}\nItems:\n${items}\nTotal: ARS ${total.toLocaleString('es-AR')}`;
}

export function getWhatsAppUrl(number: string | undefined, message: string): string | null {
  if (!number || !/^\d+$/.test(number)) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
