create table anonymous_sessions (
  id         uuid        primary key default gen_random_uuid(),
  responses  jsonb,
  created_at timestamptz default now(),
  claimed_by uuid        references auth.users(id)
);
