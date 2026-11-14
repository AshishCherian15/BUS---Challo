-- ============================================================================
-- Bus Timings — seed data, converted from the previous data/data.json
-- Run AFTER schema.sql. Safe to run once; re-running will create duplicates
-- (it does not check for existing rows), so only run this on a fresh DB.
-- ============================================================================

-- Stops
insert into stops (slug, name) values ('bc-road', 'B.C Road');
insert into stops (slug, name) values ('kalpane', 'Kalpane');
insert into stops (slug, name) values ('neermarga', 'Neermarga');
insert into stops (slug, name) values ('nanthoor', 'Nanthoor');
insert into stops (slug, name) values ('statbank', 'Statbank');

-- Buses
insert into buses (name, reg) values ('Sabari', 'KA 19 D 7354');
insert into buses (name, reg) values ('Sindu', 'KA 19 AA 5055');
insert into buses (name, reg) values ('New Bus', '7706');

-- Routes (reconstructed from the distinct stop sequences seen in the old trips)
insert into routes (code, name) values ('A', 'B.C Road -> Kalpane -> Neermarga');
insert into routes (code, name) values ('B', 'Statbank -> Nanthoor -> Neermarga -> Kalpane');

-- Route stops (ordered path for each route)
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='A'), (select id from stops where slug='bc-road'), 1;
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='A'), (select id from stops where slug='kalpane'), 2;
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='A'), (select id from stops where slug='neermarga'), 3;
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='B'), (select id from stops where slug='statbank'), 1;
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='B'), (select id from stops where slug='nanthoor'), 2;
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='B'), (select id from stops where slug='neermarga'), 3;
insert into route_stops (route_id, stop_id, sequence) select (select id from routes where code='B'), (select id from stops where slug='kalpane'), 4;

-- Trips + trip stops
with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '06:15'),
  (2, 'kalpane', '06:35'),
  (3, 'neermarga', '07:10')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '07:40'),
  (2, 'nanthoor', '08:00'),
  (3, 'neermarga', '08:20'),
  (4, 'kalpane', '08:55')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '09:30'),
  (2, 'kalpane', '10:00'),
  (3, 'neermarga', '10:35')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '11:35'),
  (2, 'nanthoor', '12:00'),
  (3, 'neermarga', '12:15'),
  (4, 'kalpane', '12:50')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '13:35'),
  (2, 'kalpane', '14:00'),
  (3, 'neermarga', '14:35')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '15:35'),
  (2, 'nanthoor', '15:55'),
  (3, 'neermarga', '16:15'),
  (4, 'kalpane', '16:50')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '17:15'),
  (2, 'kalpane', '17:45'),
  (3, 'neermarga', '18:20')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sabari')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '19:05'),
  (2, 'nanthoor', '19:25'),
  (3, 'neermarga', '19:45'),
  (4, 'kalpane', '20:15')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sindu')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '06:45'),
  (2, 'kalpane', '07:20'),
  (3, 'neermarga', '07:55')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sindu')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '08:30'),
  (2, 'nanthoor', '08:50'),
  (3, 'neermarga', '09:10'),
  (4, 'kalpane', '09:45')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sindu')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '11:20'),
  (2, 'kalpane', '12:00'),
  (3, 'neermarga', '12:35')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sindu')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '13:35'),
  (2, 'nanthoor', '13:55'),
  (3, 'neermarga', '14:15'),
  (4, 'kalpane', '14:50')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='Sindu')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '15:20'),
  (2, 'kalpane', '15:55'),
  (3, 'neermarga', '16:35')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='Sindu')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '17:35'),
  (2, 'nanthoor', '17:55'),
  (3, 'neermarga', '18:15'),
  (4, 'kalpane', '18:50')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '06:30'),
  (2, 'kalpane', '07:00'),
  (3, 'neermarga', '07:35')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '08:10'),
  (2, 'nanthoor', '08:30'),
  (3, 'neermarga', '08:50'),
  (4, 'kalpane', '09:25')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '10:10'),
  (2, 'kalpane', '10:35'),
  (3, 'neermarga', '11:15')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '12:05'),
  (2, 'nanthoor', '12:25'),
  (3, 'neermarga', '12:45'),
  (4, 'kalpane', '13:20')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '14:00'),
  (2, 'kalpane', '14:25'),
  (3, 'neermarga', '15:00')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '16:00'),
  (2, 'nanthoor', '16:20'),
  (3, 'neermarga', '16:40'),
  (4, 'kalpane', '17:15')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='A'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'bc-road', '17:55'),
  (2, 'kalpane', '18:25'),
  (3, 'neermarga', '19:00')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

with new_trip as (
  insert into trips (route_id, bus_id)
  select (select id from routes where code='B'), (select id from buses where name='New Bus')
  returning id
)
insert into trip_stops (trip_id, stop_id, sequence, time)
select new_trip.id, stops.id, v.seq, v.time::time
from new_trip, (values
  (1, 'statbank', '19:35'),
  (2, 'nanthoor', '19:55'),
  (3, 'neermarga', '20:15'),
  (4, 'kalpane', '20:45')
) as v(seq, slug, time)
join stops on stops.slug = v.slug;

