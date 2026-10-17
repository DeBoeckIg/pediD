create or replace function public.enforce_product_image_limit()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.product_images where product_id = new.product_id) > 6 then
    raise exception using errcode = 'check_violation', message = 'A product can have at most 6 images, including the primary image';
  end if;
  return new;
end;
$$;
drop trigger if exists product_images_max_six on public.product_images;
create constraint trigger product_images_max_six after insert on public.product_images
deferrable initially immediate for each row execute function public.enforce_product_image_limit();
