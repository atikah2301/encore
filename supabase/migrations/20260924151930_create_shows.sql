-- See supabase/migrations/README.md for why history and wishlist are a single
-- table with a `seen` boolean, rather than two normalized tables.
create table encore.shows (
  id bigint generated always as identity primary key,
  title text not null,
  venue_id bigint references encore.venues(id),
  seen boolean not null default false,
  date_seen date,                  -- optional; may be a partial date, see date_seen_precision
  date_seen_precision text check (date_seen_precision in ('day', 'month', 'year')),
  rating smallint check (rating between 1 and 5),
  companions text,
  notes text,
  booking_url text,
  position integer unique,         -- wishlist sort order; null once seen
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function encore.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger shows_set_updated_at
before update on encore.shows
for each row execute function encore.set_updated_at();

-- Row Level Security: this is what actually enforces the passcode. Any request
-- that doesn't come from Encore's one signed-in Supabase Auth user is
-- rejected, regardless of what the (public) frontend code does or doesn't
-- check client-side. Same hardcoded-UUID pattern as encore.venues - see that
-- migration for why.
alter table encore.shows enable row level security;

create policy "encore user can read shows"
  on encore.shows for select
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can insert shows"
  on encore.shows for insert
  with check (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can update shows"
  on encore.shows for update
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can delete shows"
  on encore.shows for delete
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

grant select, insert, update, delete on encore.shows to authenticated;
