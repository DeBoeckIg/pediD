-- Public visibility is determined by catalog data, not the removed product
-- publication flag. Products with presentations need at least one published,
-- non-deleted presentation with a price and stock value (zero stock remains
-- visible). Legacy products without presentations remain visible when their
-- base price and stock are present.
begin;

create or replace view public.public_catalog with (security_invoker = false) as
select
  p.id, p.category_id, c.name as category_name, p.name, p.description,
  p.price_ars,
  (coalesce(v.stock_quantity, p.stock_quantity, 0) > 0) as is_available,
  case when coalesce(v.stock_quantity, p.stock_quantity, 0) > 0 then 'available' else 'unavailable' end::text as availability,
  primary_image.object_path as image_path,
  coalesce((select jsonb_agg(pi.object_path order by pi.sort_order, pi.is_primary desc, pi.created_at, pi.id)
            from public.product_images pi where pi.product_id = p.id), '[]'::jsonb) as image_paths,
  v.id as variant_id, v.label as variant_label, v.price_ars as variant_price_ars,
  (v.stock_quantity > 0) as variant_is_available,
  case when v.stock_quantity > 0 then 'available' else 'unavailable' end::text as variant_availability,
  v.sort_order as variant_sort_order
from public.products p
join public.categories c on c.id = p.category_id
left join lateral (
  select pi.object_path from public.product_images pi
  where pi.product_id = p.id
  order by pi.sort_order, pi.is_primary desc, pi.created_at, pi.id
  limit 1
) primary_image on true
left join public.product_variants v
  on v.product_id = p.id and v.published and v.deleted_at is null
  and v.price_ars is not null and v.stock_quantity is not null
where p.deleted_at is null
  and ((exists (select 1 from public.product_variants pv
               where pv.product_id = p.id and pv.published and pv.deleted_at is null
                 and pv.price_ars is not null and pv.stock_quantity is not null))
       or (not exists (select 1 from public.product_variants pv where pv.product_id = p.id)
           and p.price_ars is not null and p.stock_quantity is not null));

revoke all on public.public_catalog from anon, authenticated;
grant select on public.public_catalog to anon, authenticated;

commit;
