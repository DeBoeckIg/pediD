-- New presentations are described by label; retain legacy metadata for old rows and snapshots.
alter table public.product_variants alter column unit_type drop not null;
alter table public.product_variants drop constraint if exists product_variants_unit_type_check;
alter table public.product_variants drop constraint if exists product_variants_quantity_by_unit;
alter table public.product_variants add constraint product_variants_unit_type_legacy_check
  check (unit_type is null or unit_type in ('grams', 'kilograms', 'unit'));
