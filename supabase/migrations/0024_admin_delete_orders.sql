create or replace function public.delete_order_atomic(order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.order_items where order_items.order_id = delete_order_atomic.order_id;
  delete from public.orders where orders.id = delete_order_atomic.order_id;
end;
$$;

revoke all on function public.delete_order_atomic(uuid) from public, anon, authenticated;
grant execute on function public.delete_order_atomic(uuid) to service_role;
