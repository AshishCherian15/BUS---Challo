# Bus Timings — v2 (Supabase + Node)

Live bus-stop timings site. Stops, buses, routes, trips, admin accounts, bus
photos, announcements and analytics all live in Supabase (Postgres + Auth +
Storage). The Node server only serves the static site and hands the browser
its Supabase connection details — there is no custom backend logic or
password to manage anymore.

## What changed from v1
- **Supabase instead of a JSON file.** Stops/buses/routes/trips/announcements
  live in Postgres; Row Level Security (not server code) decides who can
  read and write what (see `supabase/schema.sql`).
- **Supabase Auth instead of one shared password.** Each admin signs in with
  their own email + password, created in the Supabase dashboard — no
  public sign-up page.
- **Routes** are now a first-class thing (e.g. "Route 210": an ordered list
  of stops) separate from **trips** (one bus's scheduled run, with actual
  times). A trip can optionally follow a route.
- **Bus photos**, stored in a public Supabase Storage bucket.
- **From → To search** on the homepage, alongside the original by-stop search.
- **Announcements**: admin-authored messages shown as a header banner or a
  popup, switchable between the two, turned on/off without deleting them.
- **Analytics**: page views, QR scans, and From→To searches are logged as
  events; the admin Analytics tab aggregates them (today / 7 days / 30 days
  / all time), with a views-per-day chart and top-stop / top-route tables.
- QR codes now link with `?src=qr` so a scan is distinguishable from a
  regular page view in the analytics.

## One-time setup
1. **Create a Supabase project** at supabase.com (free tier is enough to start).
2. **Run the schema.** Dashboard → SQL Editor → New query → paste the
   contents of `supabase/schema.sql` → Run. This creates every table, its
   Row Level Security policies, and the `bus-photos` storage bucket.
   - If the `insert into storage.buckets` statement errors with a
     permissions message, create the bucket by hand instead: Storage →
     New bucket → name it exactly `bus-photos` → toggle **Public** → Create,
     then re-run just the `storage.objects` policy statements near the
     bottom of the file.
3. **(Optional) Import your old data.** Only on a fresh database: SQL Editor
   → paste `supabase/seed.sql` → Run. This recreates the 5 stops, 3 buses,
   2 routes (reconstructed from the old trip patterns) and 22 trips from
   the previous `data.json`.
4. **Create your admin account(s).** Dashboard → Authentication → Users →
   Add user → set an email + password for each admin. These are the only
   accounts that can sign in at `/admin`.
5. **Get your API keys.** Dashboard → Project Settings → API → copy the
   **Project URL** and the **anon / public** key (not the `service_role`
   key — that one must never be used in a browser).
6. **Configure the server.** Copy `.env.example` to `.env` and fill in
   `SUPABASE_URL` and `SUPABASE_ANON_KEY` from step 5.
7. **Install and run.**
   ```
   npm install
   npm start
   ```
   Public site: http://localhost:3000 · Admin: http://localhost:3000/admin

## Using the admin
- **Stops** — paste names, one per line. Each gets a permanent `/s/<slug>`
  link and a QR code ("QR" button, or "Print all QR codes" for the whole
  sheet). Renaming a stop never changes its link or QR code.
- **Buses** — add name + registration; click a bus's avatar to upload a photo.
- **Routes** — define a named, ordered path of stops (e.g. "210": BC Road →
  Kalpane → Neermarga). Optional — trips can be entered without one.
- **Trips & times** — one trip = one scheduled run of a bus. Pick a route to
  pre-fill the stop list, or add stops manually; enter the actual time at
  each stop (supports pasting many rows at once).
- **Announcements** — write a message, choose banner or popup, publish.
  Switch an existing one between banner/popup, or turn it off, without
  losing it. The public site remembers (per browser session) that someone
  dismissed a banner or has seen a popup, so it won't nag on every page.
- **Analytics** — total views / QR scans / From→To searches over a chosen
  date range, a views-per-day chart, and the most-viewed, most-scanned, and
  most-searched-for stops and routes.

## Notes on scale and security
- Analytics are stored as raw events (one row per view/scan/search), which
  keeps the dashboard flexible but will grow a large table over time on a
  busy site. If that becomes a problem, add a scheduled job that rolls old
  rows up into daily summaries and trims the raw table.
- The anon key is meant to be public — it only grants what the Row Level
  Security policies in `schema.sql` allow (public read, public insert of
  analytics events, nothing else). Never put the `service_role` key in any
  file under `public/`.
- The RLS policies treat *any* signed-in Supabase user as an admin, which is
  right for a small, trusted team. If you need finer-grained roles later
  (e.g. an editor who can't delete), add an `admin_profiles` table with a
  role column and reference it from the policies instead of
  `auth.role() = 'authenticated'`.
- The v1 project folder you uploaded had a leaked session-cookie file (`j`)
  and a duplicate data file (`d.json`) sitting in the project root — worth
  deleting from wherever that project is stored, and treating that old
  session as compromised, even though this rebuild no longer uses that
  auth scheme at all.

## Deploy
Host the Node app anywhere (Render, Railway, Fly.io, a VPS) behind HTTPS,
set the two env vars there, and use a custom domain **before** printing QR
codes (QR links are generated from `location.origin`, so printing from a
temporary URL means reprinting later).

## Structure
```
bus-timings/
├── server.js              Static file server + /env.js (Supabase config for the browser)
├── package.json
├── .env.example
├── supabase/
│   ├── schema.sql          Tables, RLS policies, storage bucket — run first
│   └── seed.sql            Optional: imports the old data.json content
├── public/
│   ├── index.html          Public site (/, /s/<slug>)
│   ├── admin.html          Admin panel (/admin)
│   ├── style.css
│   └── js/
│       ├── shared.js       Supabase client + formatting/analytics helpers
│       ├── site.js         Public site logic
│       └── admin.js        Admin panel logic
└── README.md
```
