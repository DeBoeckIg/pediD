export type AdminOrderFilter = {
  reference?: string;
  from?: string;
  to?: string;
};

export async function listAdminOrders(client: any, filter: AdminOrderFilter = {}) {
  let query = client
    .from('orders')
    .select('id, order_reference, customer_name, customer_surname, payment_method, delivery_method, created_at, order_items(id, product_id, product_name, unit_price_ars, quantity)')
    .order('created_at', { ascending: false });

  if (filter.reference?.trim()) query = query.ilike('order_reference', `%${filter.reference.trim()}%`);
  if (filter.from?.trim()) query = query.gte('created_at', filter.from.trim());
  if (filter.to?.trim()) query = query.lt('created_at', `${filter.to.trim()}T23:59:59.999Z`);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
