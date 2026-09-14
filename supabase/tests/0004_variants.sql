begin;

select plan(20);

select has_table('public', 'product_variants', 'product variants table exists');
select has_column('public', 'order_items', 'variant_id', 'order items store variant id');
select has_column('public', 'order_items', 'variant_label', 'order items store variant label');
select has_column('public', 'order_items', 'variant_unit_type', 'order items store variant unit type');

set role service_role;
create temporary table variant_test_data(product_id uuid, other_product_id uuid, other_variant_id uuid, variant_id uuid, unpublished_id uuid, empty_id uuid, legacy_id uuid);
insert into public.categories(name) values ('pgTAP variants category');
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'pgTAP variants product', 'variant row', 100, 99, true from public.categories where name = 'pgTAP variants category';
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'pgTAP other product', 'other row', 100, 99, true from public.categories where name = 'pgTAP variants category';
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'pgTAP legacy product', 'legacy row', 777, 2, true from public.categories where name = 'pgTAP variants category';
insert into public.product_variants(product_id, label, unit_type, quantity, price_ars, stock_quantity, published)
select id, '500 g', 'grams', 500, 1350, 3, true from public.products where name = 'pgTAP variants product';
insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, published)
select id, 'Hidden', 'unit', 999, 3, false from public.products where name = 'pgTAP variants product';
insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, published)
select id, 'Empty', 'unit', 999, 0, true from public.products where name = 'pgTAP variants product';
insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, published)
select id, 'Other product variant', 'unit', 444, 3, true from public.products where name = 'pgTAP other product';
insert into variant_test_data
select p.id, o.id, ov.id, v.id, h.id, e.id, l.id from public.products p
join public.products o on o.name = 'pgTAP other product'
join public.products l on l.name = 'pgTAP legacy product'
join public.product_variants ov on ov.product_id = o.id and ov.label = 'Other product variant'
join public.product_variants v on v.product_id = p.id and v.label = '500 g'
join public.product_variants h on h.product_id = p.id and h.label = 'Hidden'
join public.product_variants e on e.product_id = p.id and e.label = 'Empty'
where p.name = 'pgTAP variants product';
insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, published)
select p.id, 'Standard', 'unit', p.price_ars, p.stock_quantity, p.published from public.products p
where not exists (select 1 from public.product_variants v where v.product_id = p.id and lower(v.label) = 'standard' and v.deleted_at is null);
select is((select count(*) from public.product_variants where label = 'Standard'), (select count(*) from public.products), 'existing products receive one Standard variant');
grant select on variant_test_data to anon;
select is((select count(*) from public.product_variants where label = 'Standard'), (select count(*) from public.products), 'Standard backfill is idempotent');
insert into public.product_images(product_id, object_path, mime_type, byte_size, is_primary, sort_order)
select product_id, 'variants/secondary.webp', 'image/webp', 10, false, 1 from variant_test_data;
insert into public.product_images(product_id, object_path, mime_type, byte_size, is_primary, sort_order)
select product_id, 'variants/primary.webp', 'image/webp', 10, true, 0 from variant_test_data;
select is((select count(*)::integer from public.product_images where product_id = (select product_id from variant_test_data)), 2, 'products support multiple images');
select is((select count(*)::integer from public.product_images where product_id = (select product_id from variant_test_data) and is_primary), 1, 'products have one primary image');
reset role;

set role anon;
select lives_ok($$select public.checkout('variant-success', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select product_id from variant_test_data), 'variant_id', (select variant_id from variant_test_data), 'quantity', 2)))$$, 'published variant checkout succeeds');
reset role;
select is((select stock_quantity from public.product_variants where id = (select variant_id from variant_test_data)), 1, 'variant checkout decrements variant stock');
select is((select unit_price_ars from public.order_items where order_id = (select id from public.orders where submission_key = 'variant-success')), 1350, 'variant checkout uses variant price');
select is((select variant_label from public.order_items where order_id = (select id from public.orders where submission_key = 'variant-success')), '500 g', 'order item snapshots variant label');
select is((select variant_unit_type from public.order_items where order_id = (select id from public.orders where submission_key = 'variant-success')), 'grams', 'order item snapshots variant unit type');

set role anon;
select lives_ok($$select public.checkout('legacy-success', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select legacy_id from variant_test_data), 'quantity', 1)))$$, 'legacy checkout without variant succeeds');
reset role;
select is((select unit_price_ars from public.order_items where order_id = (select id from public.orders where submission_key = 'legacy-success')), 777, 'legacy checkout uses product price');
select is((select variant_id from public.order_items where order_id = (select id from public.orders where submission_key = 'legacy-success')), null, 'legacy order item has no variant snapshot');
set role anon;
select throws_ok($$select public.checkout('wrong-product', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select product_id from variant_test_data), 'variant_id', (select other_variant_id from variant_test_data), 'quantity', 1)))$$, 'product unavailable', 'variant belonging to another product is rejected');
select throws_ok($$select public.checkout('hidden-variant', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select product_id from variant_test_data), 'variant_id', (select unpublished_id from variant_test_data), 'quantity', 1)))$$, 'product unavailable', 'unpublished variant is rejected');
select throws_ok($$select public.checkout('empty-variant', 'Test', 'Customer', 'cash', 'pickup', jsonb_build_array(jsonb_build_object('product_id', (select product_id from variant_test_data), 'variant_id', (select empty_id from variant_test_data), 'quantity', 1)))$$, 'product unavailable', 'exhausted variant is rejected');
select throws_ok($$select public.checkout('invalid-variant', 'Test', 'Customer', 'cash', 'pickup', '[{"product_id":"00000000-0000-0000-0000-000000000000","variant_id":"not-a-uuid","quantity":1}]'::jsonb)$$, 'cart items are invalid', 'invalid variant id is rejected');
reset role;

select * from finish();
rollback;
