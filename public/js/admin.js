const A = document.getElementById('app'), $ = id => document.getElementById(id);
let S = { stops: [], buses: [], routes: [], trips: [] };
let tab = 'stops', fq = '', tripEdit = null, routeEdit = null;

// ------------------------------------------------------------------- auth
async function init() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) { await loadData(); shell(); } else { loginView(); }
  supabase.auth.onAuthStateChange((_evt, session) => {
    if (!session) loginView();
  });
}
function loginView(msg = '') {
  $('who').innerHTML = '';
  A.innerHTML = `<div class="card login">
    <h1 class="title" style="font-size:24px">Admin sign in</h1>
    <p class="sub" style="margin-top:4px">Manage stops, buses, routes, timings, announcements and analytics.</p>
    <input id="email" type="email" class="input mt" style="width:100%" placeholder="Email" autocomplete="username">
    <input id="pw" type="password" class="input mt" style="width:100%" placeholder="Password" autocomplete="current-password" onkeydown="if(event.key==='Enter')login()">
    <p id="lerr" class="err">${esc(msg)}</p>
    <button class="btn btn-p" style="width:100%" onclick="login()">Sign in</button>
    <p class="sub mt" style="font-size:12px">No sign-up here — admin accounts are created in the Supabase dashboard (Authentication → Users).</p>
  </div>`;
  $('email').focus();
}
async function login() {
  const email = $('email').value.trim(), password = $('pw').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { $('lerr').textContent = error.message; return; }
  await loadData(); shell();
}
async function logout() { await supabase.auth.signOut(); loginView(); }

// ------------------------------------------------------------------- data
async function loadData() {
  const [{ data: stops }, { data: buses }, { data: routes }, { data: trips }] = await Promise.all([
    supabase.from('stops').select('id, slug, name').order('name'),
    supabase.from('buses').select('id, name, reg, photo_url').order('name'),
    supabase.from('routes').select('id, code, name, description, route_stops(id, stop_id, sequence)').order('code'),
    supabase.from('trips').select('id, bus_id, route_id, trip_stops(id, stop_id, sequence, time)'),
  ]);
  S.stops = stops || [];
  S.buses = buses || [];
  S.routes = (routes || []).map(r => ({ ...r, route_stops: [...(r.route_stops || [])].sort((a, b) => a.sequence - b.sequence) }));
  S.trips = (trips || []).map(t => ({ ...t, trip_stops: [...(t.trip_stops || [])].sort((a, b) => a.sequence - b.sequence) }));
}
const stopName = id => (S.stops.find(s => s.id === id) || { name: '?' }).name;
const busLabel = b => `${b.name}${b.reg ? ' ' + b.reg : ''}`;
const link = slug => location.origin + '/s/' + encodeURIComponent(slug) + '?src=qr';
const sortedByName = a => [...a].sort((x, y) => x.name.localeCompare(y.name));

