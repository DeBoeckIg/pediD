alter table public.product_images drop constraint if exists product_images_product_id_key;
drop index if exists public.product_images_one_primary;
alter table public.product_images add column if not exists is_primary boolean not null default false;
alter table public.product_images add column if not exists sort_order integer not null default 0 check (sort_order >= 0);
update public.product_images set is_primary = true where id in (select distinct on (product_id) id from public.product_images order by product_id, created_at, id);
create unique index product_images_one_primary on public.product_images(product_id) where is_primary;
create index product_images_product_order_idx on public.product_images(product_id, sort_order, created_at);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  label text not null check (length(trim(label)) between 1 and 160),
  unit_type text not null check (unit_type in ('grams','kilograms','unit')),
  quantity numeric check (quantity is null or quantity > 0), price_ars integer not null check (price_ars >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0), sort_order integer not null default 0 check (sort_order >= 0),
  published boolean not null default false, deleted_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint product_variants_quantity_by_unit check ((unit_type = 'unit' and quantity is null) or (unit_type in ('grams','kilograms') and quantity is not null))
);
create index product_variants_public_idx on public.product_variants(product_id, sort_order) where published and deleted_at is null;
create unique index product_variants_label_active_idx on public.product_variants(product_id, lower(label)) where deleted_at is null;
alter table public.product_variants enable row level security;
create policy product_variants_read on public.product_variants for select to anon, authenticated using (published and deleted_at is null and exists (select 1 from public.products p where p.id=product_id and p.published and p.deleted_at is null));
grant all on table public.product_variants to service_role;
revoke all on table public.product_variants from anon, authenticated;

alter table public.order_items add column if not exists variant_id uuid references public.product_variants(id) on delete set null;
alter table public.order_items add column if not exists variant_label text;
alter table public.order_items add column if not exists variant_unit_type text;
alter table public.order_items add column if not exists variant_quantity numeric;
alter table public.order_items add constraint order_items_variant_unit_type_check check (variant_unit_type is null or variant_unit_type in ('grams','kilograms','unit'));

insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, sort_order, published)
select p.id, 'Standard', 'unit', p.price_ars, p.stock_quantity, 0, p.published
from public.products p
where not exists (select 1 from public.product_variants v where v.product_id=p.id and lower(v.label)=lower('Standard') and v.deleted_at is null);

create or replace view public.public_catalog with (security_invoker=true) as
 select p.id,p.category_id,c.name category_name,p.name,p.description,p.price_ars,case when p.stock_quantity > 0 then 'available' else 'unavailable' end::text availability,i.object_path image_path,
   coalesce((select jsonb_agg(pi.object_path order by pi.is_primary desc, pi.sort_order, pi.created_at, pi.id) from public.product_images pi where pi.product_id=p.id), '[]'::jsonb) image_paths,
   v.id variant_id,v.label variant_label,v.price_ars variant_price_ars,case when v.stock_quantity > 0 then 'available' else 'unavailable' end::text variant_availability,v.sort_order variant_sort_order
 from public.products p join public.categories c on c.id=p.category_id
 left join lateral (select object_path from public.product_images i where i.product_id=p.id order by i.is_primary desc, i.sort_order, i.created_at, i.id limit 1) i on true
 left join public.product_variants v on v.product_id=p.id and v.published and v.deleted_at is null
where p.deleted_at is null and p.published;

create or replace function public.checkout(submission_key text, customer_name text, customer_surname text, payment_method text, delivery_method text, items jsonb)
returns jsonb language plpgsql security definer set search_path=public, extensions as $$
declare existing_ref text; item jsonb; product_row products%rowtype; variant_row product_variants%rowtype; order_id uuid; reference text := encode(gen_random_bytes(24), 'hex'); item_count integer; checkout_product_id uuid; variant_id uuid; checkout_quantity integer;
begin
  if submission_key is null or length(trim(submission_key)) not between 1 and 200 then raise exception 'submission key is invalid'; end if;
  if customer_name is null or length(trim(customer_name)) not between 1 and 120 then raise exception 'customer name is invalid'; end if;
  if customer_surname is null or length(trim(customer_surname)) not between 1 and 120 then raise exception 'customer surname is invalid'; end if;
  if payment_method not in ('cash','bank_transfer') then raise exception 'payment method is invalid'; end if;
  if delivery_method not in ('pickup','meeting_point') then raise exception 'delivery method is invalid'; end if;
  if items is null or jsonb_typeof(items) <> 'array' then raise exception 'items must be an array'; end if;
  item_count := jsonb_array_length(items); if item_count = 0 then raise exception 'cart is empty'; end if; if item_count > 50 then raise exception 'cart cannot contain more than 50 items'; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'product_id') <> 'string' or item->>'product_id' !~* '^[0-9a-f-]{36}$' or jsonb_typeof(item->'quantity') <> 'number' or item->>'quantity' !~ '^[0-9]+$' or (item->>'quantity')::numeric not between 1 and 99 then raise exception 'cart items are invalid'; end if;
    if item ? 'variant_id' and (jsonb_typeof(item->'variant_id') <> 'string' or item->>'variant_id' !~* '^[0-9a-f-]{36}$') then raise exception 'cart items are invalid'; end if;
    if (select count(*) from jsonb_array_elements(items) c where c->>'product_id'=item->>'product_id' and coalesce(c->>'variant_id','')=coalesce(item->>'variant_id','')) > 1 then raise exception 'cart contains duplicate products'; end if;
  end loop;
  insert into orders(order_reference,submission_key,customer_name,customer_surname,payment_method,delivery_method) values(reference,trim(submission_key),trim(customer_name),trim(customer_surname),payment_method,delivery_method) on conflict on constraint orders_submission_key_key do nothing returning id into order_id;
  if order_id is null then select order_reference into existing_ref from orders where orders.submission_key=trim(checkout.submission_key); return jsonb_build_object('order_reference',existing_ref,'duplicate',true); end if;
  for item in select value from jsonb_array_elements(items) loop
    checkout_product_id := (item->>'product_id')::uuid; checkout_quantity := (item->>'quantity')::integer;
    if item ? 'variant_id' then
      variant_id := (item->>'variant_id')::uuid;
      update product_variants pv set stock_quantity=pv.stock_quantity-checkout_quantity where pv.id=variant_id and pv.product_id=checkout_product_id and pv.published and pv.deleted_at is null and pv.stock_quantity >= checkout_quantity returning pv.* into variant_row;
      if not found then raise exception 'product unavailable'; end if;
      insert into order_items(order_id,product_id,variant_id,variant_label,variant_unit_type,variant_quantity,product_name,unit_price_ars,quantity) values(order_id,checkout_product_id,variant_row.id,variant_row.label,variant_row.unit_type,variant_row.quantity,(select name from products where id=checkout_product_id),variant_row.price_ars,checkout_quantity);
    else
      update products set stock_quantity=stock_quantity-checkout_quantity where id=checkout_product_id and published and deleted_at is null and stock_quantity >= checkout_quantity returning * into product_row;
      if not found then raise exception 'product unavailable'; end if;
      insert into order_items(order_id,product_id,product_name,unit_price_ars,quantity) values(order_id,product_row.id,product_row.name,product_row.price_ars,checkout_quantity);
    end if;
  end loop;
  return jsonb_build_object('order_reference',reference,'duplicate',false);
end $$;
