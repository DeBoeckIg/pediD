export type StatisticsFilter = { from?: string; to?: string };
export const LOW_STOCK_THRESHOLD = 5;

const amount = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const day = (value: unknown) => typeof value === 'string' ? value.slice(0, 10) : '';

export function aggregateAdminStatistics(orders: any[] = [], variants: any[] = [], filter: StatisticsFilter = {}) {
  const inRange = (order: any) => {
    const created = String(order?.created_at ?? '');
    return (!filter.from || created >= `${filter.from}T00:00:00.000Z`) && (!filter.to || created < `${filter.to}T23:59:59.999Z`);
  };
  const scoped = orders.filter(inRange);
  const completed = scoped.filter(order => order?.status === 'completed');
  const total = (order: any) => (Array.isArray(order?.order_items) ? order.order_items : []).reduce((sum: number, item: any) => sum + amount(item?.unit_price_ars) * amount(item?.quantity), 0);
  const salesTotal = completed.reduce((sum, order) => sum + total(order), 0);
  const daily = new Map<string, { date: string; total: number; orders: number }>();
  const products = new Map<string, { product: string; variant: string; quantity: number; total: number }>();
  completed.forEach(order => {
    const key = day(order.created_at); const row = daily.get(key) ?? { date: key, total: 0, orders: 0 };
    row.total += total(order); row.orders += 1; daily.set(key, row);
    (order.order_items ?? []).forEach((item: any) => { const product = String(item.product_name ?? 'Producto'); const variant = String(item.variant_label ?? ''); const id = `${product}\u0000${variant}`; const current = products.get(id) ?? { product, variant, quantity: 0, total: 0 }; current.quantity += amount(item.quantity); current.total += amount(item.unit_price_ars) * amount(item.quantity); products.set(id, current); });
  });
  const pending = scoped.filter(order => order?.status === 'pending').map(order => ({ id: order.id, reference: order.order_reference, customer: `${order.customer_name ?? ''} ${order.customer_surname ?? ''}`.trim(), createdAt: order.created_at, total: total(order), items: (order.order_items ?? []).reduce((n: number, item: any) => n + amount(item.quantity), 0) }));
  return { filters: filter, kpis: { completedSalesTotal: salesTotal, completedOrderCount: completed.length, averageCompletedTicket: completed.length ? salesTotal / completed.length : 0, confirmedPipelineTotal: scoped.filter(o => o?.status === 'confirmed').reduce((sum, o) => sum + total(o), 0), pendingCount: pending.length }, dailyCompletedSales: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)), topProducts: [...products.values()].sort((a, b) => b.total - a.total || b.quantity - a.quantity), pendingOrders: pending, lowStock: variants.filter(v => amount(v.stock_quantity) <= LOW_STOCK_THRESHOLD).map(v => ({ id: v.id, product: v.product_name ?? v.product?.name ?? 'Producto', variant: v.label ?? v.variant_label ?? '', stock: amount(v.stock_quantity) })) };
}

export async function getAdminStatistics(client: any, filter: StatisticsFilter = {}) {
  let query = client.from('orders').select('id,order_reference,customer_name,customer_surname,status,created_at,order_items(id,product_name,variant_label,unit_price_ars,quantity)').order('created_at', { ascending: true });
  if (filter.from?.trim()) query = query.gte('created_at', `${filter.from.trim()}T00:00:00.000Z`);
  if (filter.to?.trim()) query = query.lt('created_at', `${filter.to.trim()}T23:59:59.999Z`);
  const [ordersResult, variantsResult] = await Promise.all([query, client.from('product_variants').select('id,label,stock_quantity,products(name)').is('deleted_at', null)]);
  if (ordersResult.error) throw ordersResult.error; if (variantsResult.error) throw variantsResult.error;
  const variants = (variantsResult.data ?? []).map((v: any) => ({ ...v, product_name: v.products?.name }));
  return aggregateAdminStatistics(ordersResult.data ?? [], variants, filter);
}
