-- Paid-status source of truth for the Stripe integration. Only the service
-- role (used server-side by the Stripe webhook) ever writes is_paid/paid_at —
-- no insert/update policy is granted to anon/authenticated, so a client can
-- never mark itself paid.
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read their own row"
  on public.users
  for select
  using (auth.uid() = id);
