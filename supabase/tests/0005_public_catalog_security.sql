begin;
select plan(11);

set role service_role;
insert into public.categories(name) values ('pgTAP public category'), ('pgTAP empty category');
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'Visible product', 'Public description', 120, 4, true from public.categories where name = 'pgTAP public category';
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'Hidden product', 'Do not expose', 999, 4, false from public.categories where name = 'pgTAP public category';
insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, published)
select id, 'Published', 'unit', 150, 2, true from public.products where name = 'Visible product';
insert into public.product_variants(product_id, label, unit_type, price_ars, stock_quantity, published)
select id, 'Unpublished', 'unit', 999, 2, false from public.products where name = 'Visible product';
reset role;

set role anon;
select lives_ok($$select * from public.public_catalog$$, 'anon can read the controlled public view');
select throws_ok($$select * from public.products$$, 'permission denied for table products', 'anon cannot read products directly');
select throws_ok($$select * from public.product_variants$$, 'permission denied for table product_variants', 'anon cannot read variants directly');
select throws_ok($$select * from public.product_images$$, 'permission denied for table product_images', 'anon cannot read images directly');
select is((select count(*)::integer from public.public_catalog where name = 'Visible product'), 1, 'published product appears');
select is((select count(*)::integer from public.public_catalog where name = 'Hidden product'), 0, 'unpublished product is hidden');
select is((select count(*)::integer from public.public_catalog where variant_label = 'Published'), 1, 'published variant appears');
select is((select count(*)::integer from public.public_catalog where variant_label = 'Unpublished'), 0, 'unpublished variant is hidden');
select is((select count(*)::integer from public.public_catalog where category_name = 'pgTAP empty category'), 0, 'empty category has no catalog products');
select is((select is_available from public.public_catalog where name = 'Visible product' limit 1), true, 'availability is exposed as boolean');
select is((select variant_is_available from public.public_catalog where variant_label = 'Published' limit 1), true, 'variant availability is exposed as boolean');
select finish();
rollback;
