const app = document.getElementById('app');
let STOPS = [], BUSES = {}, ROUTES = {}, TRIPS = [];
let homeTab = 'stop', win = 30, qStop = '', qFrom = '', qTo = '';

const P = new URLSearchParams(location.search);
const stopFromPath = (location.pathname.match(/^\/s\/([^/?#]+)/) || [])[1];
const currentSlug = P.get('stop') || (stopFromPath && decodeURIComponent(stopFromPath));

const pinIcon = '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const arrowIcon = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
const swapIcon = '<svg viewBox="0 0 24 24"><path d="M7 10l-3 3 3 3M4 13h16M17 14l3-3-3-3M20 11H4"/></svg>';

// ---------------------------------------------------------------- data load
async function loadData() {
  const [{ data: stops }, { data: buses }, { data: routes }, { data: trips }] = await Promise.all([
    supabase.from('stops').select('id, slug, name').order('name'),
    supabase.from('buses').select('id, name, reg, photo_url'),
    supabase.from('routes').select('id, code, name'),
    supabase.from('trips').select('id, bus_id, route_id, trip_stops(stop_id, sequence, time)'),
  ]);
  STOPS = stops || [];
  BUSES = Object.fromEntries((buses || []).map(b => [b.id, b]));
  ROUTES = Object.fromEntries((routes || []).map(r => [r.id, r]));
  TRIPS = (trips || []).map(t => ({ ...t, trip_stops: [...t.trip_stops].sort((a, b) => a.sequence - b.sequence) }));
}

const stopName = id => (STOPS.find(s => s.id === id) || {}).name || '?';

// ------------------------------------------------------------- arrivals
function arrivalsAt(stopId) {
  const out = [];
  TRIPS.forEach(t => {
    const i = t.trip_stops.findIndex(e => e.stop_id === stopId);
    if (i === -1) return;
    const last = t.trip_stops[t.trip_stops.length - 1];
    out.push({
      mins: toMins(t.trip_stops[i].time),
      bus: BUSES[t.bus_id] || { name: 'Bus', reg: '' },
      route: ROUTES[t.route_id],
      to: i === t.trip_stops.length - 1 ? null : stopName(last.stop_id),
    });
  });
  return out.sort((a, b) => a.mins - b.mins);
}

function journeys(fromId, toId) {
  const out = [];
  TRIPS.forEach(t => {
    const fi = t.trip_stops.findIndex(e => e.stop_id === fromId);
    const ti = t.trip_stops.findIndex(e => e.stop_id === toId);
    if (fi > -1 && ti > -1 && fi < ti) {
      out.push({
        bus: BUSES[t.bus_id] || { name: 'Bus', reg: '' },
        route: ROUTES[t.route_id],
        dep: toMins(t.trip_stops[fi].time),
        arr: toMins(t.trip_stops[ti].time),
      });
    }
  });
  return out.sort((a, b) => a.dep - b.dep);
}

// ------------------------------------------------------------------ cards
function busPhoto(bus) {
  return bus.photo_url ? `<img class="buspic" src="${esc(bus.photo_url)}" alt="${esc(bus.name)}">` : `<span class="buspic placeholder">${esc((bus.name || '?')[0])}</span>`;
}
function arrivalCard(a, nowMins, first) {
  const diff = a.mins - nowMins;
  const [t, ap] = fmtClock(a.mins);
  return `<article class="bus${first ? ' first' : ''}">
    ${busPhoto(a.bus)}
    <div class="tm"><b>${t}</b><span>${ap}</span></div>
    <div class="info">
      <span class="badge${diff <= 2 ? ' soon' : ''}">${fmtEta(diff)}</span>
      <div class="nm">${esc(a.bus.name)} ${a.bus.reg ? `<span class="tag">${esc(a.bus.reg)}</span>` : ''} ${a.route ? `<span class="tag route">Route ${esc(a.route.code)}</span>` : ''}</div>
      <div class="to">${a.to ? 'Towards ' + esc(a.to) : 'Ends at this stop'}</div>
    </div></article>`;
}
function journeyCard(j, nowMins, first) {
  const [dt, dap] = fmtClock(j.dep), [at, aap] = fmtClock(j.arr);
  const diff = j.dep - nowMins;
  return `<article class="bus journey${first ? ' first' : ''}">
    ${busPhoto(j.bus)}
    <div class="info">
      <span class="badge${diff <= 2 && diff >= -5 ? ' soon' : ''}">${diff >= -5 ? fmtEta(Math.max(diff, 0)) : 'Departed'}</span>
      <div class="nm">${esc(j.bus.name)} ${j.bus.reg ? `<span class="tag">${esc(j.bus.reg)}</span>` : ''} ${j.route ? `<span class="tag route">Route ${esc(j.route.code)}</span>` : ''}</div>
      <div class="to journey-times"><b>${dt} ${dap}</b> ${arrowIcon} <b>${at} ${aap}</b></div>
    </div></article>`;
}

// --------------------------------------------------------------- home tab
function stopListHtml(list) {
  if (!list.length) return `<div class="empty"><b>No stops found</b><p>Try a different spelling.</p></div>`;
  return `<ul class="list">${list.map(s => `<li><a class="item" href="/s/${encodeURIComponent(s.slug)}"><span class="pin">${pinIcon}</span><b>${esc(s.name)}</b><span class="chev">&rsaquo;</span></a></li>`).join('')}</ul>`;
}
function filteredStops(q) {
  return STOPS.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));
}
function stopSearchView() {
  return `<div class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    <input id="q" type="search" value="${esc(qStop)}" placeholder="Search bus stop" autocomplete="off"></div>
   <h2 class="sec-title">${STOPS.length} bus stops</h2><div id="list">${stopListHtml(filteredStops(qStop))}</div>`;
}
function fromToView() {
  return `<datalist id="stopdl">${STOPS.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>
  <div class="ft-row">
    <div class="ft-field"><label>From</label><input id="ftFrom" list="stopdl" class="input" value="${esc(qFrom)}" placeholder="Starting stop" autocomplete="off"></div>
    <button class="btn-swap" id="ftSwap" title="Swap stops" aria-label="Swap from and to">${swapIcon}</button>
    <div class="ft-field"><label>To</label><input id="ftTo" list="stopdl" class="input" value="${esc(qTo)}" placeholder="Destination stop" autocomplete="off"></div>
  </div>
  <button class="btn btn-p ft-go" id="ftGo">Find buses</button>
  <div id="ftResults" class="mt2"></div>`;
}
function renderFtResults() {
  const box = document.getElementById('ftResults');
  if (!box) return;
  const from = STOPS.find(s => s.name.toLowerCase() === qFrom.trim().toLowerCase());
  const to = STOPS.find(s => s.name.toLowerCase() === qTo.trim().toLowerCase());
  if (!qFrom && !qTo) { box.innerHTML = ''; return; }
  if (!from || !to) { box.innerHTML = `<div class="empty"><b>Pick two valid stops</b><p>Choose a "From" and "To" stop from the suggestions.</p></div>`; return; }
  if (from.id === to.id) { box.innerHTML = `<div class="empty"><b>Pick two different stops</b></div>`; return; }
  const n = nowMinsIST();
  const js = journeys(from.id, to.id);
  logEvent('search', { from_stop_id: from.id, to_stop_id: to.id });
  if (!js.length) { box.innerHTML = `<div class="empty"><b>No direct buses found</b><p>No scheduled bus goes from ${esc(from.name)} to ${esc(to.name)} in that direction.</p></div>`; return; }
  const upcoming = js.filter(j => j.dep >= n - 5);
  const list = upcoming.length ? upcoming : js;
  box.innerHTML = `<h2 class="sec-title">${esc(from.name)} &rarr; ${esc(to.name)}</h2>${list.map((j, i) => journeyCard(j, n, i === 0)).join('')}`;
}

function homeView() {
  return `<h1 class="title">Find your bus</h1><p class="sub" style="margin-top:6px">Search a stop, or plan a journey from one stop to another.</p>
  <div class="seg" role="tablist" aria-label="Search mode">
    <button data-hometab="stop" class="${homeTab === 'stop' ? 'on' : ''}" title="Search by a single stop">By stop</button>
    <button data-hometab="route" class="${homeTab === 'route' ? 'on' : ''}" title="Search by starting point and destination">From &rarr; To</button>
  </div>
  <div id="homeBody" class="mt2">${homeTab === 'stop' ? stopSearchView() : fromToView()}</div>`;
}

// --------------------------------------------------------------- stop page
function stopPageView(s) {
  const n = nowMinsIST(), all = arrivalsAt(s.id);
  const list = all.filter(a => a.mins >= n - 2 && a.mins <= n + win);
  const later = all.filter(a => a.mins > n + win).slice(0, 3);
  const [t, ap] = fmtClock(n);
  return `<a class="back" href="/">&lsaquo; All stops</a>
  <section class="hero"><small>Bus stop</small><h1>${esc(s.name)}</h1><div class="now"><span class="dot"></span>Now <b>${t} ${ap}</b></div></section>
  <div class="seg" role="group" aria-label="Time range">${[30, 60, 120].map(w => `<button data-w="${w}" class="${w === win ? 'on' : ''}" title="Show buses arriving in the next ${fmtWindow(w)}">Next ${fmtWindow(w)}</button>`).join('')}</div>
  ${list.length
    ? `<h2 class="sec-title">Arriving in the next ${fmtWindow(win)}</h2>` + list.map((a, i) => arrivalCard(a, n, i === 0)).join('')
    : `<h2 class="sec-title">Next ${fmtWindow(win)}</h2><div class="empty"><b>No buses right now</b><p>${later.length ? 'The next buses are listed below.' : 'There are no more buses today.'}</p></div>`}
  ${later.length ? `<h2 class="sec-title">Later today</h2>` + later.map(a => arrivalCard(a, n, false)).join('') : ''}
  <p class="note">Scheduled times. Actual arrival may vary with traffic.</p>`;
}

// ----------------------------------------------------------------- render
function render() {
  if (!STOPS.length && !currentSlug) { /* still render empty state below */ }
  if (currentSlug) {
    const s = STOPS.find(x => x.slug === currentSlug);
    app.innerHTML = s ? stopPageView(s) : `<a class="back" href="/">&lsaquo; All stops</a><div class="empty"><b>Stop not found</b><p>This code may be out of date. Search for your stop instead.</p></div>`;
  } else {
    app.innerHTML = homeView();
  }
}

app.addEventListener('click', e => {
  const w = e.target.closest('[data-w]');
  if (w) { win = +w.dataset.w; render(); return; }
  const tabBtn = e.target.closest('[data-hometab]');
  if (tabBtn) { homeTab = tabBtn.dataset.hometab; render(); return; }
  if (e.target.id === 'ftSwap') { [qFrom, qTo] = [qTo, qFrom]; render(); setTimeout(renderFtResults, 0); return; }
  if (e.target.id === 'ftGo') { qFrom = document.getElementById('ftFrom').value; qTo = document.getElementById('ftTo').value; renderFtResults(); return; }
});
app.addEventListener('input', e => {
  if (e.target.id === 'q') { qStop = e.target.value; document.getElementById('list').innerHTML = stopListHtml(filteredStops(qStop)); }
});

// ------------------------------------------------------------ announcements
async function loadAnnouncements() {
  const { data } = await supabase.from('announcements').select('*').eq('active', true).order('created_at', { ascending: false });
  if (!data || !data.length) return;
  const banner = data.find(a => a.display_type === 'banner');
  const popup = data.find(a => a.display_type === 'popup');
  if (banner && sessionStorage.getItem('dismissed-banner-' + banner.id) !== '1') {
    const el = document.getElementById('banner');
    el.innerHTML = `<div class="in"><span>${esc(banner.message)}</span><button aria-label="Dismiss announcement" onclick="document.getElementById('banner').classList.remove('on');sessionStorage.setItem('dismissed-banner-${banner.id}','1')">&times;</button></div>`;
    el.classList.add('on');
  }
  if (popup && sessionStorage.getItem('seen-popup-' + popup.id) !== '1') {
    const el = document.getElementById('popupModal');
    el.innerHTML = `<div class="box"><h3>Announcement</h3><p>${esc(popup.message)}</p><button class="btn btn-p" style="width:100%" onclick="document.getElementById('popupModal').classList.remove('on')">Got it</button></div>`;
    el.classList.add('on');
    sessionStorage.setItem('seen-popup-' + popup.id, '1');
  }
}

// ----------------------------------------------------------------- analytics
function logPageView() {
  const stop = STOPS.find(x => x.slug === currentSlug);
  if (stop) {
    logEvent('view', { stop_id: stop.id });
    if (P.get('src') === 'qr') logEvent('qr_scan', { stop_id: stop.id });
  } else if (!currentSlug) {
    logEvent('view', {});
  }
}

async function init() {
  app.innerHTML = '<p class="sub" style="text-align:center;margin-top:80px">Loading…</p>';
  try {
    await loadData();
    render();
    logPageView();
    loadAnnouncements();
    setInterval(render, 20000);
    setInterval(loadData, 60000);
  } catch (e) {
    app.innerHTML = '<div class="empty" style="margin-top:40px"><b>Could not load timings</b><p>Check your connection and refresh.</p></div>';
  }
}
init();
