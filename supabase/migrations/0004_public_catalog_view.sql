-- The public catalog exposes only the approved projection; its owner-backed
-- view must not require anon table privileges for the security-invoker query.
create or replace view public.public_catalog as
select
  p.id,
  p.category_id,
  c.name as category_name,
  p.name,
  p.description,
  p.price_ars,
  case when p.stock_quantity > 0 then 'available' else 'unavailable' end::text as availability,
  i.object_path as image_path
from public.products p
join public.categories c on c.id = p.category_id
left join public.product_images i on i.product_id = p.id
where p.deleted_at is null and p.published;

grant select on public.public_catalog to anon, authenticated;
