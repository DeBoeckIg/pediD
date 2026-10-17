begin;

select plan(6);

set role service_role;
create temporary table reorder_test_data(product_id uuid, first_id uuid, second_id uuid);
insert into public.categories(name) values ('pgTAP reorder category');
insert into public.products(category_id, name, description, price_ars, stock_quantity, published)
select id, 'pgTAP reorder product', 'reorder row', 100, 1, true
from public.categories where name = 'pgTAP reorder category';
insert into public.product_images(product_id, object_path, mime_type, byte_size, is_primary, sort_order)
select id, 'reorder/first.webp', 'image/webp', 10, true, 0
from public.products where name = 'pgTAP reorder product';
insert into public.product_images(product_id, object_path, mime_type, byte_size, is_primary, sort_order)
select id, 'reorder/second.webp', 'image/webp', 10, false, 1
from public.products where name = 'pgTAP reorder product';
insert into reorder_test_data
select p.id, first_image.id, second_image.id
from public.products p
join public.product_images first_image on first_image.product_id = p.id and first_image.object_path = 'reorder/first.webp'
join public.product_images second_image on second_image.product_id = p.id and second_image.object_path = 'reorder/second.webp'
where p.name = 'pgTAP reorder product';

select lives_ok($$select public.reorder_product_images(product_id, array[second_id, first_id]) from reorder_test_data$$, 'reorder accepts an exact reordered image list');
select is((select sort_order from public.product_images where id = (select second_id from reorder_test_data)), 0, 'moved image receives sort order zero');
select is((select sort_order from public.product_images where id = (select first_id from reorder_test_data)), 1, 'remaining image receives sort order one');
select is((select is_primary from public.product_images where id = (select second_id from reorder_test_data)), true, 'moved image becomes primary');
select is((select is_primary from public.product_images where id = (select first_id from reorder_test_data)), false, 'previous primary is cleared');
select is((select count(*)::integer from public.product_images where product_id = (select product_id from reorder_test_data) and is_primary), 1, 'reorder leaves exactly one primary image');

reset role;
select * from finish();
rollback;
