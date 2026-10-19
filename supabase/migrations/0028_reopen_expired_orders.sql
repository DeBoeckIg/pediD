-- Track why an order was cancelled and allow expired reservations to be reopened.
alter table public.orders add column if not exists cancel_reason text;

do $$
begin
  alter table public.orders add constraint orders_cancel_reason_check
    check (cancel_reason is null or cancel_reason in ('manual', 'expired'));
exception when duplicate_object then null;
end $$;

create or replace function public.expire_pending_order_reservations()
returns integer language plpgsql security definer set search_path = public as $$
declare
  expired_count integer := 0;
  expired_order_id uuid;
begin
  for expired_order_id in
    select o.id from public.orders as o
     where o.status = 'pending' and o.reservation_expires_at is not null and o.reservation_expires_at <= now()
     for update
  loop
    update public.orders as o set status = 'cancelled', cancel_reason = 'expired'
      where o.id = expired_order_id and o.status = 'pending';
    if found then
      perform public.restore_order_stock(expired_order_id);
      expired_count := expired_count + 1;
    end if;
  end loop;
  return expired_count;
end;
$$;

create or replace function public.update_order_status_atomic(order_id uuid, expected_status text, next_status text)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  target_order_id uuid := public.update_order_status_atomic.order_id;
  current_status text := public.update_order_status_atomic.expected_status;
  target_status text := public.update_order_status_atomic.next_status;
  updated_order public.orders;
begin
  if current_status not in ('pending', 'confirmed', 'completed', 'cancelled') or target_status not in ('pending', 'confirmed', 'completed', 'cancelled') then raise exception 'Order status is invalid'; end if;
  if not ((current_status = 'pending' and target_status in ('confirmed', 'cancelled')) or (current_status = 'confirmed' and target_status in ('completed', 'cancelled'))) then raise exception 'Cannot change order status from % to %', current_status, target_status; end if;
  update public.orders as o set status = target_status,
    cancel_reason = case when target_status = 'cancelled' then 'manual' else o.cancel_reason end
    where o.id = target_order_id and o.status = current_status returning o.* into updated_order;
  if not found then raise exception 'Order status update conflict'; end if;
  if target_status = 'cancelled' then perform public.restore_order_stock(target_order_id); end if;
  return updated_order;
end;
$$;

create or replace function public.reopen_expired_order(order_id uuid)
returns public.orders language plpgsql security definer set search_path = public as $$
declare
  target_order public.orders;
  item record;
  available_stock integer;
begin
  select o.* into target_order from public.orders as o where o.id = public.reopen_expired_order.order_id for update;
  if not found or target_order.status <> 'cancelled' or target_order.cancel_reason <> 'expired' then
    raise exception 'Only expired cancelled orders can be reopened';
  end if;

  -- Validate every line before changing any stock so failure rolls back atomically.
  for item in select oi.product_id, oi.variant_id, oi.quantity from public.order_items as oi where oi.order_id = target_order.id loop
    if item.variant_id is not null then
      select pv.stock_quantity into available_stock from public.product_variants as pv where pv.id = item.variant_id for update;
    else
      select p.stock_quantity into available_stock from public.products as p where p.id = item.product_id for update;
    end if;
    if available_stock is null or available_stock < item.quantity then raise exception 'Insufficient stock to reopen order'; end if;
  end loop;

  for item in select oi.product_id, oi.variant_id, oi.quantity from public.order_items as oi where oi.order_id = target_order.id loop
    if item.variant_id is not null then
      update public.product_variants set stock_quantity = stock_quantity - item.quantity where id = item.variant_id;
    else
      update public.products set stock_quantity = stock_quantity - item.quantity where id = item.product_id;
    end if;
  end loop;

  update public.orders set status = 'pending', cancel_reason = null, stock_restored_at = null,
    reservation_expires_at = now() + interval '30 minutes'
    where id = target_order.id returning * into target_order;
  return target_order;
end;
$$;

revoke all on function public.reopen_expired_order(uuid) from public, anon, authenticated;
grant execute on function public.reopen_expired_order(uuid) to service_role;
revoke all on function public.expire_pending_order_reservations() from public, anon, authenticated;
grant execute on function public.expire_pending_order_reservations() to service_role;
revoke all on function public.update_order_status_atomic(uuid,text,text) from public, anon, authenticated;
grant execute on function public.update_order_status_atomic(uuid,text,text) to service_role;
