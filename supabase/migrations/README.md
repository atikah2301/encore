# Why `shows` is one table, not two

The obvious "correct" design for a history log + a wishlist is two separate
tables (or a shared parent with two child tables). This project deliberately
uses **one `shows` table with a `seen` boolean** instead.

Reasoning: whatever split-table design you pick, moving a show from wishlist
to history means either (a) inserting into a history table and deleting from
a wishlist table, or (b) inserting into a child table and deleting from
another child table. Either way you're doing two writes and losing the
original row's `id`/`created_at` in the process (or working hard to preserve
it across tables). A single table with a `seen` boolean makes "mark as seen"
a single `UPDATE` on the same row — the row's identity survives its whole
lifecycle.

The tradeoff is columns that are only meaningful in one state or the other:
`position`/`booking_url` matter pre-seen, `date_seen`/`rating`/`companions`/
`notes` matter post-seen. At this project's scale — a personal list, likely
never more than a few hundred rows — that's a non-issue in practice, and it's
outweighed by the simplicity of one table, one set of RLS policies, and no
joins between history and wishlist state.

If this project ever grows well beyond personal-list scale, revisit this —
but the tradeoff was made deliberately, not by oversight.

# Why everything lives in an `encore` schema

This app shares one Supabase project with other personal apps (each app gets
its own Supabase Auth user rather than its own project, to stay under the
free tier's project-count/pause-after-inactivity limits). To keep apps from
colliding, every table Encore owns lives in a dedicated `encore` Postgres
schema instead of the default `public` one, and RLS policies check for
Encore's specific Auth user UUID rather than the more generic
`auth.uid() is not null` — otherwise any app sharing this project could read
or write any other app's tables just by being logged in as *their own* user.

Practical implications:
- `encore` must be added to **Project Settings → API → Exposed schemas** in
  the Supabase dashboard, or the REST API can't reach it at all.
- The JS client (`js/supabase-client.js`) is configured with
  `db: { schema: "encore" }` so table calls (`supabase.from("shows")`, etc.)
  resolve against `encore.shows`, not `public.shows`.
- New migrations should keep creating objects inside `encore.*` and keep
  reusing the same hardcoded UUID pattern in their RLS policies.
