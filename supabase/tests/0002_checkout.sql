begin;

select plan(17);

select has_function(
  'public',
  'checkout',
  array['text', 'text', 'text', 'text', 'text', 'jsonb'],
  'checkout RPC exists with the expected signature'
);

select ok(has_table_privilege('service_role', 'public.installation_config', 'select'), 'service_role can read installation config');
select ok(has_table_privilege('service_role', 'public.categories', 'select,insert,update,delete'), 'service_role can manage categories');
select ok(has_table_privilege('service_role', 'public.products', 'select,insert,update,delete'), 'service_role can manage products');
select ok(has_table_privilege('service_role', 'public.product_images', 'select,insert,update,delete'), 'service_role can manage product images');
select ok(has_table_privilege('service_role', 'public.orders', 'select,insert,update,delete'), 'service_role can manage orders');
select ok(has_table_privilege('service_role', 'public.order_items', 'select,insert,update,delete'), 'service_role can manage order items');
select ok(has_table_privilege('service_role', 'public.storage_cleanup_jobs', 'select,insert,update,delete'), 'service_role can manage cleanup jobs');
select ok(has_function_privilege('anon', 'public.checkout(text,text,text,text,text,jsonb)', 'execute'), 'anon can execute checkout');

set role service_role;
create temporary table checkout_results(result jsonb);
create temporary table checkout_test_data(product_id uuid, submission_key text);
grant select on checkout_test_data to anon;
grant insert on checkout_results to anon;
insert into public.categories(name) values ('pgTAP checkout category');
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'pgTAP checkout product', 'test row', 1250, 3, true
from public.categories where name = 'pgTAP checkout category';
insert into checkout_test_data(product_id, submission_key)
select id, 'pgtap-checkout-submission' from public.products where name = 'pgTAP checkout product';
grant select on checkout_results to anon;
reset role;

set role anon;
insert into checkout_results
select public.checkout(
  (select submission_key from checkout_test_data), 'Test', 'Customer', 'cash', 'pickup',
  jsonb_build_array(jsonb_build_object('product_id', (select product_id from checkout_test_data), 'quantity', 2))
);
reset role;

select is((select result->>'duplicate' from checkout_results), 'false', 'checkout creates a new order');
select is((select stock_quantity from public.products where id = (select product_id from checkout_test_data)), 1, 'checkout decrements stock atomically');

set role anon;
insert into checkout_results
select public.checkout(
  (select submission_key from checkout_test_data), 'Changed', 'Customer', 'cash', 'pickup',
  jsonb_build_array(jsonb_build_object('product_id', (select product_id from checkout_test_data), 'quantity', 1))
);
reset role;
select is((select result->>'duplicate' from checkout_results where result->>'duplicate' = 'true' limit 1), 'true', 'duplicate submission is idempotent');
select is((select stock_quantity from public.products where id = (select product_id from checkout_test_data)), 1, 'duplicate submission does not decrement stock again');

set role service_role;
update public.products set stock_quantity = 0 where id = (select product_id from checkout_test_data);
set role anon;
select throws_ok(
  $$select public.checkout('unavailable-submission', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select product_id from checkout_test_data), 'quantity', 1)))$$,
  'product unavailable',
  'unavailable stock is rejected'
);
reset role;
select is((select count(*)::integer from public.orders where submission_key = 'unavailable-submission'), 0, 'unavailable stock does not create an order');
set role anon;
select throws_ok(
  $$select public.checkout('invalid-quantity-submission', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select product_id from checkout_test_data), 'quantity', 0)))$$,
  'new row for relation "order_items" violates check constraint "order_items_quantity_check"',
  'invalid stock quantity is rejected'
);
reset role;
select is((select count(*)::integer from public.orders where submission_key = 'invalid-quantity-submission'), 0, 'invalid stock quantity does not create an order');

select * from finish();
rollback;
