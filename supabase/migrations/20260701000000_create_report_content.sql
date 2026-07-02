create table report_content (
  id               uuid        primary key default gen_random_uuid(),
  assessment_id    uuid        references anonymous_sessions(id),
  facet            text        not null,
  trait_word       text        not null,
  score_direction  text        not null,
  trait_quote      text,
  where_it_shows_up text,
  tags             text[],
  go_deeper        text,
  worth_trying     text,
  generated_at     timestamptz default now()
);

alter table report_content enable row level security;

-- Server action uses the anon key, so we allow anon to insert
create policy "anon can insert report_content"
  on report_content for insert to anon with check (true);

-- Reading is open too (needed if we later fetch content client-side)
create policy "anon can read report_content"
  on report_content for select to anon using (true);
