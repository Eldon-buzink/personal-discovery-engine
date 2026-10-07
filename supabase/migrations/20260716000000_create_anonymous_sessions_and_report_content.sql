-- Create-table migrations for two tables that were created in the Supabase
-- dashboard and never had one. Written from the production schema dump
-- (2026-10-07) so they match it exactly: same columns, types, nullability,
-- defaults, primary keys and foreign keys (no ON DELETE rule, as in
-- production). No triggers, extra indexes or check constraints exist there.
--
-- "if not exists" makes this a no-op on production, where both tables
-- already exist. On a fresh project (the test Supabase project) it creates
-- them, so every migration can be run in order from scratch. It is dated
-- before 20260724000000_lock_down_report_content.sql and
-- 20260724000001_enable_rls_anonymous_sessions.sql because those alter these
-- tables' policies.
--
-- RLS is enabled with no policies here. The policies that matter are set by
-- later migrations (see 20261007000003_lock_down_anonymous_tables.sql).

create table if not exists public.anonymous_sessions (
  id uuid primary key default gen_random_uuid(),
  responses jsonb,
  created_at timestamptz default now(),
  claimed_by uuid references auth.users(id)
);

create table if not exists public.report_content (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid references public.anonymous_sessions(id),
  facet text not null,
  trait_word text not null,
  score_direction text not null,
  trait_quote text,
  where_it_shows_up text,
  tags text[],
  go_deeper text,
  worth_trying text,
  generated_at timestamptz default now()
);

alter table public.anonymous_sessions enable row level security;
alter table public.report_content enable row level security;
