create or replace function public.update_order_status_atomic(
  order_id uuid,
  expected_status text,
  next_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_order public.orders;
  target_order_id uuid := order_id;
  current_status text := expected_status;
  target_status text := next_status;
begin
  if current_status not in ('pending', 'confirmed', 'completed', 'cancelled')
     or target_status not in ('pending', 'confirmed', 'completed', 'cancelled') then
    raise exception 'Order status is invalid';
  end if;

  if not ((current_status = 'pending' and target_status in ('confirmed', 'cancelled'))
       or (current_status = 'confirmed' and target_status in ('completed', 'cancelled'))) then
    raise exception 'Cannot change order status from % to %', current_status, target_status;
  end if;

  update public.orders
     set status = target_status
   where orders.id = target_order_id
     and orders.status = current_status
  returning * into updated_order;

  if not found then
    raise exception 'Order status update conflict';
  end if;

  return updated_order;
end;
$$;

revoke all on function public.update_order_status_atomic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.update_order_status_atomic(uuid, text, text) to service_role;
