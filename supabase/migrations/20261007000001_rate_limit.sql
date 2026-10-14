-- RUN AFTER DEPLOY. The code that calls rate_limit_check (lib/server/rateLimit.ts)
-- fails open while this function doesn't exist, so deploying the code first
-- is safe; once this runs, limits start applying.
--
-- Durable rate limiting for generatePatternCopy (and anything else that
-- needs it). Keys are either a user id or a salted hash of the IP — raw IPs
-- are never stored. Only the service role can call the function; RLS is on
-- with no policies, so anon/authenticated can't read or write the table.

create table if not exists public.rate_limit_hits (
  key text not null,
  hit_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_key_time on public.rate_limit_hits (key, hit_at desc);
create index if not exists rate_limit_hits_time on public.rate_limit_hits (hit_at);

alter table public.rate_limit_hits enable row level security;

-- Returns true and records a hit when p_key is under p_max hits in the last
-- p_window_seconds; returns false (no hit recorded) otherwise. Concurrent
-- calls can overshoot the limit by a few — acceptable for abuse control.
create or replace function public.rate_limit_check(p_key text, p_window_seconds int, p_max int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  -- Opportunistic cleanup of everything older than a day (about 1 call in 100).
  if random() < 0.01 then
    delete from rate_limit_hits where hit_at < now() - interval '1 day';
  end if;

  select count(*) into n
  from rate_limit_hits
  where key = p_key and hit_at > now() - make_interval(secs => p_window_seconds);

  if n >= p_max then
    return false;
  end if;

  insert into rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.rate_limit_check(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_check(text, int, int) to service_role;
