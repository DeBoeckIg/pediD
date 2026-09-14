create or replace function public.update_order_status_atomic(order_id uuid, expected_status text, next_status text)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare updated_order public.orders;
begin
  if expected_status not in ('pending', 'confirmed', 'completed', 'cancelled')
     or next_status not in ('pending', 'confirmed', 'completed', 'cancelled') then
    raise exception 'Order status is invalid';
  end if;

  if not ((expected_status = 'pending' and next_status in ('confirmed', 'cancelled'))
       or (expected_status = 'confirmed' and next_status in ('completed', 'cancelled'))) then
    raise exception 'Cannot change order status from % to %', expected_status, next_status;
  end if;

  update public.orders
     set status = next_status
   where id = order_id
     and status = expected_status
  returning * into updated_order;

  if not found then
    raise exception 'Order status update conflict';
  end if;
  return updated_order;
end;
$$;

revoke all on function public.update_order_status_atomic(uuid, text, text) from public, anon, authenticated;
grant execute on function public.update_order_status_atomic(uuid, text, text) to service_role;
