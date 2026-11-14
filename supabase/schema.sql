-- ============================================================================
-- Bus Timings — Supabase schema
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING throughout).
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- STOPS — physical bus stops. `slug` is the permanent part of /s/<slug> and
-- of the QR code, so it is never changed once a QR has been printed.
-- ---------------------------------------------------------------------------
create table if not exists stops (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- BUSES — the physical vehicles. photo_url points into the `bus-photos`
-- storage bucket created below.
-- ---------------------------------------------------------------------------
create table if not exists buses (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  reg        text,
  photo_url  text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ROUTES — a named path (e.g. "210") independent of any one bus or time.
-- ---------------------------------------------------------------------------
create table if not exists routes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null,        -- short label, e.g. "210"
  name        text,                 -- optional friendly name, e.g. "BC Road - Neermarga"
  description text,
  created_at  timestamptz not null default now()
);

-- Ordered stops that make up a route (no times here — times are per trip).
create table if not exists route_stops (
  id       uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes(id) on delete cascade,
  stop_id  uuid not null references stops(id) on delete cascade,
  sequence int  not null,
  unique (route_id, sequence)
);

-- ---------------------------------------------------------------------------
-- TRIPS — one scheduled run of a bus (optionally along a route), with the
-- actual arrival time at each stop for that specific run.
-- ---------------------------------------------------------------------------
create table if not exists trips (
  id         uuid primary key default gen_random_uuid(),
  route_id   uuid references routes(id) on delete set null,
  bus_id     uuid not null references buses(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists trip_stops (
  id       uuid primary key default gen_random_uuid(),
  trip_id  uuid not null references trips(id) on delete cascade,
  stop_id  uuid not null references stops(id) on delete cascade,
  sequence int  not null,
  time     time not null,
  unique (trip_id, sequence)
);

-- ---------------------------------------------------------------------------
-- ANNOUNCEMENTS — admin-authored messages shown as a header banner or a
-- popup. `active` lets the admin switch one on/off without deleting it.
-- ---------------------------------------------------------------------------
create table if not exists announcements (
  id           uuid primary key default gen_random_uuid(),
  message      text not null,
  display_type text not null default 'banner' check (display_type in ('banner', 'popup')),
  active       boolean not null default true,
  starts_at    timestamptz,
  ends_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- ANALYTICS — one row per page view / QR scan / from-to search. Kept as raw
-- events (not pre-aggregated) so the admin dashboard can slice by any date
-- range; the public site can only ever INSERT, never read these back.
-- ---------------------------------------------------------------------------
create table if not exists analytics_events (
  id            uuid primary key default gen_random_uuid(),
  event_type    text not null check (event_type in ('view', 'qr_scan', 'search')),
  stop_id       uuid references stops(id) on delete set null,
  from_stop_id  uuid references stops(id) on delete set null,
  to_stop_id    uuid references stops(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists analytics_events_created_at_idx on analytics_events (created_at);
create index if not exists analytics_events_type_idx on analytics_events (event_type);

-- ============================================================================
-- ROW LEVEL SECURITY
--
-- Model: anyone (anon key) can READ the schedule data and INSERT analytics
-- events. Only a SIGNED-IN Supabase Auth user (your admin team) can write
-- stops/buses/routes/trips/announcements, or read raw analytics. Create
-- admin accounts in Dashboard -> Authentication -> Users -> Add user; there
-- is no public sign-up page, which is intentional.
-- ============================================================================

alter table stops             enable row level security;
alter table buses              enable row level security;
alter table routes             enable row level security;
alter table route_stops        enable row level security;
alter table trips              enable row level security;
alter table trip_stops         enable row level security;
alter table announcements      enable row level security;
alter table analytics_events   enable row level security;

-- Public read access to schedule data
drop policy if exists "public read stops" on stops;
create policy "public read stops" on stops for select using (true);

drop policy if exists "public read buses" on buses;
create policy "public read buses" on buses for select using (true);

drop policy if exists "public read routes" on routes;
create policy "public read routes" on routes for select using (true);

drop policy if exists "public read route_stops" on route_stops;
create policy "public read route_stops" on route_stops for select using (true);

drop policy if exists "public read trips" on trips;
create policy "public read trips" on trips for select using (true);

drop policy if exists "public read trip_stops" on trip_stops;
create policy "public read trip_stops" on trip_stops for select using (true);

drop policy if exists "public read announcements" on announcements;
create policy "public read announcements" on announcements for select using (true);

-- Admin (any authenticated user) can write schedule data
drop policy if exists "admin write stops" on stops;
create policy "admin write stops" on stops for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write buses" on buses;
create policy "admin write buses" on buses for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write routes" on routes;
create policy "admin write routes" on routes for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write route_stops" on route_stops;
create policy "admin write route_stops" on route_stops for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write trips" on trips;
create policy "admin write trips" on trips for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write trip_stops" on trip_stops;
create policy "admin write trip_stops" on trip_stops for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "admin write announcements" on announcements;
create policy "admin write announcements" on announcements for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Analytics: public can log events, only admins can read them back
drop policy if exists "anyone logs analytics" on analytics_events;
create policy "anyone logs analytics" on analytics_events for insert
  with check (true);

drop policy if exists "admin reads analytics" on analytics_events;
create policy "admin reads analytics" on analytics_events for select
  using (auth.role() = 'authenticated');

-- ============================================================================
-- STORAGE — bucket for bus photos
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('bus-photos', 'bus-photos', true)
on conflict (id) do nothing;

drop policy if exists "public read bus photos" on storage.objects;
create policy "public read bus photos" on storage.objects for select
  using (bucket_id = 'bus-photos');

drop policy if exists "admin upload bus photos" on storage.objects;
create policy "admin upload bus photos" on storage.objects for insert
  with check (bucket_id = 'bus-photos' and auth.role() = 'authenticated');

drop policy if exists "admin update bus photos" on storage.objects;
create policy "admin update bus photos" on storage.objects for update
  using (bucket_id = 'bus-photos' and auth.role() = 'authenticated');

drop policy if exists "admin delete bus photos" on storage.objects;
create policy "admin delete bus photos" on storage.objects for delete
  using (bucket_id = 'bus-photos' and auth.role() = 'authenticated');

-- ============================================================================
-- Done. Next: Authentication -> Users -> Add user (create your admin
-- logins), then run supabase/seed.sql if you want to import the old data.
-- ============================================================================
