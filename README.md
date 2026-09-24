# encore

Theatre viewing history and to-watch list — a small installable PWA for tracking shows you've
seen and shows you want to see next, with an easily reorderable wishlist. Just for you, behind
one shared passcode.

No build step — plain HTML/CSS/JS, hosted free on GitHub Pages, with Supabase providing the
database, API, and passcode auth (via Row Level Security).

## One-time setup

### 1. Create (or reuse) the Supabase project

Encore is designed to share one Supabase project with other personal apps (e.g. `sleep-diary`),
each app keeping its own tables in its own Postgres schema (`encore`, not `public`) and its own
Auth user, rather than each app getting its own project — that keeps you well under the free
tier's project-count and pause-after-inactivity limits. See `supabase/migrations/README.md` for
the full reasoning.

1. Go to [supabase.com](https://supabase.com) and either create a new free project, or open an
   existing one you want to reuse.
2. In the SQL editor, run each file in `supabase/migrations/`, in filename order. Together they
   create the `encore` schema, the `encore.venues` and `encore.shows` tables, and Row Level
   Security policies scoped to Encore's one Auth user (see step 4). See that folder's `README.md`
   for why shows and wishlist items share one table instead of two, and why everything lives in
   its own schema.
3. Optionally run `supabase/seed.sql` by hand to populate a few sample venues to develop/test
   against. This is a one-off script, not a migration — it's never run by the deploy pipeline.
4. Under **Authentication → Users**, manually create Encore's own user (a separate user/password
   per app, even when they share a project):
   - Email: yours, or any placeholder value — see the note below.
   - Password: the passcode you'll use to log in.
   Copy that user's UUID (shown when you open the user) — the migrations in step 2 need it
   hardcoded into their RLS policies, so do this *before* running them if starting fresh.
5. Under **Authentication → Sign In / Providers**, disable public sign-ups (so the login page
   can't be used to create new accounts).
6. Expose the schema to the API: find **Data API** settings (under Integrations, or Project
   Settings depending on your dashboard version) and add `encore` to the exposed schemas list,
   alongside `public`.
7. Copy the **Project URL** and the **anon/publishable key**: under Integrations → Data API, or
   Configuration → API Keys, depending on your dashboard version.

Note on the login email: unlike a "one shared placeholder email" design, Encore's login form
asks for an email every time (same as `sleep-diary`), so nothing app-specific needs to be
hardcoded in `js/config.js`. You can use your real email for the Auth user if you don't mind it
being something you type on every login — it's never written to any committed file, only the
passcode-protected Supabase Auth system knows it.

### 2. Configure the app

Edit `js/config.js` with your project's URL and anon key:

```js
export const SUPABASE_URL = "<your project URL>";
export const SUPABASE_ANON_KEY = "<your anon public key>";
```

The anon key is safe to commit — it only grants what the RLS policies allow, which is Encore's
one specific Auth user (by UUID), and sign-ups are disabled.

### 3. Deploy to GitHub Pages

1. Push this repo to GitHub (already done if you're reading this from the repo).
2. In the repo's **Settings → Pages**, set **Source** to "GitHub Actions."
3. Push to `master` — `.github/workflows/deploy.yml` builds and publishes automatically. Every
   deploy stamps `sw.js`'s cache name with the commit SHA, so the service worker always picks up
   the latest files (no more manually bumping a version string).
4. Wait a minute, then open the URL GitHub gives you. Install it as an app from your phone's
   "Add to Home Screen" (Safari) or desktop browser's install prompt (Chrome/Edge).

## Local development

Serve the folder with any static file server, e.g.:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`. No build step, no dependencies to install.

## Data model

See `supabase/migrations/`, including the README there explaining why history and wishlist
entries live in one `shows` table distinguished by a `seen` boolean, rather than two normalized
tables. Venues are a separate `venues` table (name + optional address), selected via dropdown;
picking a venue is optional everywhere, and there's no "add venue" UI in v1 — add rows directly
in the Supabase table editor or via `supabase/seed.sql`.

## Database changes

Schema changes live as ordered SQL files under `supabase/migrations/`, named
`<timestamp>_<description>.sql` so the filename order matches the order they were written and
run. There's no migration tool tracking what's applied — this is a solo project, so the
discipline is: add a new file, run it by hand in the Supabase SQL Editor, done.

To make a change:
1. Create `supabase/migrations/<timestamp>_<description>.sql` (e.g. via `date +%Y%m%d%H%M%S`
   for the timestamp prefix).
2. Write the SQL — `create table ...` plus RLS policies, following the pattern in the existing
   migration files.
3. Run it in the Supabase SQL Editor against the live project.

Never edit a migration file once it's been run — even a small follow-up (like adding a column)
gets its own new timestamped file. Editing an already-applied file makes the repo's history
disagree with what was actually run against the live database.
