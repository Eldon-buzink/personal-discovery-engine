-- RUN AFTER REVIEW. Not required by any code in this branch; safe to run
-- before or after the deploy.
--
-- Why ON DELETE CASCADE:
--   anonymous_sessions.claimed_by -> auth.users(id) and
--   report_content.assessment_id -> anonymous_sessions(id) were created with
--   no ON DELETE rule (NO ACTION). Deleting a user who has claimed a session
--   therefore fails with a foreign-key error today, and so would deleting a
--   session that has report text attached. Account deletion (Gate 1, 2b) needs
--   "delete the user" to remove their saved assessment answers and the
--   report text generated for that session, so both become CASCADE:
--     delete auth user -> their claimed anonymous_sessions rows
--                      -> report_content rows for those sessions.
--   Not covered by this cascade (2b deletes these explicitly):
--     - unclaimed anonymous sessions (not linked to any user);
--     - report_content rows with a null assessment_id (most rows: branch
--       content and text generated before progress was saved);
--     - mini_assessment_results (claimed_by is ON DELETE SET NULL).
--
-- Why the indexes:
--   Postgres doesn't index foreign-key columns automatically. Without them a
--   cascade from a user (or a session) scans the whole child table, and the
--   claimed_by lookups the app does (baseAssessmentResult.ts, and the
--   "claimed_by = auth.uid()" RLS policy) are sequential scans too.
--
-- The existing constraints are found by column rather than by name, so this
-- works whatever names the dashboard gave them. Runs in one transaction;
-- re-adding the constraints re-validates existing rows, which already
-- satisfy them.

begin;

do $$
declare
  r record;
begin
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'f'
      and (
        (c.conrelid = 'public.anonymous_sessions'::regclass and a.attname = 'claimed_by')
        or (c.conrelid = 'public.report_content'::regclass and a.attname = 'assessment_id')
      )
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end
$$;

alter table public.anonymous_sessions
  add constraint anonymous_sessions_claimed_by_fkey
  foreign key (claimed_by) references auth.users(id) on delete cascade;

alter table public.report_content
  add constraint report_content_assessment_id_fkey
  foreign key (assessment_id) references public.anonymous_sessions(id) on delete cascade;

create index if not exists anonymous_sessions_claimed_by_idx on public.anonymous_sessions (claimed_by);
create index if not exists report_content_assessment_id_idx on public.report_content (assessment_id);

commit;
