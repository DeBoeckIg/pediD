import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminOrders } from '@/modules/orders/admin-service';
import { calculateOrderTotal } from '@/modules/orders/totals';
import { installationConfig } from '@/config/installation';

const label = (value: string) => ({ pending: 'pendiente', confirmed: 'confirmado', completed: 'completado', cancelled: 'cancelado', cash: 'efectivo', bank_transfer: 'transferencia bancaria', pickup: 'retiro', meeting_point: 'punto de encuentro' }[value] ?? value.replace('_', ' '));

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ reference?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const orders = await listAdminOrders(createSupabaseAdminClient(), filters);

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
    <nav className="mb-8 flex gap-5 border-b border-slate-200 pb-4 text-sm font-semibold"><a className="text-slate-500 hover:text-indigo-600" href="/admin/catalog">Catálogo</a><a className="text-indigo-600" href="/admin/orders">Pedidos</a></nav>
    <h1 className="text-3xl font-bold tracking-tight">Administración de pedidos</h1>
    <form className="mt-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4" method="get">
      <input name="reference" defaultValue={filters.reference} placeholder="Referencia del pedido" aria-label="Referencia del pedido" className="rounded border p-2" />
      <input name="from" defaultValue={filters.from} type="date" aria-label="Fecha desde" />
      <input name="to" defaultValue={filters.to} type="date" aria-label="Fecha hasta" />
      <button className="rounded-lg bg-indigo-600 p-2 font-semibold text-white hover:bg-indigo-700" type="submit">Filtrar</button>
    </form>
    <div className="mt-6 grid gap-4">
      {orders.map((order: any) => <article className="rounded border p-4" key={order.id}>
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{order.order_reference}</h2><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString()}</time></div>
        <p>{order.customer_name} {order.customer_surname}</p>
        <p>Estado: {label(order.status)} · Pago: {label(order.payment_method)} · Entrega: {label(order.delivery_method)} · Total: {installationConfig.currencyLabel} {calculateOrderTotal(order.order_items).toLocaleString('es-AR')}</p>
        <form className="mt-2 flex gap-2" action="/api/admin/orders/status" method="post"><input type="hidden" name="orderId" value={order.id} /><select name="status" defaultValue={order.status} className="rounded border p-2" aria-label={`Status for ${order.order_reference}`}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><button className="rounded bg-black px-3 text-white" type="submit">Update status</button></form>
        <ul className="mt-3 list-inside list-disc">{(order.order_items ?? []).map((item: any) => <li key={item.id}>{item.quantity} × {item.product_name} (${Number(item.unit_price_ars).toLocaleString('es-AR')} each)</li>)}</ul>
      </article>)}
      {!orders.length && <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">No se encontraron pedidos.</p>}
    </div>
  </main>;
}
