-- Flagged by Supabase's security advisor: report_content had an anon INSERT
-- policy with WITH CHECK (true) (unrestricted — anyone could insert arbitrary
-- rows) and an anon SELECT policy with USING (true) (anyone could read every
-- row). A grep of the codebase confirmed nothing ever reads report_content
-- back (the report renders from a localStorage-cached copy instead), and the
-- one place that writes it (generatePatternCopy.ts) has been switched to the
-- service-role client, which bypasses RLS entirely and doesn't need a policy.
-- Dropping both — RLS stays enabled on the table, just with no anon/
-- authenticated policies left, so it's now service-role-write-only, matching
-- the model already used for public.users.
drop policy if exists "anon can insert report_content" on public.report_content;
drop policy if exists "anon can read report_content" on public.report_content;
