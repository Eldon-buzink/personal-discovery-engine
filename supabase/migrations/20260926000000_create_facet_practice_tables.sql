-- Facet-to-tool retention system (see reference/01-master-handover.md).
-- Five new tables. facet_id everywhere is a plain text column holding the
-- exact facet-name strings already used in lib/known/scoring.ts (e.g.
-- 'Anxiety', 'Self-Discipline', 'Liberalism') — no new facet reference
-- table, since that data already exists as code constants and duplicating
-- it into the DB would just be a second copy to keep in sync.
--
-- Note: the mini-assessment's third facet is user-facing as "Values" but is
-- 'Liberalism' everywhere in code and here in the DB — Liberalism is this
-- codebase's (IPIP-NEO) name for the facet NEO-PI-R originally called
-- "Openness to Values." Display-label override belongs in the UI copy
-- layer, not here.

-- ── facet_activations ────────────────────────────────────────────────────
-- One row per user-facet, ever. unique(user_id, facet_id) is deliberate:
-- reactivating a facet never creates a second row here — it opens a new
-- facet_activation_periods row under the same activation (see below), so
-- check_ins.facet_activation_id stays stable across deactivate/reactivate
-- cycles and the evidence trail (§2.4 of the handover) never gets
-- orphaned. Whether an activation is *currently* active is never stored
-- here — it's derived from whether an open period exists, so there's no
-- redundant flag that can drift out of sync with the periods table.
create table public.facet_activations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  facet_id text not null,
  source text not null check (source in ('base_assessment', 'mini_assessment')),
  directional boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, facet_id)
);

alter table public.facet_activations enable row level security;

create policy "Users can read their own facet activations"
  on public.facet_activations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own facet activations"
  on public.facet_activations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own facet activations"
  on public.facet_activations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── facet_activation_periods ─────────────────────────────────────────────
-- The detail the handover flagged as most likely to get flattened by
-- accident: activation is start/end pairs, not a single timestamp, so trend
-- computation can reset on reactivation while check-in history stays
-- intact. user_id is denormalized here (not derived via a join to
-- facet_activations) purely so the RLS policy below is a flat
-- auth.uid() = user_id check instead of an EXISTS subquery on every row.
--
-- The partial unique index is what actually enforces "at most one open
-- period per activation" — reactivating while a period is already open
-- (a double-activation bug) is rejected at the DB level, not just by
-- application logic.
create table public.facet_activation_periods (
  id uuid primary key default gen_random_uuid(),
  facet_activation_id uuid not null references public.facet_activations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create unique index one_open_period_per_activation
  on public.facet_activation_periods (facet_activation_id)
  where ended_at is null;

alter table public.facet_activation_periods enable row level security;

create policy "Users can read their own activation periods"
  on public.facet_activation_periods for select
  using (auth.uid() = user_id);

create policy "Users can insert their own activation periods"
  on public.facet_activation_periods for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own activation periods"
  on public.facet_activation_periods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── check_ins ─────────────────────────────────────────────────────────────
-- check_in_date is a plain date, not timestamptz — one check-in per
-- calendar day, no timezone-boundary ambiguity. unique(facet_activation_id,
-- check_in_date) doubles as upsert support for same-day edits. No backfill
-- support by design: check-in date is always the server's "today" at write
-- time, enforced in application code, not here — the weekly 3+ floor is
-- meant to reflect real same-day observation, not a filled-in-later log.
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  facet_activation_id uuid not null references public.facet_activations(id) on delete cascade,
  check_in_date date not null,
  response_option text not null,
  note text,
  created_at timestamptz not null default now(),
  unique (facet_activation_id, check_in_date)
);

alter table public.check_ins enable row level security;

create policy "Users can read their own check-ins"
  on public.check_ins for select
  using (auth.uid() = user_id);

create policy "Users can insert their own check-ins"
  on public.check_ins for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own check-ins"
  on public.check_ins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_facet_reveals ────────────────────────────────────────────────────
-- Not one of the handover's original 7 entities — added because the
-- directional-badge-clear rule (handover §5, refined in review) needs a
-- cheap answer to "does real Ring-1 data exist for this user+facet," and
-- nothing in the schema persisted that before now (facet completion only
-- ever lived in client-side session state during the assessment, or inside
-- the raw responses JSON blob on anonymous_sessions/report_content, neither
-- of which is queryable by facet without re-scoring the whole blob).
--
-- Written by a service-role server action (app/actions/recordFacetReveals.ts),
-- not open client RLS — this is an integrity-sensitive "did they really see
-- this" record, not ordinary user-owned data, so no anon/authenticated
-- write policy is granted here. Same posture as public.users' is_paid.
create table public.user_facet_reveals (
  user_id uuid not null references auth.users(id) on delete cascade,
  facet_id text not null,
  revealed_at timestamptz not null default now(),
  primary key (user_id, facet_id)
);

alter table public.user_facet_reveals enable row level security;

create policy "Users can read their own facet reveals"
  on public.user_facet_reveals for select
  using (auth.uid() = user_id);

-- ── mini_assessment_results ──────────────────────────────────────────────
-- Deliberately mirrors anonymous_sessions' existing shape (session_id +
-- claimed_by, permissive anon RLS) rather than inventing a stricter pattern
-- — six answers on one facet is lower-stakes than the full 120-item
-- responses that anonymous_sessions already holds under the same posture.
-- On signup success, claimed_by is set and a facet_activations row
-- (source='mini_assessment', directional=true) is created from this row —
-- see app/actions (signup-gate flow), not built in this migration.
create table public.mini_assessment_results (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  facet_id text not null,
  responses jsonb not null,
  band text not null check (band in ('low', 'mid', 'high')),
  claimed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.mini_assessment_results enable row level security;

create policy "anon can insert mini assessment results"
  on public.mini_assessment_results for insert
  with check (true);

create policy "anon can read mini assessment results"
  on public.mini_assessment_results for select
  using (true);

create policy "anon can claim mini assessment results"
  on public.mini_assessment_results for update
  using (true)
  with check (true);
