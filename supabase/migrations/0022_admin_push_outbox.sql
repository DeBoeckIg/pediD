create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(), endpoint text not null unique,
  p256dh text not null, auth text not null, created_at timestamptz not null default now(), last_seen_at timestamptz not null default now()
);
create table if not exists public.admin_push_outbox (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  order_reference text not null, total_ars numeric not null default 0, status text not null default 'pending' check (status in ('pending','processing','sent','failed')),
  attempts integer not null default 0, max_attempts integer not null default 5, next_attempt_at timestamptz not null default now(), sent_at timestamptz, last_error text,
  created_at timestamptz not null default now(), unique(order_id)
);
alter table public.admin_push_subscriptions enable row level security;
alter table public.admin_push_outbox enable row level security;
revoke all on public.admin_push_subscriptions, public.admin_push_outbox from anon, authenticated;
grant all on public.admin_push_subscriptions, public.admin_push_outbox to service_role;
create index if not exists admin_push_outbox_pending_idx on public.admin_push_outbox(status, next_attempt_at);
alter table public.admin_push_outbox add column if not exists max_attempts integer not null default 5;

-- Append this insert to the existing checkout transaction by replacing the final return.
-- It is intentionally a separate migration so deployments can inspect/verify the existing RPC first.
create or replace function public.enqueue_admin_push(p_order_id uuid, p_reference text, p_total numeric)
returns void language sql security definer set search_path=public as $$
  insert into admin_push_outbox(order_id, order_reference, total_ars) values (p_order_id, p_reference, p_total) on conflict (order_id) do nothing;
$$;
revoke all on function public.enqueue_admin_push(uuid,text,numeric) from public, anon, authenticated;
grant execute on function public.enqueue_admin_push(uuid,text,numeric) to service_role;
