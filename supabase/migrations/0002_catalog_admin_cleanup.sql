-- Admin mutations are server-side and product deletion leaves a durable storage manifest.
alter table public.categories add constraint categories_name_unique unique (name);
create or replace function public.enqueue_product_image_cleanup() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.storage_cleanup_jobs(object_path) values (old.object_path) on conflict (object_path) do nothing; return old; end $$;
create trigger product_image_cleanup after delete on public.product_images for each row execute function public.enqueue_product_image_cleanup();
create unique index product_images_one_primary on public.product_images(product_id);
alter table public.storage_cleanup_jobs add column if not exists failed_at timestamptz;
alter table public.storage_cleanup_jobs add column if not exists failure_reason text;
create or replace function public.claim_storage_cleanup_job(claim_time timestamptz)
returns setof public.storage_cleanup_jobs language sql security definer set search_path=public as $$
  update public.storage_cleanup_jobs
  set attempts = attempts + 1, next_attempt_at = claim_time + interval '5 minutes'
  where id = (select id from public.storage_cleanup_jobs where completed_at is null and failed_at is null and attempts < 5 and next_attempt_at <= claim_time order by next_attempt_at for update skip locked limit 1)
  returning *;
$$;
-- Keep the private bucket inaccessible to browser roles; the worker uses service_role.
revoke all on storage.objects from anon, authenticated;
alter table public.storage_cleanup_jobs add constraint storage_cleanup_jobs_attempts_bounded check (attempts >= 0 and attempts <= 5);
create index if not exists storage_cleanup_jobs_terminal_failure on public.storage_cleanup_jobs(failed_at) where failed_at is not null;
