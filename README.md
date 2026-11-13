# Bus Timings

Mobile-first bus arrival site for 100+ stops, with a password-protected admin panel. Light theme, plain CSS (no CDN needed), no npm dependencies.

## Structure
```
bus-app/
├── server.js          Node server: public data API, admin login, static files
├── package.json
├── data/data.json     All stops, buses and trips (the "database"; back it up)
├── public/
│   ├── index.html     Public site (/, /s/<stop-id>)
│   └── admin.html     Admin panel (/admin)
└── README.md
```

## Run
Requires Node 18+.
```
ADMIN_PASSWORD="choose-a-strong-password" node server.js     # Linux/macOS
set ADMIN_PASSWORD=choose-a-strong-password && node server.js  # Windows cmd
```
Public site: http://localhost:3000  ·  Admin: http://localhost:3000/admin

## Using the admin
1. Stops: paste names, one per line. Each stop gets a permanent link /s/<id>, a QR, and "Print all QR codes".
2. Buses: add name and registration.
3. Trips & times: one trip = one run of a bus, stops in order with arrival times (supports paste).
4. Click Save changes.

## Deploy
Host on any Node host (Render, Railway, Fly.io, a VPS) behind HTTPS and set ADMIN_PASSWORD. Use a custom domain before printing QR codes, then print them from the admin on that domain. Keep data/ on persistent storage.
Test a time with ?time=13:00, for example /s/neermarga?time=13:00.
