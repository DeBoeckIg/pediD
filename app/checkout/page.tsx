'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { persistOrderHandoff } from '@/modules/orders/whatsapp';
import { normalizeCartEntries } from '@/modules/orders/cart';
import { toCheckoutItems } from '../catalog/catalog-client';

export default function CheckoutPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const items = normalizeCartEntries(localStorage.getItem('pedid-cart'));
    if (!items.length) { setError('Your cart is empty or invalid. Please add a product and try again.'); return; }
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      submissionKey: crypto.randomUUID(), customerName: form.get('customerName'), customerSurname: form.get('customerSurname'),
      paymentMethod: form.get('paymentMethod'), deliveryMethod: form.get('deliveryMethod'), items: toCheckoutItems(items),
    }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'Unable to submit order'); return; }
    const reference = result.order_reference ?? result.orderReference ?? result;
    persistOrderHandoff(sessionStorage, { reference, customerName: String(form.get('customerName')), customerSurname: String(form.get('customerSurname')), paymentMethod: String(form.get('paymentMethod')), deliveryMethod: String(form.get('deliveryMethod')), items: items.map(item => ({ name: item.name ?? `Product ${item.productId}`, quantity: item.quantity, ...(item.priceArs === undefined ? {} : { priceArs: item.priceArs }) })) });
    localStorage.removeItem('pedid-cart'); router.push(`/order-confirmation?reference=${encodeURIComponent(reference)}`);
  }
  return <main className="mx-auto max-w-xl p-4"><h1 className="text-2xl font-bold">Checkout</h1><form className="mt-4 grid gap-3" onSubmit={submit}>
    <input name="customerName" required placeholder="Name" className="rounded border p-2" /><input name="customerSurname" required placeholder="Surname" className="rounded border p-2" />
    <label>Payment method<select name="paymentMethod" className="ml-2 rounded border p-2"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option></select></label>
    <label>Delivery method<select name="deliveryMethod" className="ml-2 rounded border p-2"><option value="pickup">Pickup</option><option value="meeting_point">Meeting point</option></select></label>
    {error && <p role="alert">{error}</p>}<button className="rounded bg-black p-2 text-white" type="submit">Place order</button>
  </form></main>;
}
