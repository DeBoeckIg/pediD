-- Cleanup is an internal worker operation, never a browser-callable RPC.
revoke all on function public.claim_storage_cleanup_job(timestamptz) from public, anon, authenticated;
revoke all on function public.enqueue_product_image_cleanup() from public, anon, authenticated;

-- Keep direct RPC callers within the same bounds as the HTTP boundary.
alter table public.orders add constraint orders_submission_key_length check (length(submission_key) between 1 and 200);
alter table public.orders add constraint orders_customer_name_length check (length(trim(customer_name)) between 1 and 120);
alter table public.orders add constraint orders_customer_surname_length check (length(trim(customer_surname)) between 1 and 120);
alter table public.order_items add constraint order_items_quantity_max check (quantity between 1 and 99);
