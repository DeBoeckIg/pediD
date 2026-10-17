alter table public.products alter column price_ars drop not null;
alter table public.products alter column stock_quantity drop not null;

create or replace function public.save_product_with_variants(
  p_product_id uuid, p_category_id uuid, p_name text, p_description text,
  p_price_ars integer, p_stock_quantity integer, p_published boolean, p_variants jsonb
) returns public.products language plpgsql security definer set search_path = public as $$
declare product_row public.products; item jsonb;
begin
  if jsonb_typeof(p_variants) <> 'array' or jsonb_array_length(p_variants) < 1 then raise exception 'At least one presentation is required'; end if;
  if p_name is null or length(trim(p_name)) = 0 or p_category_id is null then raise exception 'Invalid product'; end if;
  for item in select * from jsonb_array_elements(p_variants) loop
    if nullif(trim(item->>'label'), '') is null then raise exception 'Label must contain 1 to 80 characters'; end if;
    if (item->>'priceArs')::numeric < 0 or (item->>'priceArs')::numeric <> trunc((item->>'priceArs')::numeric) then raise exception 'Price must be a non-negative whole-number ARS amount'; end if;
    if (item->>'stockQuantity')::numeric < 0 or (item->>'stockQuantity')::numeric <> trunc((item->>'stockQuantity')::numeric) then raise exception 'Stock must be a non-negative integer'; end if;
  end loop;
  if p_product_id is null then insert into products(category_id,name,description,price_ars,stock_quantity,published) values(p_category_id,trim(p_name),coalesce(trim(p_description),''),p_price_ars,p_stock_quantity,p_published) returning * into product_row;
  else update products set category_id=p_category_id,name=trim(p_name),description=coalesce(trim(p_description),''),price_ars=coalesce(p_price_ars,price_ars),stock_quantity=coalesce(p_stock_quantity,stock_quantity),published=p_published where id=p_product_id returning * into product_row; end if;
  if product_row.id is null then raise exception 'Product not found'; end if;
  for item in select * from jsonb_array_elements(p_variants) loop
    insert into product_variants(product_id,label,price_ars,stock_quantity,sort_order,published) values(product_row.id,trim(item->>'label'),(item->>'priceArs')::integer,(item->>'stockQuantity')::integer,coalesce((item->>'sortOrder')::integer,0),coalesce((item->>'published')::boolean,true));
  end loop;
  return product_row;
end $$;
