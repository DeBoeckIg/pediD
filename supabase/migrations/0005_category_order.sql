alter table public.categories add column sort_order integer not null default 0;
with ranked as (select id, row_number() over (order by created_at, id) - 1 as position from public.categories)
update public.categories c set sort_order = ranked.position from ranked where ranked.id = c.id;
create index categories_sort_order_idx on public.categories (sort_order, name, id);
create or replace view public.public_catalog as
select p.id, p.category_id, c.name as category_name, c.sort_order as category_sort_order, p.name, p.description, p.price_ars,
  case when p.stock_quantity > 0 then 'available' else 'unavailable' end::text as availability, i.object_path as image_path
from public.products p join public.categories c on c.id = p.category_id left join public.product_images i on i.product_id = p.id
where p.deleted_at is null and p.published;
grant select on public.public_catalog to anon, authenticated;
