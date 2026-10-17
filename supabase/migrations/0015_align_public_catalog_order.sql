-- The admin projection is ordered by sort_order.  The public projection must
-- use the same persisted order; is_primary is an invariant, not a competing
-- sort key.  This also repairs products created before the reorder RPC made
-- the first item primary.
begin;

-- Clear first because product_images_one_primary is a non-deferrable partial
-- unique index and cannot tolerate two primaries during one UPDATE.
update public.product_images
set is_primary = false
where is_primary;

update public.product_images as image
set is_primary = true
from (
  select distinct on (product_id) id
  from public.product_images
  order by product_id, sort_order, created_at, id
) as first_image
where image.id = first_image.id;

create or replace view public.public_catalog with (security_invoker = false) as
select
  p.id, p.category_id, c.name as category_name, p.name, p.description,
  p.price_ars,
  (p.stock_quantity > 0) as is_available,
  case when p.stock_quantity > 0 then 'available' else 'unavailable' end::text as availability,
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
where p.published and p.deleted_at is null;

revoke all on public.public_catalog from anon, authenticated;
grant select on public.public_catalog to anon, authenticated;

commit;
