create extension if not exists pgcrypto;
create table public.installation_config (id uuid primary key default gen_random_uuid(), business_code text not null unique check (length(business_code) between 3 and 80), password_hash text not null, password_changed_at timestamptz, created_at timestamptz not null default now());
create table public.categories (id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 1 and 120), created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), category_id uuid not null references public.categories(id) on update cascade, name text not null check (length(trim(name)) between 1 and 160), description text not null default '', price_ars integer not null check (price_ars >= 0), stock_quantity integer not null default 0 check (stock_quantity >= 0), published boolean not null default false, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.product_images (id uuid primary key default gen_random_uuid(), product_id uuid not null unique references public.products(id) on delete cascade, object_path text not null unique, mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')), byte_size integer not null check (byte_size > 0 and byte_size <= 5242880), created_at timestamptz not null default now());
create table public.orders (id uuid primary key default gen_random_uuid(), order_reference text not null unique check (length(order_reference) >= 32), submission_key text not null unique, customer_name text not null, customer_surname text not null, payment_method text not null check (payment_method in ('cash','bank_transfer')), delivery_method text not null check (delivery_method in ('pickup','meeting_point')), created_at timestamptz not null default now());
create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), product_id uuid references public.products(id) on delete set null, product_name text not null, unit_price_ars integer not null check (unit_price_ars >= 0), quantity integer not null check (quantity > 0));
create table public.storage_cleanup_jobs (id uuid primary key default gen_random_uuid(), object_path text not null unique, attempts integer not null default 0, next_attempt_at timestamptz not null default now(), completed_at timestamptz);
create index products_public_idx on public.products(category_id) where deleted_at is null and published;
create index cleanup_pending_idx on public.storage_cleanup_jobs(next_attempt_at) where completed_at is null;
create view public.public_catalog with (security_invoker=true) as select p.id,p.category_id,c.name category_name,p.name,p.description,p.price_ars,case when p.stock_quantity > 0 then 'available' else 'unavailable' end::text availability,i.object_path image_path from public.products p join public.categories c on c.id=p.category_id left join public.product_images i on i.product_id=p.id where p.deleted_at is null and p.published;
alter table public.installation_config enable row level security; alter table public.categories enable row level security; alter table public.products enable row level security; alter table public.product_images enable row level security; alter table public.orders enable row level security; alter table public.order_items enable row level security; alter table public.storage_cleanup_jobs enable row level security;
create policy public_catalog_read on public.categories for select to anon, authenticated using (exists(select 1 from public.products p where p.category_id=id and p.published and p.deleted_at is null));
create policy public_products_read on public.products for select to anon, authenticated using (published and deleted_at is null);
create policy public_images_read on public.product_images for select to anon, authenticated using (exists(select 1 from public.products p where p.id=product_id and p.published and p.deleted_at is null));
create policy admin_config on public.installation_config for all to service_role using (true) with check (true);
create policy admin_orders on public.orders for select to service_role using (true); create policy admin_items on public.order_items for select to service_role using (true); create policy admin_cleanup on public.storage_cleanup_jobs for all to service_role using (true) with check (true);
insert into storage.buckets (id,name,public) values ('product-images','product-images',false) on conflict (id) do nothing;
create policy product_images_storage_admin on storage.objects for all to service_role using (bucket_id='product-images') with check (bucket_id='product-images');
grant usage on schema public to service_role;
grant all on table public.installation_config, public.categories, public.products, public.product_images, public.orders, public.order_items, public.storage_cleanup_jobs to service_role;
revoke all on table public.products from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.product_images from anon, authenticated;
grant select on public.public_catalog to anon, authenticated;
create or replace function public.checkout(submission_key text, customer_name text, customer_surname text, payment_method text, delivery_method text, items jsonb)
returns jsonb language plpgsql security definer set search_path=public, extensions as $$
declare existing_ref text; item jsonb; product_row products%rowtype; order_id uuid; reference text := encode(gen_random_bytes(24),'hex');
begin
  select order_reference into existing_ref from orders where orders.submission_key=checkout.submission_key;
  if existing_ref is not null then return jsonb_build_object('order_reference',existing_ref,'duplicate',true); end if;
  if jsonb_array_length(items) = 0 then raise exception 'cart is empty'; end if;
  insert into orders(order_reference,submission_key,customer_name,customer_surname,payment_method,delivery_method) values(reference,checkout.submission_key,checkout.customer_name,checkout.customer_surname,checkout.payment_method,checkout.delivery_method) returning id into order_id;
  for item in select * from jsonb_array_elements(items) loop
    update products set stock_quantity=stock_quantity-(item->>'quantity')::integer where id=(item->>'product_id')::uuid and published and deleted_at is null and stock_quantity >= (item->>'quantity')::integer returning * into product_row;
    if not found then raise exception 'product unavailable'; end if;
    insert into order_items(order_id,product_id,product_name,unit_price_ars,quantity) values(order_id,product_row.id,product_row.name,product_row.price_ars,(item->>'quantity')::integer);
  end loop;
  return jsonb_build_object('order_reference',reference,'duplicate',false);
exception when others then raise;
end $$;
revoke all on function public.checkout(text,text,text,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.checkout(text,text,text,text,text,jsonb) to anon, authenticated;
