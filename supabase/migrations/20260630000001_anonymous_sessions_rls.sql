alter table anonymous_sessions enable row level security;

-- Anyone (including unauthenticated visitors) can insert their session
create policy "anon can insert sessions"
  on anonymous_sessions
  for insert
  to anon, authenticated
  with check (true);

-- Authenticated users can claim an unclaimed session (set claimed_by to their uid)
create policy "users can claim their session"
  on anonymous_sessions
  for update
  to authenticated
  using (claimed_by is null)
  with check (claimed_by = auth.uid());
