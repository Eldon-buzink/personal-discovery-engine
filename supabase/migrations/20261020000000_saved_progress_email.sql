-- Saved progress ("Finish later"): the email the sign-in link went to.
--
-- The link can be opened in a different browser than the one that saved the
-- progress (an Instagram or Pinterest in-app browser, then Safari), where the
-- signed cookie that identifies the saved row doesn't exist. After the link
-- signs the person in, the row is found by this verified email instead
-- (claimAnonymousSession in app/actions/anonymousSession.ts).
--
-- Safe to run before the code that uses it: a nullable column, nothing reads
-- it yet. No policy changes: the browser still can't read this table.

alter table public.anonymous_sessions
  add column if not exists email text;

create index if not exists anonymous_sessions_unclaimed_email_idx
  on public.anonymous_sessions (email)
  where claimed_by is null;
