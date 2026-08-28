'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { persistOrderHandoff } from '@/modules/orders/whatsapp';
import { formatArsAmount, getCartEntrySubtotal, getCartTotal, normalizeCartEntries, type NormalizedCartEntry } from '@/modules/orders/cart';
import { toCheckoutItems } from '../catalog/catalog-client';

export default function CheckoutPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [items, setItems] = useState<NormalizedCartEntry[]>([]);
  useEffect(() => { setItems(normalizeCartEntries(localStorage.getItem('pedid-cart'))); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const form = new FormData(event.currentTarget);
    const currentItems = normalizeCartEntries(localStorage.getItem('pedid-cart'));
    if (!currentItems.length) { setItems([]); setError('Tu carrito está vacío o no es válido. Agregá un producto e intentá nuevamente.'); return; }
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
      submissionKey: crypto.randomUUID(), customerName: form.get('customerName'), customerSurname: form.get('customerSurname'),
      paymentMethod: form.get('paymentMethod'), deliveryMethod: form.get('deliveryMethod'), items: toCheckoutItems(currentItems),
    }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'No se pudo enviar el pedido.'); return; }
    const reference = result.order_reference ?? result.orderReference ?? result;
    persistOrderHandoff(sessionStorage, { reference, customerName: String(form.get('customerName')), customerSurname: String(form.get('customerSurname')), paymentMethod: String(form.get('paymentMethod')), deliveryMethod: String(form.get('deliveryMethod')), items: currentItems.map(item => ({ name: item.name ?? `Product ${item.productId}`, quantity: item.quantity, ...(item.priceArs === undefined ? {} : { priceArs: item.priceArs }) })) });
    localStorage.removeItem('pedid-cart'); router.push(`/order-confirmation?reference=${encodeURIComponent(reference)}`);
  }
  const total = getCartTotal(items);
  return <main className="mx-auto max-w-xl p-4"><h1 className="text-2xl font-bold">Finalizar compra</h1>
    <section className="mt-4 rounded border p-4" aria-label="Resumen del pedido"><h2 className="font-semibold">Resumen del pedido</h2>{items.length ? <><ul className="mt-2 grid gap-2">{items.map(item => <li className="flex justify-between gap-4" key={item.productId}><span>{item.name ?? `Producto ${item.productId}`} × {item.quantity} ({formatArsAmount(item.priceArs)} cada uno)</span><span>{formatArsAmount(getCartEntrySubtotal(item))}</span></li>)}</ul><p className="mt-3 border-t pt-3 font-semibold">Total: {formatArsAmount(total)}</p></> : <p className="mt-2">Tu carrito está vacío. Agregá un producto antes de finalizar la compra.</p>}</section>
    <form className="mt-4 grid gap-3" onSubmit={submit}>
    <fieldset disabled={!items.length} className="grid gap-3">
    <input name="customerName" required placeholder="Nombre" aria-label="Nombre" className="rounded border p-2" /><input name="customerSurname" required placeholder="Apellido" aria-label="Apellido" className="rounded border p-2" />
    <label>Medio de pago<select name="paymentMethod" className="ml-2 rounded border p-2"><option value="cash">Efectivo</option><option value="bank_transfer">Transferencia bancaria</option></select></label>
    <label>Modalidad de entrega<select name="deliveryMethod" className="ml-2 rounded border p-2"><option value="pickup">Retiro</option><option value="meeting_point">Punto de encuentro</option></select></label>
    {error && <p role="alert">{error}</p>}<button className="rounded bg-black p-2 text-white" type="submit">Confirmar pedido</button></fieldset>
  </form></main>;
}
