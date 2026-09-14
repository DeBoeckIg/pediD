'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { persistOrderHandoff } from '@/modules/orders/whatsapp';
import { formatArsAmount, getCartEntrySubtotal, getCartTotal, normalizeCartEntries, type NormalizedCartEntry } from '@/modules/orders/cart';
import { toCheckoutItems } from '../catalog/catalog-client';
import { generateSubmissionKey } from '@/modules/orders/submission-key';
import { installationConfig } from '@/config/installation';

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
      submissionKey: generateSubmissionKey(), customerName: form.get('customerName'), customerSurname: form.get('customerSurname'),
      paymentMethod: form.get('paymentMethod'), deliveryMethod: form.get('deliveryMethod'), items: toCheckoutItems(currentItems),
    }) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? 'No se pudo enviar el pedido.'); return; }
    const reference = result.order_reference ?? result.orderReference ?? result;
    persistOrderHandoff(sessionStorage, { reference, customerName: String(form.get('customerName')), customerSurname: String(form.get('customerSurname')), paymentMethod: String(form.get('paymentMethod')), deliveryMethod: String(form.get('deliveryMethod')), items: currentItems.map(item => ({ name: item.name ?? `Product ${item.productId}`, ...(item.variantLabel ? { presentation: item.variantLabel } : {}), quantity: item.quantity, ...(item.priceArs === undefined ? {} : { priceArs: item.priceArs }) })) });
    localStorage.removeItem('pedid-cart'); router.push(`/order-confirmation?reference=${encodeURIComponent(reference)}`);
  }
  const total = getCartTotal(items);
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6"><a className="text-sm font-semibold text-indigo-600 hover:text-indigo-700" href="/catalog">← Volver al catálogo</a><h1 className="mt-3 text-3xl font-bold tracking-tight">Finalizar compra</h1>
    <section className="mt-4 rounded border p-4" aria-label="Resumen del pedido"><h2 className="font-semibold">Resumen del pedido</h2>{items.length ? <><ul className="mt-2 grid gap-2">{items.map(item => <li className="flex justify-between gap-4" key={`${item.productId}:${item.variantId ?? ''}`}><span>{item.name ?? `Producto ${item.productId}`}{item.variantLabel ? ` · ${item.variantLabel}` : ''} × {item.quantity} ({formatArsAmount(item.priceArs, installationConfig.currencyLabel)} cada uno)</span><span>{formatArsAmount(getCartEntrySubtotal(item), installationConfig.currencyLabel)}</span></li>)}</ul><p className="mt-3 border-t pt-3 font-semibold">Total: {formatArsAmount(total, installationConfig.currencyLabel)}</p></> : <p className="mt-2">Tu carrito está vacío. Agregá un producto antes de finalizar la compra.</p>}</section>
     <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" onSubmit={submit}>
    <fieldset disabled={!items.length} className="grid gap-3">
     <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-sm font-medium">Nombre<input name="customerName" required placeholder="Nombre" aria-label="Nombre" className="rounded-lg border border-slate-300 p-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" /></label><label className="grid gap-1 text-sm font-medium">Apellido<input name="customerSurname" required placeholder="Apellido" aria-label="Apellido" className="rounded-lg border border-slate-300 p-2.5 font-normal focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200" /></label></div>
     <label className="grid gap-1 text-sm font-medium">Medio de pago<select name="paymentMethod" className="rounded-lg border border-slate-300 p-2.5 font-normal focus:border-indigo-500 focus:outline-none"><option value="cash">Efectivo</option><option value="bank_transfer">Transferencia bancaria</option></select></label>
     <label className="grid gap-1 text-sm font-medium">Modalidad de entrega<select name="deliveryMethod" className="rounded-lg border border-slate-300 p-2.5 font-normal focus:border-indigo-500 focus:outline-none"><option value="pickup">Retiro</option><option value="meeting_point">Punto de encuentro</option></select></label>
     {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}<button className="rounded-lg bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" type="submit">Confirmar pedido</button></fieldset>
  </form></main>;
}
