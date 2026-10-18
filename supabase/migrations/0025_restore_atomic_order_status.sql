create or replace function public.update_order_status_atomic(
  p_order_id uuid,
  p_expected_status text,
  p_next_status text
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_order public.orders;
begin
  if p_expected_status not in ('pending', 'confirmed', 'completed', 'cancelled')
     or p_next_status not in ('pending', 'confirmed', 'completed', 'cancelled') then
    raise exception 'Order status is invalid';
  end if;

  if not ((p_expected_status = 'pending' and p_next_status in ('confirmed', 'cancelled'))
       or (p_expected_status = 'confirmed' and p_next_status in ('completed', 'cancelled'))) then
    raise exception 'Cannot change order status from % to %', p_expected_status, p_next_status;
  end if;

  update public.orders
     set status = p_next_status
   where orders.id = p_order_id
     and orders.status = p_expected_status
  returning * into updated_order;

  if not found then
    raise exception 'Order status update conflict';
  end if;

  return updated_order;
end;
$$;

revoke all on function public.update_order_status_atomic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.update_order_status_atomic(uuid, text, text) to service_role;
