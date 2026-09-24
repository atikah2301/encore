-- This project shares a Supabase project with other personal apps (see
-- supabase/migrations/README.md for why). Everything Encore owns lives in its
-- own `encore` schema so table names never collide with another app's, and so
-- RLS can be scoped to only Encore's own Auth user.
create schema if not exists encore;

-- Schemas other than `public` aren't reachable via the REST API by default -
-- this grant is required in addition to adding `encore` to Project Settings
-- -> API -> Exposed schemas in the dashboard. Only `authenticated` gets
-- access; `anon` has no business touching a passcode-protected app.
grant usage on schema encore to authenticated;

create table encore.venues (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

-- Row Level Security: this is what actually enforces the passcode. Any request
-- that doesn't come from Encore's one signed-in Supabase Auth user is
-- rejected, regardless of what the (public) frontend code does or doesn't
-- check client-side. The UUID below is that user's id (Authentication ->
-- Users in the Supabase dashboard) - hardcoded rather than a generic
-- "any logged-in user" check, since this Supabase project is shared with
-- other apps' own Auth users too.
alter table encore.venues enable row level security;

create policy "encore user can read venues"
  on encore.venues for select
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can insert venues"
  on encore.venues for insert
  with check (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can update venues"
  on encore.venues for update
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can delete venues"
  on encore.venues for delete
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

grant select, insert, update, delete on encore.venues to authenticated;
