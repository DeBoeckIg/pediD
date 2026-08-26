insert into public.categories (id, name)
values
  ('00000000-0000-0000-0000-000000000001', 'Empanadas'),
  ('00000000-0000-0000-0000-000000000002', 'Beverages')
on conflict (id) do update set name = excluded.name;

insert into public.products (id, category_id, name, description, price_ars, stock_quantity, published)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Beef empanada', 'Classic beef filling.', 1800, 20, true),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Cheese empanada', 'Mild cheese filling.', 1600, 15, true),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000002', 'Sparkling water', '500 ml bottle.', 1200, 30, true)
on conflict (id) do update set
  category_id = excluded.category_id,
  name = excluded.name,
  description = excluded.description,
  price_ars = excluded.price_ars,
  stock_quantity = excluded.stock_quantity,
  published = excluded.published,
  deleted_at = null;
