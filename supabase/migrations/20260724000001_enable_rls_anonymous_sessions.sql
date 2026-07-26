-- Flagged ERROR by Supabase's security advisor: anonymous_sessions had RLS
-- policies defined ("anon can insert sessions", "users can claim their
-- session") but RLS itself was never enabled on the table — meaning those
-- policies were never actually enforced. With RLS off, any holder of the
-- public anon key had unrestricted SELECT/INSERT/UPDATE/DELETE on every row,
-- including every user's raw assessment responses (IPIP-NEO-120, ECR-R
-- attachment-style answers) for every other user, not just their own.
--
-- This migration enables RLS using the two policies that were already
-- defined (so INSERT-a-new-session and claim-an-unclaimed-session keep
-- working exactly as before) and adds one previously-missing SELECT policy —
-- required for the app's existing `.insert().select('id')` pattern
-- (AuthModal.tsx, PaywallModal.tsx) to keep working under RLS at all, since
-- Postgres RLS filters INSERT...RETURNING through SELECT policies too.
--
-- This is a floor, not the ceiling: USING (true) here matches today's status
-- quo for reads (already fully open), so it's a strict improvement — it
-- closes the unrestricted UPDATE/DELETE exposure completely — but doesn't
-- fully close the "anyone can bulk-read every user's raw responses" read
-- exposure. Closing that properly means moving these inserts/updates
-- server-side (service-role client, like createCheckoutSession.ts), which
-- would let this SELECT policy be removed entirely. Flagged as follow-up
-- work, not done here, since it's a real refactor across three client
-- components, not a one-line policy change.
alter table public.anonymous_sessions enable row level security;

create policy "anon can read sessions"
  on public.anonymous_sessions
  for select
  using (true);
