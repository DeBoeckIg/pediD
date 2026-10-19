-- Fix parameter scoping introduced by the reservation checkout function.
create or replace function public.checkout(
  submission_key text,
  customer_name text,
  customer_surname text,
  customer_phone text,
  payment_method text,
  delivery_method text,
  items jsonb
)
returns jsonb language plpgsql security definer set search_path=public, extensions as $$
declare
  v_submission_key text := $1;
  v_customer_phone text := $4;
  existing_ref text;
  item jsonb;
  product_row products%rowtype;
  variant_row product_variants%rowtype;
  v_order_id uuid;
  reference text := encode(gen_random_bytes(24), 'hex');
  item_count integer;
  checkout_product_id uuid;
  variant_id uuid;
  checkout_quantity integer;
begin
  perform public.expire_pending_order_reservations();

  if v_submission_key is null or length(trim(v_submission_key)) not between 1 and 200 then raise exception 'submission key is invalid'; end if;
  if customer_name is null or length(trim(customer_name)) not between 1 and 120 then raise exception 'customer name is invalid'; end if;
  if customer_surname is null or length(trim(customer_surname)) not between 1 and 120 then raise exception 'customer surname is invalid'; end if;
  if v_customer_phone is null or v_customer_phone !~ '^\+549[0-9]{10}$' then raise exception 'customer phone is invalid'; end if;
  if payment_method not in ('cash','bank_transfer') then raise exception 'payment method is invalid'; end if;
  if delivery_method not in ('pickup','meeting_point') then raise exception 'delivery method is invalid'; end if;
  if items is null or jsonb_typeof(items) <> 'array' then raise exception 'items must be an array'; end if;

  item_count := jsonb_array_length(items);
  if item_count = 0 then raise exception 'cart is empty'; end if;
  if item_count > 50 then raise exception 'cart cannot contain more than 50 items'; end if;

  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) <> 'object'
       or jsonb_typeof(item->'product_id') <> 'string'
       or item->>'product_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       or jsonb_typeof(item->'quantity') <> 'number'
       or item->>'quantity' !~ '^[0-9]+$'
       or (item->>'quantity')::numeric not between 1 and 99
       or (item ? 'variant_id' and (jsonb_typeof(item->'variant_id') <> 'string' or item->>'variant_id' !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')) then
      raise exception 'cart items are invalid';
    end if;
    if (select count(*) from jsonb_array_elements(items) as c where c->>'product_id'=item->>'product_id' and coalesce(c->>'variant_id','')=coalesce(item->>'variant_id','')) > 1 then
      raise exception 'cart contains duplicate products';
    end if;
  end loop;

  perform pg_advisory_xact_lock(hashtextextended(v_customer_phone, 0));
  if (select count(*) from public.orders as o where o.customer_phone = v_customer_phone and o.status = 'pending') >= 2 then raise exception 'too many active pending orders'; end if;
  if (select count(*) from public.orders as o where o.customer_phone = v_customer_phone and o.status <> 'cancelled' and o.created_at >= now() - interval '1 hour') >= 3 then raise exception 'too many recent orders'; end if;

  insert into public.orders(order_reference,submission_key,customer_name,customer_surname,customer_phone,payment_method,delivery_method,reservation_expires_at)
    values(reference,trim(v_submission_key),trim(customer_name),trim(customer_surname),v_customer_phone,payment_method,delivery_method,now()+interval '30 minutes')
    on conflict on constraint orders_submission_key_key do nothing returning id into v_order_id;
  if v_order_id is null then
    select o.order_reference into existing_ref from public.orders as o where o.submission_key=trim(v_submission_key);
    return jsonb_build_object('order_reference',existing_ref,'duplicate',true);
  end if;

  for item in select value from jsonb_array_elements(items) loop
    checkout_product_id := (item->>'product_id')::uuid;
    checkout_quantity := (item->>'quantity')::integer;
    if item ? 'variant_id' then
      variant_id := (item->>'variant_id')::uuid;
      update public.product_variants as pv set stock_quantity=pv.stock_quantity-checkout_quantity
       where pv.id=variant_id and pv.product_id=checkout_product_id and pv.published and pv.deleted_at is null and pv.stock_quantity >= checkout_quantity returning pv.* into variant_row;
      if not found then raise exception 'product unavailable'; end if;
      insert into public.order_items(order_id,product_id,variant_id,variant_label,variant_unit_type,variant_quantity,product_name,unit_price_ars,quantity)
        values(v_order_id,checkout_product_id,variant_row.id,variant_row.label,variant_row.unit_type,variant_row.quantity,(select p.name from public.products as p where p.id=checkout_product_id),variant_row.price_ars,checkout_quantity);
    else
      update public.products as p set stock_quantity=p.stock_quantity-checkout_quantity
       where p.id=checkout_product_id and p.published and p.deleted_at is null and p.stock_quantity >= checkout_quantity returning p.* into product_row;
      if not found or product_row.price_ars is null then raise exception 'product unavailable'; end if;
      insert into public.order_items(order_id,product_id,product_name,unit_price_ars,quantity)
        values(v_order_id,product_row.id,product_row.name,product_row.price_ars,checkout_quantity);
    end if;
  end loop;

  insert into public.admin_push_outbox(order_id, order_reference, total_ars)
    select v_order_id, reference, coalesce(sum(oi.unit_price_ars * oi.quantity), 0)
    from public.order_items as oi where oi.order_id = v_order_id;
  return jsonb_build_object('order_reference',reference,'duplicate',false);
end $$;

revoke all on function public.checkout(text,text,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.checkout(text,text,text,text,text,text,jsonb) to anon,authenticated;
