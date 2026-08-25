alter table public.orders add column status text not null default 'pending' check (status in ('pending', 'confirmed', 'completed', 'cancelled'));
update public.orders set status = 'pending' where status is null;
create policy admin_orders_update on public.orders for update to service_role using (true) with check (true);