// ------------------------------------------------------------------ shell
function shell() {
  $('who').innerHTML = `<a class="btn btn-s btn-sm" href="/" target="_blank">View site</a><button class="btn btn-s btn-sm" onclick="logout()">Sign out</button>`;
  A.innerHTML = `<p class="sub">${S.stops.length} stops · ${S.buses.length} buses · ${S.routes.length} routes · ${S.trips.length} trips</p>
  <nav class="tabs">${[['stops', 'Stops'], ['buses', 'Buses'], ['routes', 'Routes'], ['trips', 'Trips & times'], ['announcements', 'Announcements'], ['analytics', 'Analytics']]
    .map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" onclick="tab='${k}';shell()">${l}</button>`).join('')}</nav>
  <div id="body" class="mt2"></div>`;
  ({ stops: stopsView, buses: busesView, routes: routesView, trips: tripsView, announcements: announcementsView, analytics: analyticsView })[tab]();
}

// ====================================================================== STOPS
function stopsView() {
  $('body').innerHTML = `<section class="card"><h2>Add stops</h2><p class="sub">Paste one stop name per line. Duplicates are skipped. Renaming a stop never changes its link.</p>
   <textarea id="bulk" rows="4" class="input mt" placeholder="Neermarga&#10;Kalpane&#10;Nanthoor"></textarea>
   <button class="btn btn-p mt" onclick="addStops()">Add stops</button></section>
   <div class="row mt2"><input id="sf" class="input grow" value="${esc(fq)}" oninput="fq=this.value;drawStops()" placeholder="Search stops" title="Filter the stop list">
   <button class="btn btn-s" onclick="qrSheet()" title="Open a printable sheet of every stop's QR code">Print all QR codes</button></div><div id="sl" class="mt"></div>`;
  drawStops();
}
function drawStops() {
  const l = sortedByName(S.stops.filter(s => s.name.toLowerCase().includes(fq.toLowerCase())));
  $('sl').innerHTML = l.length ? `<ul class="list">${l.map(s => `<li class="arow">
    <div class="main"><input class="input" value="${esc(s.name)}" onchange="renameStop('${s.id}',this.value)" aria-label="Stop name"><p class="slug">/s/${esc(s.slug)}</p></div>
    <div class="acts">
      <button class="btn btn-s btn-sm" onclick="showQR('${s.id}')" title="Show this stop's QR code">QR</button>
      <button class="btn btn-s btn-sm" onclick="copyLink('${s.id}',this)" title="Copy this stop's link">Copy link</button>
      <button class="btn btn-d btn-sm" onclick="delStop('${s.id}')" title="Delete this stop">Delete</button>
    </div></li>`).join('')}</ul>` : '<div class="empty"><b>No stops yet</b><p>Paste stop names above to add them.</p></div>';
}
function copyLink(id, b) {
  const s = S.stops.find(x => x.id === id), t = link(s.slug);
  (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).catch(() => prompt('Copy this link:', t));
  b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy link', 1200);
}
async function addStops() {
  const names = $('bulk').value.split('\n').map(x => x.trim()).filter(Boolean)
    .filter(name => !S.stops.some(s => s.name.toLowerCase() === name.toLowerCase()));
  if (!names.length) return;
  const rows = names.map(name => { let slug = slugify(name); while (S.stops.some(s => s.slug === slug)) slug += '-' + uid().slice(0, 3); S.stops.push({ slug, name }); return { slug, name }; });
  const { error } = await supabase.from('stops').insert(rows);
  if (error) return alert('Could not add stops: ' + error.message);
  await loadData(); shell();
}
async function renameStop(id, v) {
  v = v.trim(); if (!v) return drawStops();
  const { error } = await supabase.from('stops').update({ name: v }).eq('id', id);
  if (error) return alert('Could not rename: ' + error.message);
  S.stops.find(s => s.id === id).name = v;
}
async function delStop(id) {
  const used = S.trips.filter(t => t.trip_stops.some(e => e.stop_id === id)).length;
  if (!confirm(`Delete "${stopName(id)}"?` + (used ? ` It is used in ${used} trip(s) and will be removed from them too.` : ''))) return;
  const { error } = await supabase.from('stops').delete().eq('id', id);
  if (error) return alert('Could not delete: ' + error.message);
  await loadData(); shell();
}

// ---- QR
function loadQR() {
  return new Promise(res => { if (window.QRCode) return res(true);
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
}
const noQR = '<p class="sub">QR library could not load. Check your internet connection.</p>';
async function makeQR(el, text, size) { if (!await loadQR()) { el.innerHTML = noQR; return; } new QRCode(el, { text, width: size, height: size, correctLevel: QRCode.CorrectLevel.M }); }
function showQR(id) {
  const s = S.stops.find(x => x.id === id), m = $('modal'); m.classList.add('on');
  m.innerHTML = `<div class="box"><h3>${esc(s.name)}</h3><div id="qrbox" class="qbox"></div>
   <p class="slug" style="white-space:normal;word-break:break-all">${esc(link(s.slug))}</p>
   <div class="row mt" style="justify-content:center"><button class="btn btn-p" onclick="dlQR('${s.slug}')">Download PNG</button><button class="btn btn-s" onclick="$('modal').classList.remove('on')">Close</button></div></div>`;
  makeQR($('qrbox'), link(s.slug), 200);
}
function dlQR(slug) { const c = $('qrbox').querySelector('canvas'); if (!c) return alert('QR is not ready.'); const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = 'qr-' + slug + '.png'; a.click(); }
function qrSheet() {
  const s = $('sheet'); s.classList.add('on');
  s.innerHTML = `<div class="row noprint"><button class="btn btn-p" onclick="print()">Print</button><button class="btn btn-s" onclick="$('sheet').classList.remove('on')">Close</button></div>
   <div class="qgrid">${sortedByName(S.stops).map(x => `<div class="qc"><b>${esc(x.name)}</b><small>Scan for bus timings</small><div class="q" id="q-${x.id}"></div></div>`).join('')}</div>`;
  S.stops.forEach(x => makeQR($('q-' + x.id), link(x.slug), 140));
}

// ====================================================================== BUSES
function busesView() {
  $('body').innerHTML = `<section class="card"><h2>Add bus</h2><div class="row mt">
   <input id="bn" class="input grow" placeholder="Bus name (e.g. Sabari)"><input id="br" class="input grow" placeholder="Registration (e.g. KA 19 D 7354)">
   <button class="btn btn-p" onclick="addBus()">Add bus</button></div></section>
   <ul class="list mt2">${S.buses.map(b => `<li class="arow bus-row">
     <label class="photo-upload" title="Upload a photo of this bus">${b.photo_url ? `<img src="${esc(b.photo_url)}" class="buspic">` : `<span class="buspic placeholder">${esc((b.name || '?')[0])}</span>`}
       <input type="file" accept="image/*" style="display:none" onchange="uploadBusPhoto('${b.id}', this.files[0])"></label>
     <input class="input grow" value="${esc(b.name)}" onchange="editBus('${b.id}','name',this.value)" aria-label="Bus name">
     <input class="input grow" value="${esc(b.reg || '')}" onchange="editBus('${b.id}','reg',this.value)" aria-label="Registration">
     ${b.photo_url ? `<button class="btn btn-s btn-sm" onclick="removeBusPhoto('${b.id}')" title="Remove photo">Remove photo</button>` : ''}
     <button class="btn btn-d btn-sm" onclick="delBus('${b.id}')" title="Delete this bus">Delete</button></li>`).join('') || '<li class="arow sub">No buses yet.</li>'}</ul>`;
}
async function addBus() {
  const name = $('bn').value.trim(); if (!name) return alert('Enter a bus name.');
  const { error } = await supabase.from('buses').insert({ name, reg: $('br').value.trim() });
  if (error) return alert('Could not add bus: ' + error.message);
  await loadData(); shell();
}
async function editBus(id, k, v) {
  if (k === 'name' && !v.trim()) return busesView();
  const { error } = await supabase.from('buses').update({ [k]: v.trim() }).eq('id', id);
  if (error) return alert('Could not save: ' + error.message);
  S.buses.find(b => b.id === id)[k] = v.trim();
}
async function uploadBusPhoto(id, file) {
  if (!file) return;
  const path = `${id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-]/g, '_')}`;
  const { error: upErr } = await supabase.storage.from('bus-photos').upload(path, file, { upsert: true });
  if (upErr) return alert('Upload failed: ' + upErr.message);
  const { data } = supabase.storage.from('bus-photos').getPublicUrl(path);
  const { error } = await supabase.from('buses').update({ photo_url: data.publicUrl }).eq('id', id);
  if (error) return alert('Could not save photo: ' + error.message);
  await loadData(); shell();
}
async function removeBusPhoto(id) {
  const { error } = await supabase.from('buses').update({ photo_url: null }).eq('id', id);
  if (error) return alert('Could not remove photo: ' + error.message);
  await loadData(); shell();
}
async function delBus(id) {
  const n = S.trips.filter(t => t.bus_id === id).length;
  if (!confirm('Delete this bus' + (n ? ` and its ${n} trip(s)` : '') + '?')) return;
  const { error } = await supabase.from('buses').delete().eq('id', id);
  if (error) return alert('Could not delete: ' + error.message);
  await loadData(); shell();
}

// ====================================================================== ROUTES
function newRouteEdit() { routeEdit = { id: null, code: '', name: '', description: '', stopIds: [] }; }
function routesView() {
  if (!routeEdit) newRouteEdit();
  $('body').innerHTML = `<datalist id="rsdl">${S.stops.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>
   <section class="card"><h2>${routeEdit.id ? 'Edit route' : 'New route'}</h2><p class="sub">A route is a named path of stops, in order. Trips (Trips &amp; times tab) can follow a route.</p>
   <div class="row mt"><input id="rCode" class="input" style="max-width:140px" placeholder="Code, e.g. 210" value="${esc(routeEdit.code)}" onchange="routeEdit.code=this.value">
   <input id="rName" class="input grow" placeholder="Name (optional), e.g. BC Road - Neermarga" value="${esc(routeEdit.name)}" onchange="routeEdit.name=this.value"></div>
   <input id="rDesc" class="input mt" style="width:100%" placeholder="Description (optional)" value="${esc(routeEdit.description || '')}" onchange="routeEdit.description=this.value">
   <h3 class="sec-title" style="margin-top:18px">Stops on this route, in order</h3>
   <div class="row mt"><input id="rsAdd" list="rsdl" class="input grow" placeholder="Add a stop by name"><button class="btn btn-s" onclick="addRouteStop()">Add</button></div>
   ${routeEdit.stopIds.length ? `<ul class="list mt">${routeEdit.stopIds.map((id, i) => `<li class="arow"><b>${i + 1}.</b> <span class="grow">${esc(stopName(id))}</span>
     <div class="acts"><button class="btn btn-s btn-sm" ${i === 0 ? 'disabled' : ''} onclick="moveRouteStop(${i},-1)" title="Move up">↑</button><button class="btn btn-s btn-sm" ${i === routeEdit.stopIds.length - 1 ? 'disabled' : ''} onclick="moveRouteStop(${i},1)" title="Move down">↓</button><button class="btn btn-d btn-sm" onclick="removeRouteStop(${i})">Remove</button></div></li>`).join('')}</ul>`
      : '<p class="sub mt">No stops added yet.</p>'}
   <div class="row mt"><button class="btn btn-p" onclick="saveRoute()">${routeEdit.id ? 'Update route' : 'Add route'}</button><button class="btn btn-s" onclick="newRouteEdit();routesView()">Clear</button></div></section>
   <h2 class="sec-title" style="margin-top:26px">All routes</h2>
   <ul class="list">${S.routes.map(r => `<li class="arow"><div class="main"><b>${esc(r.code)}</b> ${esc(r.name || '')}<p class="slug">${r.route_stops.length} stops: ${r.route_stops.map(rs => esc(stopName(rs.stop_id))).join(' → ')}</p></div>
     <div class="acts"><button class="btn btn-s btn-sm" onclick="editRoute('${r.id}')">Edit</button><button class="btn btn-d btn-sm" onclick="delRoute('${r.id}')">Delete</button></div></li>`).join('') || '<li class="arow sub">No routes yet.</li>'}</ul>`;
}
function addRouteStop() {
  const v = $('rsAdd').value.trim(); const s = S.stops.find(s => s.name.toLowerCase() === v.toLowerCase());
  if (!s) return alert('Pick a stop from the list.');
  routeEdit.stopIds.push(s.id); routesView();
}
function moveRouteStop(i, dir) { const j = i + dir; if (j < 0 || j >= routeEdit.stopIds.length) return; [routeEdit.stopIds[i], routeEdit.stopIds[j]] = [routeEdit.stopIds[j], routeEdit.stopIds[i]]; routesView(); }
function removeRouteStop(i) { routeEdit.stopIds.splice(i, 1); routesView(); }
async function saveRoute() {
  if (!routeEdit.code.trim()) return alert('Give the route a code (e.g. 210).');
  if (routeEdit.stopIds.length < 2) return alert('Add at least two stops.');
  let routeId = routeEdit.id;
  if (routeId) {
    const { error } = await supabase.from('routes').update({ code: routeEdit.code.trim(), name: routeEdit.name.trim() || null, description: routeEdit.description.trim() || null }).eq('id', routeId);
    if (error) return alert('Could not save: ' + error.message);
    await supabase.from('route_stops').delete().eq('route_id', routeId);
  } else {
    const { data, error } = await supabase.from('routes').insert({ code: routeEdit.code.trim(), name: routeEdit.name.trim() || null, description: routeEdit.description.trim() || null }).select().single();
    if (error) return alert('Could not save: ' + error.message);
    routeId = data.id;
  }
  const rows = routeEdit.stopIds.map((stop_id, i) => ({ route_id: routeId, stop_id, sequence: i + 1 }));
  const { error: rsErr } = await supabase.from('route_stops').insert(rows);
  if (rsErr) return alert('Could not save stops: ' + rsErr.message);
  newRouteEdit(); await loadData(); shell();
}
function editRoute(id) { const r = S.routes.find(r => r.id === id); routeEdit = { id: r.id, code: r.code, name: r.name || '', description: r.description || '', stopIds: r.route_stops.map(rs => rs.stop_id) }; routesView(); scrollTo({ top: 0, behavior: 'smooth' }); }
async function delRoute(id) {
  if (!confirm('Delete this route? Trips that used it keep their own times but lose the route label.')) return;
  const { error } = await supabase.from('routes').delete().eq('id', id);
  if (error) return alert('Could not delete: ' + error.message);
  if (routeEdit && routeEdit.id === id) newRouteEdit();
  await loadData(); shell();
}

// ====================================================================== TRIPS
function newTripEdit() { tripEdit = { id: null, busId: S.buses[0]?.id || '', routeId: '', rows: [{ name: '', time: '' }, { name: '', time: '' }] }; }
function tripsView() {
  if (!tripEdit) newTripEdit();
  $('body').innerHTML = `<datalist id="sdl">${S.stops.map(s => `<option value="${esc(s.name)}">`).join('')}</datalist>
   <section class="card"><h2>${tripEdit.id ? 'Edit trip' : 'New trip'}</h2><p class="sub">A trip is one run of a bus. List each stop in order with the time the bus arrives there.</p>
   <div class="row mt">
     <select class="input grow" onchange="tripEdit.busId=this.value">${S.buses.map(b => `<option value="${b.id}" ${b.id === tripEdit.busId ? 'selected' : ''}>${esc(busLabel(b))}</option>`).join('') || '<option value="">Add a bus first</option>'}</select>
     <select class="input grow" onchange="applyRoute(this.value)"><option value="">No route (manual stops)</option>${S.routes.map(r => `<option value="${r.id}" ${r.id === tripEdit.routeId ? 'selected' : ''}>${esc(r.code)} ${esc(r.name || '')}</option>`).join('')}</select>
   </div>
   ${tripEdit.rows.map((r, i) => `<div class="tr"><span class="n">${i + 1}</span>
     <input list="sdl" class="input" value="${esc(r.name)}" onchange="tripEdit.rows[${i}].name=this.value" placeholder="Stop name">
     <input type="time" class="input" value="${r.time}" onchange="tripEdit.rows[${i}].time=this.value">
     <button class="btn btn-d x" aria-label="Remove row" title="Remove this stop" onclick="tripEdit.rows.splice(${i},1);tripsView()">✕</button></div>`).join('')}
   <div class="row mt"><button class="btn btn-s" onclick="tripEdit.rows.push({name:'',time:''});tripsView()">Add stop row</button><button class="btn btn-p" onclick="saveTrip()">${tripEdit.id ? 'Update trip' : 'Add trip'}</button><button class="btn btn-s" onclick="newTripEdit();tripsView()">Clear</button></div>
   <details class="mt2"><summary>Paste many rows at once</summary><textarea id="paste" rows="5" class="input mt" placeholder="One per line: stop name, time&#10;Statbank, 07:40&#10;Nanthoor, 08:00&#10;Neermarga, 08:20"></textarea><button class="btn btn-s mt" onclick="fillRows()">Fill rows from text</button></details></section>
   <h2 class="sec-title" style="margin-top:26px">All trips</h2>${tripList()}`;
}
function applyRoute(routeId) {
  tripEdit.routeId = routeId;
  const r = S.routes.find(r => r.id === routeId);
  if (r) tripEdit.rows = r.route_stops.map(rs => ({ name: stopName(rs.stop_id), time: '' }));
  tripsView();
}
function fillRows() {
  const rows = $('paste').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const i = l.lastIndexOf(','); return { name: l.slice(0, i).trim(), time: l.slice(i + 1).trim().replace(/^(\d):/, '0$1:') };
  });
  if (rows.length) tripEdit.rows = rows;
  tripsView();
}
async function saveTrip() {
  const rows = tripEdit.rows.filter(r => r.name.trim() || r.time);
  if (!tripEdit.busId) return alert('Add a bus first (Buses tab).');
  if (rows.length < 2) return alert('A trip needs at least two stops.');
  const out = [], bad = [];
  rows.forEach((r, i) => {
    const s = S.stops.find(s => s.name.toLowerCase() === r.name.trim().toLowerCase());
    if (!s) bad.push(`Row ${i + 1}: stop "${r.name}" not found`);
    else if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)) bad.push(`Row ${i + 1}: time missing or invalid`);
    else out.push({ stop_id: s.id, time: r.time });
  });
  if (bad.length) return alert(bad.join('\n') + '\n\nAdd missing stops in the Stops tab first.');
  for (let i = 1; i < out.length; i++) if (out[i].time < out[i - 1].time) return alert(`Times must increase along the trip (row ${i + 1} is earlier than row ${i}).`);

  let tripId = tripEdit.id;
  if (tripId) {
    const { error } = await supabase.from('trips').update({ bus_id: tripEdit.busId, route_id: tripEdit.routeId || null }).eq('id', tripId);
    if (error) return alert('Could not save: ' + error.message);
    await supabase.from('trip_stops').delete().eq('trip_id', tripId);
  } else {
    const { data, error } = await supabase.from('trips').insert({ bus_id: tripEdit.busId, route_id: tripEdit.routeId || null }).select().single();
    if (error) return alert('Could not save: ' + error.message);
    tripId = data.id;
  }
  const rowsToInsert = out.map((e, i) => ({ trip_id: tripId, stop_id: e.stop_id, sequence: i + 1, time: e.time }));
  const { error: tsErr } = await supabase.from('trip_stops').insert(rowsToInsert);
  if (tsErr) return alert('Could not save stop times: ' + tsErr.message);
  newTripEdit(); await loadData(); shell();
}
function tripList() {
  return S.buses.map(b => {
    const ts = S.trips.filter(t => t.bus_id === b.id).sort((x, y) => (x.trip_stops[0]?.time || '').localeCompare(y.trip_stops[0]?.time || ''));
    return `<h3 class="sec-title">${esc(busLabel(b))} · ${ts.length} trips</h3><ul class="list">${ts.map(t => {
      const f = t.trip_stops[0], l = t.trip_stops[t.trip_stops.length - 1], r = S.routes.find(r => r.id === t.route_id);
      return `<li class="arow"><div class="main" style="font-size:15px">${r ? `<span class="tag route">Route ${esc(r.code)}</span> ` : ''}<b>${esc(stopName(f.stop_id))}</b> ${f.time} → <b>${esc(stopName(l.stop_id))}</b> ${l.time}<p class="slug">${t.trip_stops.length} stops</p></div>
       <div class="acts"><button class="btn btn-s btn-sm" onclick="editTrip('${t.id}',false)">Edit</button><button class="btn btn-s btn-sm" onclick="editTrip('${t.id}',true)">Duplicate</button><button class="btn btn-d btn-sm" onclick="delTrip('${t.id}')">Delete</button></div></li>`;
    }).join('') || '<li class="arow sub">No trips for this bus.</li>'}</ul>`;
  }).join('');
}
function editTrip(id, dup) {
  const t = S.trips.find(t => t.id === id);
  tripEdit = { id: dup ? null : id, busId: t.bus_id, routeId: t.route_id || '', rows: t.trip_stops.map(e => ({ name: stopName(e.stop_id), time: e.time.slice(0, 5) })) };
  tripsView(); scrollTo({ top: 0, behavior: 'smooth' });
}
async function delTrip(id) {
  if (!confirm('Delete this trip?')) return;
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) return alert('Could not delete: ' + error.message);
  if (tripEdit && tripEdit.id === id) newTripEdit();
  await loadData(); shell();
}

// ====================================================================== ANNOUNCEMENTS
let annList = [], annDraft = { message: '', display_type: 'banner' };
async function announcementsView() {
  const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false });
  annList = data || [];
  $('body').innerHTML = `<section class="card"><h2>New announcement</h2>
   <textarea id="annMsg" rows="2" class="input mt" style="width:100%" placeholder="e.g. Extra bus added on Route 210 from 5 PM today">${esc(annDraft.message)}</textarea>
   <div class="row mt"><label class="sub"><input type="radio" name="annType" value="banner" ${annDraft.display_type === 'banner' ? 'checked' : ''} onchange="annDraft.display_type='banner'"> Header banner</label>
   <label class="sub"><input type="radio" name="annType" value="popup" ${annDraft.display_type === 'popup' ? 'checked' : ''} onchange="annDraft.display_type='popup'"> Popup</label></div>
   <button class="btn btn-p mt" onclick="addAnnouncement()">Publish</button></section>
   <h2 class="sec-title" style="margin-top:26px">All announcements</h2>
   <ul class="list">${annList.map(a => `<li class="arow"><div class="main"><b>${a.active ? '🟢 Active' : '⚪ Off'}</b> <span class="tag">${a.display_type}</span><p style="margin-top:4px">${esc(a.message)}</p></div>
     <div class="acts">
       <button class="btn btn-s btn-sm" onclick="toggleAnnType('${a.id}','${a.display_type === 'banner' ? 'popup' : 'banner'}')" title="Switch between banner and popup">Make ${a.display_type === 'banner' ? 'popup' : 'banner'}</button>
       <button class="btn btn-s btn-sm" onclick="toggleAnnActive('${a.id}',${!a.active})">${a.active ? 'Turn off' : 'Turn on'}</button>
       <button class="btn btn-d btn-sm" onclick="delAnnouncement('${a.id}')">Delete</button>
     </div></li>`).join('') || '<li class="arow sub">No announcements yet.</li>'}</ul>`;
}
async function addAnnouncement() {
  const message = $('annMsg').value.trim();
  if (!message) return alert('Write a message first.');
  const { error } = await supabase.from('announcements').insert({ message, display_type: annDraft.display_type, active: true });
  if (error) return alert('Could not publish: ' + error.message);
  annDraft = { message: '', display_type: 'banner' };
  announcementsView();
}
async function toggleAnnActive(id, active) { await supabase.from('announcements').update({ active }).eq('id', id); announcementsView(); }
async function toggleAnnType(id, display_type) { await supabase.from('announcements').update({ display_type }).eq('id', id); announcementsView(); }
async function delAnnouncement(id) { if (!confirm('Delete this announcement?')) return; await supabase.from('announcements').delete().eq('id', id); announcementsView(); }

// ====================================================================== ANALYTICS
let analyticsRange = 7;
async function analyticsView() {
  $('body').innerHTML = `<div class="seg" role="group" aria-label="Date range">${[1, 7, 30, 0].map(d => `<button class="${analyticsRange === d ? 'on' : ''}" onclick="analyticsRange=${d};analyticsView()">${d === 0 ? 'All time' : d === 1 ? 'Today' : 'Last ' + d + ' days'}</button>`).join('')}</div><div id="analyticsBody" class="mt2"><p class="sub">Loading…</p></div>`;
  const since = analyticsRange ? new Date(Date.now() - analyticsRange * 86400000).toISOString() : null;
  let q = supabase.from('analytics_events').select('event_type, stop_id, from_stop_id, to_stop_id, created_at');
  if (since) q = q.gte('created_at', since);
  const { data, error } = await q;
  const box = $('analyticsBody');
  if (error) { box.innerHTML = `<p class="err">Could not load analytics: ${esc(error.message)}</p>`; return; }
  const events = data || [];
  const views = events.filter(e => e.event_type === 'view');
  const scans = events.filter(e => e.event_type === 'qr_scan');
  const searches = events.filter(e => e.event_type === 'search');
  const count = (list, key) => { const m = {}; list.forEach(e => { if (e[key]) m[e[key]] = (m[e[key]] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const topStopViews = count(views, 'stop_id').slice(0, 10);
  const topQr = count(scans, 'stop_id').slice(0, 10);
  const pairs = {}; searches.forEach(e => { if (e.from_stop_id && e.to_stop_id) { const k = e.from_stop_id + '>' + e.to_stop_id; pairs[k] = (pairs[k] || 0) + 1; } });
  const topPairs = Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // Daily bar chart of total views
  const days = Math.max(analyticsRange || 30, 1);
  const buckets = {};
  for (let i = 0; i < days; i++) { const d = new Date(Date.now() - i * 86400000); buckets[d.toISOString().slice(0, 10)] = 0; }
  views.forEach(e => { const k = e.created_at.slice(0, 10); if (k in buckets) buckets[k]++; });
  const ordered = Object.entries(buckets).reverse();
  const max = Math.max(1, ...ordered.map(([, v]) => v));

  box.innerHTML = `
  <div class="stat-grid">
    <div class="stat"><b>${views.length}</b><span>Page views</span></div>
    <div class="stat"><b>${scans.length}</b><span>QR scans</span></div>
    <div class="stat"><b>${searches.length}</b><span>From → To searches</span></div>
  </div>
  <h3 class="sec-title">Views per day</h3>
  <div class="bars">${ordered.map(([d, v]) => `<div class="bar-col" title="${d}: ${v} view${v === 1 ? '' : 's'}"><div class="bar" style="height:${Math.max(4, v / max * 100)}%"></div><small>${d.slice(5)}</small></div>`).join('')}</div>
  <div class="row mt2" style="align-items:flex-start;gap:24px;flex-wrap:wrap">
    <div style="flex:1;min-width:220px"><h3 class="sec-title">Most viewed stops</h3>${topStopViews.length ? `<ol class="rank">${topStopViews.map(([id, n]) => `<li><span>${esc(stopName(id))}</span><b>${n}</b></li>`).join('')}</ol>` : '<p class="sub">No data yet.</p>'}</div>
    <div style="flex:1;min-width:220px"><h3 class="sec-title">Most QR-scanned stops</h3>${topQr.length ? `<ol class="rank">${topQr.map(([id, n]) => `<li><span>${esc(stopName(id))}</span><b>${n}</b></li>`).join('')}</ol>` : '<p class="sub">No data yet.</p>'}</div>
    <div style="flex:1;min-width:220px"><h3 class="sec-title">Top From → To searches</h3>${topPairs.length ? `<ol class="rank">${topPairs.map(([k, n]) => { const [f, t] = k.split('>'); return `<li><span>${esc(stopName(f))} → ${esc(stopName(t))}</span><b>${n}</b></li>`; }).join('')}</ol>` : '<p class="sub">No data yet.</p>'}</div>
  </div>`;
}

init();
