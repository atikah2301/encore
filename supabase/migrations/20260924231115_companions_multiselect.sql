-- Companions become a proper many-to-many relationship instead of two free-text
-- columns (`companions`, `booked_companions`). This also removes the need to copy
-- `booked_companions` into `companions` when marking a show as seen: since companions
-- now attach to the `shows` row itself (not a lifecycle-stage-specific column), whoever
-- you're booked to go with is still attached once you've actually seen it.
create table encore.companions (
  id bigint generated always as identity primary key,
  name text not null
);

-- Case-insensitive uniqueness, enforced at the DB layer as a backstop - the frontend
-- already matches/creates companions case-insensitively (see js/companion-picker.js).
create unique index companions_name_lower_idx on encore.companions (lower(name));

create table encore.show_companions (
  show_id bigint not null references encore.shows(id) on delete cascade,
  companion_id bigint not null references encore.companions(id) on delete cascade,
  primary key (show_id, companion_id)
);

alter table encore.companions enable row level security;
alter table encore.show_companions enable row level security;

-- Same hardcoded-UUID RLS pattern as every other Encore table - see
-- supabase/migrations/20260924151928_create_venues.sql for why.
create policy "encore user can read companions"
  on encore.companions for select
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can insert companions"
  on encore.companions for insert
  with check (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can read show_companions"
  on encore.show_companions for select
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can insert show_companions"
  on encore.show_companions for insert
  with check (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

create policy "encore user can delete show_companions"
  on encore.show_companions for delete
  using (auth.uid() = '7852c366-a777-4a3b-9ed3-efede5153686');

grant select, insert on encore.companions to authenticated;
grant select, insert, delete on encore.show_companions to authenticated;

-- Backfill: split existing comma-separated companion text into distinct companions,
-- and link them to the shows they came from. `booked_companions` folds into the same
-- set as `companions` - see note above.
insert into encore.companions (name)
select distinct trim(name)
from encore.shows,
     unnest(string_to_array(coalesce(companions, '') || ',' || coalesce(booked_companions, ''), ',')) as name
where trim(name) <> ''
on conflict (lower(name)) do nothing;

insert into encore.show_companions (show_id, companion_id)
select distinct s.id, c.id
from encore.shows s
cross join lateral unnest(string_to_array(coalesce(s.companions, '') || ',' || coalesce(s.booked_companions, ''), ',')) as name
join encore.companions c on lower(trim(name)) = lower(c.name)
where trim(name) <> ''
on conflict do nothing;

alter table encore.shows
  drop column companions,
  drop column booked_companions;
