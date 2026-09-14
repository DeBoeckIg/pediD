begin;
select plan(4);
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'update_order_status_atomic' and p.pronargs = 3), 1, 'atomic order status RPC exists');
select has_check('public', 'orders', 'orders status constraint remains enforced');
insert into public.orders (order_reference, submission_key, customer_name, customer_surname, payment_method, delivery_method)
values ('atomic-test-reference-000000000000000000000000', 'atomic-test-submission', 'Test', 'Order', 'cash', 'pickup');
select lives_ok($$select (public.update_order_status_atomic((select id from public.orders where submission_key = 'atomic-test-submission'), 'pending', 'confirmed')).id$$, 'first transition wins');
select throws_ok($$select public.update_order_status_atomic((select id from public.orders where submission_key = 'atomic-test-submission'), 'pending', 'confirmed')$$, 'Order status update conflict', 'second transition from stale state conflicts');
select * from finish();
rollback;
