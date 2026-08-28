import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { listAdminOrders } from '@/modules/orders/admin-service';
import { calculateOrderTotal } from '@/modules/orders/totals';

const label = (value: string) => ({ pending: 'pendiente', confirmed: 'confirmado', completed: 'completado', cancelled: 'cancelado', cash: 'efectivo', bank_transfer: 'transferencia bancaria', pickup: 'retiro', meeting_point: 'punto de encuentro' }[value] ?? value.replace('_', ' '));

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ reference?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const orders = await listAdminOrders(createSupabaseAdminClient(), filters);

  return <main className="mx-auto max-w-6xl p-4">
    <nav className="mb-4 flex gap-4"><a href="/admin/catalog">Catálogo</a><a href="/admin/orders">Pedidos</a></nav>
    <h1 className="text-2xl font-bold">Administración de pedidos</h1>
    <form className="mt-4 grid gap-2 rounded border p-3 sm:grid-cols-4" method="get">
      <input name="reference" defaultValue={filters.reference} placeholder="Referencia del pedido" aria-label="Referencia del pedido" className="rounded border p-2" />
      <input name="from" defaultValue={filters.from} type="date" aria-label="Fecha desde" />
      <input name="to" defaultValue={filters.to} type="date" aria-label="Fecha hasta" />
      <button className="rounded bg-black p-2 text-white" type="submit">Filtrar</button>
    </form>
    <div className="mt-6 grid gap-4">
      {orders.map((order: any) => <article className="rounded border p-4" key={order.id}>
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{order.order_reference}</h2><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString()}</time></div>
        <p>{order.customer_name} {order.customer_surname}</p>
        <p>Status: {label(order.status)} · Payment: {label(order.payment_method)} · Delivery: {label(order.delivery_method)} · Total: ARS {calculateOrderTotal(order.order_items).toLocaleString('es-AR')}</p>
        <form className="mt-2 flex gap-2" action="/api/admin/orders/status" method="post"><input type="hidden" name="orderId" value={order.id} /><select name="status" defaultValue={order.status} className="rounded border p-2" aria-label={`Status for ${order.order_reference}`}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><button className="rounded bg-black px-3 text-white" type="submit">Update status</button></form>
        <ul className="mt-3 list-inside list-disc">{(order.order_items ?? []).map((item: any) => <li key={item.id}>{item.quantity} × {item.product_name} (${Number(item.unit_price_ars).toLocaleString('es-AR')} each)</li>)}</ul>
      </article>)}
      {!orders.length && <p>No orders found.</p>}
    </div>
  </main>;
}
