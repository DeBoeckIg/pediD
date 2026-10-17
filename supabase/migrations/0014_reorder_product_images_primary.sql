create or replace function public.reorder_product_images(product_id uuid, image_ids uuid[])
returns jsonb language plpgsql security definer set search_path=public as $$
declare current_count integer; requested_count integer; duplicate_count integer;
begin
  requested_count := coalesce(array_length(image_ids, 1), 0);
  if requested_count < 1 or requested_count > 6 then
    raise exception using errcode = '22023', message = 'Image order must contain between 1 and 6 images';
  end if;
  select count(*) into current_count from product_images where product_images.product_id = reorder_product_images.product_id;
  select count(distinct id) into duplicate_count from unnest(image_ids) as requested(id);
  if duplicate_count <> requested_count then
    raise exception using errcode = '22023', message = 'Image order cannot contain duplicates';
  end if;
  if not exists (select 1 from products where products.id = reorder_product_images.product_id) then
    raise exception using errcode = 'P0002', message = 'Product not found';
  end if;
  if current_count <> requested_count or exists (
    select id from product_images where product_images.product_id = reorder_product_images.product_id
    except select unnest(image_ids)
  ) or exists (
    select unnest(image_ids) except select id from product_images where product_images.product_id = reorder_product_images.product_id
  ) then
    raise exception using errcode = '40001', message = 'Image order must contain the exact current images';
  end if;

  -- Clear the old primary first so the partial unique index is never violated.
  update product_images
    set is_primary = false
  where product_images.product_id = reorder_product_images.product_id;

  update product_images as image
    set sort_order = ordered.position - 1,
        is_primary = ordered.position = 1
  from unnest(image_ids) with ordinality as ordered(id, position)
  where image.id = ordered.id and image.product_id = reorder_product_images.product_id;
  return jsonb_build_object('productId', product_id, 'imageIds', to_jsonb(image_ids));
end;
$$;

revoke all on function public.reorder_product_images(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.reorder_product_images(uuid, uuid[]) to service_role;
