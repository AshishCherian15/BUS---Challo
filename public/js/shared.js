// Shared across index.html and admin.html.
// window.ENV is injected by the server at /env.js (see server.js).
const supabase = window.supabase.createClient(window.ENV.SUPABASE_URL, window.ENV.SUPABASE_ANON_KEY);

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 9);
const slugify = n => n.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || uid();

const toMins = hms => { const [h, m] = hms.split(':'); return (+h) * 60 + (+m); };
const nowMinsIST = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  return (+parts.find(p => p.type === 'hour').value % 24) * 60 + (+parts.find(p => p.type === 'minute').value);
};
const fmtClock = mins => {
  const h = Math.floor(mins / 60) % 24;
  return [`${h % 12 || 12}:${String(mins % 60).padStart(2, '0')}`, h < 12 ? 'AM' : 'PM'];
};
const fmtEta = diff => diff <= 0 ? 'Arriving now' : diff < 60 ? `in ${diff} min` : `in ${Math.floor(diff / 60)} h${diff % 60 ? ' ' + (diff % 60) + ' min' : ''}`;
const fmtWindow = w => w < 60 ? w + ' min' : (w / 60) + (w === 60 ? ' hour' : ' hours');

// Fire-and-forget analytics logging — never blocks or breaks the UI if it fails.
function logEvent(eventType, fields = {}) {
  supabase.from('analytics_events').insert({ event_type: eventType, ...fields }).then(() => {}, () => {});
}
