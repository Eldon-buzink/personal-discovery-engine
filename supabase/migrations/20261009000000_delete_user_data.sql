-- RUN BEFORE DEPLOYING the /account page (Batch 2b). Additive: it only
-- creates a function. Without it, "Delete my account" fails safely (nothing
-- is deleted and the user sees an error).
--
-- delete_user_data: removes every row in public that belongs to one user,
-- in ONE transaction (a function body is atomic: if any statement fails,
-- everything it did is rolled back). Called by the deleteMyAccount server
-- action, which deletes the auth user (auth.admin.deleteUser) only AFTER
-- this succeeds.
--
-- Safe to re-run: a second call finds nothing and deletes nothing. If the
-- auth-user deletion fails afterwards, re-running the whole flow calls this
-- again (no-op) and retries the auth deletion.
--
-- Deletes explicitly instead of relying on ON DELETE CASCADE, so it is
-- complete whether or not 20261007000002_cascade_user_data_fks.sql has run,
-- and so claimed mini-assessment results (ON DELETE SET NULL) don't stay
-- behind. Order: children before parents.
--
-- p_anon_session_id: the requesting browser's signed bearing_anon id, to
-- also remove that browser's still-unclaimed mini-assessment results. Null
-- when the cookie isn't there. Older unclaimed rows (from before Gate 1) are
-- deliberately not included.
--
-- Not touched: auth.audit_log_entries (Supabase's own auth log; documented
-- in the privacy page), report_content rows with a null assessment_id (not
-- linked to anyone), Stripe (records kept for bookkeeping).

create or replace function public.delete_user_data(p_user_id uuid, p_anon_session_id text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb := '{}'::jsonb;
  n int;
begin
  if p_user_id is null then
    raise exception 'delete_user_data: p_user_id is required';
  end if;

  -- Two deletion requests for the same user run one after the other.
  perform pg_advisory_xact_lock(hashtext('delete_user_data:' || p_user_id::text));

  delete from public.mini_assessment_results
  where claimed_by = p_user_id
     or (p_anon_session_id is not null and claimed_by is null and session_id = p_anon_session_id);
  get diagnostics n = row_count;
  result := result || jsonb_build_object('mini_assessment_results', n);

  delete from public.report_content
  where assessment_id in (select id from public.anonymous_sessions where claimed_by = p_user_id);
  get diagnostics n = row_count;
  result := result || jsonb_build_object('report_content', n);

  delete from public.anonymous_sessions where claimed_by = p_user_id;
  get diagnostics n = row_count;
  result := result || jsonb_build_object('anonymous_sessions', n);

  delete from public.check_ins where user_id = p_user_id;
  get diagnostics n = row_count;
  result := result || jsonb_build_object('check_ins', n);

  delete from public.facet_activation_periods where user_id = p_user_id;
  get diagnostics n = row_count;
  result := result || jsonb_build_object('facet_activation_periods', n);

  delete from public.facet_activations where user_id = p_user_id;
  get diagnostics n = row_count;
  result := result || jsonb_build_object('facet_activations', n);

  delete from public.user_facet_reveals where user_id = p_user_id;
  get diagnostics n = row_count;
  result := result || jsonb_build_object('user_facet_reveals', n);

  delete from public.users where id = p_user_id;
  get diagnostics n = row_count;
  result := result || jsonb_build_object('users', n);

  -- rate_limit_hits only exists once 20261007000001_rate_limit.sql has run.
  if to_regclass('public.rate_limit_hits') is not null then
    execute 'delete from public.rate_limit_hits where key like $1' using '%:u:' || p_user_id::text;
    get diagnostics n = row_count;
    result := result || jsonb_build_object('rate_limit_hits', n);
  end if;

  return result;
end;
$$;

revoke all on function public.delete_user_data(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_user_data(uuid, text) to service_role;
