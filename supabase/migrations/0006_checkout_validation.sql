create or replace function public.checkout(submission_key text, customer_name text, customer_surname text, payment_method text, delivery_method text, items jsonb)
returns jsonb language plpgsql security definer set search_path=public, extensions as $$
declare
  existing_ref text;
  item jsonb;
  product_row products%rowtype;
  order_id uuid;
  reference text := encode(gen_random_bytes(24),'hex');
  item_count integer;
begin
  if submission_key is null or length(trim(submission_key)) not between 1 and 200 then raise exception 'submission key is invalid'; end if;
  if customer_name is null or length(trim(customer_name)) not between 1 and 120 then raise exception 'customer name is invalid'; end if;
  if customer_surname is null or length(trim(customer_surname)) not between 1 and 120 then raise exception 'customer surname is invalid'; end if;
  if payment_method not in ('cash', 'bank_transfer') then raise exception 'payment method is invalid'; end if;
  if delivery_method not in ('pickup', 'meeting_point') then raise exception 'delivery method is invalid'; end if;
  if items is null or jsonb_typeof(items) <> 'array' then raise exception 'items must be an array'; end if;
  item_count := jsonb_array_length(items);
  if item_count = 0 then raise exception 'cart is empty'; end if;
  if item_count > 50 then raise exception 'cart cannot contain more than 50 items'; end if;
  for item in select * from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object'
      or item->>'product_id' is null
      or item->>'product_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or item->>'quantity' is null
      or item->>'quantity' !~ '^[0-9]+$'
      or (item->>'quantity')::numeric not between 1 and 99
    then raise exception 'cart items are invalid'; end if;
    if (select count(*) from jsonb_array_elements(items) candidate where candidate->>'product_id' = item->>'product_id') > 1 then raise exception 'cart contains duplicate products'; end if;
  end loop;

  insert into orders(order_reference,submission_key,customer_name,customer_surname,payment_method,delivery_method)
  values(reference,trim(submission_key),trim(customer_name),trim(customer_surname),payment_method,delivery_method)
  on conflict (submission_key) do nothing returning id into order_id;
  if order_id is null then
    select order_reference into existing_ref from orders where orders.submission_key=trim(checkout.submission_key);
    return jsonb_build_object('order_reference',existing_ref,'duplicate',true);
  end if;
  for item in select * from jsonb_array_elements(items) loop
    update products set stock_quantity=stock_quantity-(item->>'quantity')::integer where id=(item->>'product_id')::uuid and published and deleted_at is null and stock_quantity >= (item->>'quantity')::integer returning * into product_row;
    if not found then raise exception 'product unavailable'; end if;
    insert into order_items(order_id,product_id,product_name,unit_price_ars,quantity) values(order_id,product_row.id,product_row.name,product_row.price_ars,(item->>'quantity')::integer);
  end loop;
  return jsonb_build_object('order_reference',reference,'duplicate',false);
end $$;
