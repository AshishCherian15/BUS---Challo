// Bus Timings server — v2 (Supabase backend)
//
// This server does ONE job: serve the static site and hand the browser
// its Supabase connection details. All data (stops, buses, routes, trips,
// announcements, analytics) lives in Supabase/Postgres. Reads are public,
// writes require a signed-in Supabase Auth session (admin) — both are
// enforced by Row Level Security policies in supabase/schema.sql, not by
// this server, so there is no custom API or password logic here anymore.
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    '\nMissing SUPABASE_URL / SUPABASE_ANON_KEY.\n' +
    'Copy .env.example to .env and fill in your Supabase project values,\n' +
    'then restart. See README.md for the full setup steps.\n'
  );
  process.exit(1);
}

// Gives the browser just the two public, RLS-protected values it needs.
// Never put the service_role key here — that key must never reach a browser.
app.get('/env.js', (req, res) => {
  res.type('application/javascript').send(
    `window.ENV = ${JSON.stringify({ SUPABASE_URL, SUPABASE_ANON_KEY })};`
  );
});

app.use(express.static(path.join(__dirname, 'public')));

// Pretty stop links: /s/neermarga -> public/index.html (slug is read from the URL client-side)
app.get('/s/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use((req, res) => res.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

app.listen(PORT, () => {
  console.log(`Bus Timings running on http://localhost:${PORT}  (admin: /admin)`);
});
