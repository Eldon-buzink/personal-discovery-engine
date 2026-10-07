-- RUN AFTER DEPLOY — at least an hour after the code that uses
-- app/actions/anonymousSession.ts and app/actions/miniAssessment.ts is live,
-- so browser tabs still running the old code have had time to reload.
--
-- Closes the open read/write access on the two tables that hold anonymous
-- assessment answers:
--   - anonymous_sessions: anyone with the public anon key could read every
--     row (all 120 answers, branch answers, generated report text).
--   - mini_assessment_results: anyone could read, insert and claim any row.
--
-- After this, the browser can only read rows it has claimed. Every insert
-- and claim goes through server actions using the service role, which
-- bypasses RLS, so no insert/update/delete policy is granted to anon or
-- authenticated.
--
-- What still works: baseAssessmentResult.ts and the practice page read
-- these tables filtered to claimed_by = the signed-in user.
-- What stops working: any browser tab still on the pre-deploy code
-- (direct inserts/claims) until it reloads.
--
-- "anon can insert sessions" and "users can claim their session" exist only
-- in production (created in the dashboard), hence "if exists".

-- anonymous_sessions
drop policy if exists "anon can read sessions" on public.anonymous_sessions;
drop policy if exists "anon can insert sessions" on public.anonymous_sessions;
drop policy if exists "users can claim their session" on public.anonymous_sessions;

create policy "Users read sessions they claimed"
  on public.anonymous_sessions
  for select
  to authenticated
  using (claimed_by = auth.uid());

-- mini_assessment_results
drop policy if exists "anon can insert mini assessment results" on public.mini_assessment_results;
drop policy if exists "anon can read mini assessment results" on public.mini_assessment_results;
drop policy if exists "anon can claim mini assessment results" on public.mini_assessment_results;

create policy "Users read results they claimed"
  on public.mini_assessment_results
  for select
  to authenticated
  using (claimed_by = auth.uid());

-- Check afterwards (expect exactly one policy per table, cmd = SELECT):
--   select tablename, policyname, cmd, roles, qual
--   from pg_policies
--   where schemaname = 'public' and tablename in ('anonymous_sessions', 'mini_assessment_results');
