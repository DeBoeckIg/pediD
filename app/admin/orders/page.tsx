import { requireAdmin } from '@/modules/auth/guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { listAdminOrders } from '@/modules/orders/admin-service';

const label = (value: string) => value.replace('_', ' ');

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ reference?: string; from?: string; to?: string }> }) {
  await requireAdmin();
  const filters = await searchParams;
  const orders = await listAdminOrders(await createSupabaseServerClient(), filters);

  return <main className="mx-auto max-w-6xl p-4">
    <h1 className="text-2xl font-bold">Order administration</h1>
    <form className="mt-4 grid gap-2 rounded border p-3 sm:grid-cols-4" method="get">
      <input name="reference" defaultValue={filters.reference} placeholder="Order reference" aria-label="Order reference" className="rounded border p-2" />
      <input name="from" defaultValue={filters.from} type="date" aria-label="From date" className="rounded border p-2" />
      <input name="to" defaultValue={filters.to} type="date" aria-label="To date" className="rounded border p-2" />
      <button className="rounded bg-black p-2 text-white" type="submit">Filter</button>
    </form>
    <div className="mt-6 grid gap-4">
      {orders.map((order: any) => <article className="rounded border p-4" key={order.id}>
        <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{order.order_reference}</h2><time dateTime={order.created_at}>{new Date(order.created_at).toLocaleString()}</time></div>
        <p>{order.customer_name} {order.customer_surname}</p>
        <p>Payment: {label(order.payment_method)} · Delivery: {label(order.delivery_method)}</p>
        <ul className="mt-3 list-inside list-disc">{(order.order_items ?? []).map((item: any) => <li key={item.id}>{item.quantity} × {item.product_name} (${item.unit_price_ars.toLocaleString('es-AR')} each)</li>)}</ul>
      </article>)}
      {!orders.length && <p>No orders found.</p>}
    </div>
  </main>;
}
