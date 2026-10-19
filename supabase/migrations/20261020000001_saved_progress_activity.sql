-- Saved progress: when it was last active, and whether its one reminder
-- has gone out (app/api/cron/saved-progress).
--
--   updated_at        set on insert, and moved forward on every save of the
--                     answers (the trigger below), so it reflects real
--                     activity: the assessment autosaves while someone with
--                     saved progress keeps answering.
--   reminder_sent_at  set once, when the reminder is sent (or when the job
--                     decides this row must never get one: paid, or picked
--                     up in another session). Never cleared after a send.
--
-- Existing rows get updated_at = created_at, so old saved progress counts
-- from when it was saved, not from when this ran.
--
-- Safe to run before the code that uses it: new columns with defaults and a
-- trigger; nothing in the current code reads them. No policy changes.

alter table public.anonymous_sessions
  add column if not exists updated_at timestamptz,
  add column if not exists reminder_sent_at timestamptz;

update public.anonymous_sessions
  set updated_at = coalesce(created_at, now())
  where updated_at is null;

alter table public.anonymous_sessions
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.anonymous_sessions_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists anonymous_sessions_touch_updated_at on public.anonymous_sessions;
create trigger anonymous_sessions_touch_updated_at
  before update of responses on public.anonymous_sessions
  for each row
  execute function public.anonymous_sessions_touch_updated_at();

-- The reminder query: unclaimed, emailed, not yet reminded, by age.
create index if not exists anonymous_sessions_reminder_idx
  on public.anonymous_sessions (updated_at)
  where claimed_by is null and email is not null and reminder_sent_at is null;

-- The 30-day deletion: unclaimed rows by age.
create index if not exists anonymous_sessions_unclaimed_updated_idx
  on public.anonymous_sessions (updated_at)
  where claimed_by is null;
