// =========================================================
// WEDDING HQ — admin dashboard logic
// All data comes from authenticated /admin/* backend endpoints;
// nothing sensitive is baked into this file.
// =========================================================

const API = 'https://api.caramucci.com';
const KEY_STORE = 'weddingAdminKey';

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

let GUESTS = [];        // deduped RSVP rows from the backend
let LOADOUTS = [];
let MISSIONS = [];
let missionsDirty = false;
let seatingTables = []; // [{table, capacity, guests:[]}]
let checklistItems = [];
let selectedGuests = new Set(); // seating: multi-select of unseated guests

// Soft pastel per RSVP party so families stay visually grouped.
const PARTY_COLORS = ['#FDBCC9', '#FFCBA4', '#BCCDB3', '#D8C3E5', '#FCEEA7',
                      '#9fd0da', '#f0b8a0', '#c8d8f0', '#e8c8b0', '#b8d8c8'];

// ---------- tiny helpers ----------
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2600);
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function yes(v) { return /^(y|true|1)/i.test(String(v || '')); }

function api(path, opts = {}) {
  opts.headers = Object.assign({ 'X-Admin-Key': sessionStorage.getItem(KEY_STORE) || '' },
    opts.body ? { 'Content-Type': 'application/json' } : {}, opts.headers || {});
  return fetch(API + path, opts).then(async r => {
    if (r.status === 401) { logout(); throw new Error('unauthorized'); }
    const d = await r.json();
    if (!r.ok || d.status !== 'success') throw new Error(d.message || 'Request failed');
    return d;
  });
}

// ---------- auth ----------
function logout() {
  sessionStorage.removeItem(KEY_STORE);
  $('#app').classList.add('hidden');
  $('#gate').classList.remove('hidden');
}

$('#gateForm').addEventListener('submit', e => {
  e.preventDefault();
  const pw = $('#gateKey').value;
  $('#gateError').textContent = '';
  fetch(API + '/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  }).then(async r => {
    const d = await r.json().catch(() => ({}));
    if (r.ok && d.status === 'success') {
      sessionStorage.setItem(KEY_STORE, pw);
      enterApp();
    } else {
      $('#gateError').textContent = d.message || 'Wrong password.';
    }
  }).catch(() => { $('#gateError').textContent = 'HQ unreachable — try again.'; });
});

$('#logoutBtn').addEventListener('click', logout);

function enterApp() {
  $('#gate').classList.add('hidden');
  $('#app').classList.remove('hidden');
  loadDashboard();
  loadGuests();
}

// Auto-login if this session already has a valid key.
if (sessionStorage.getItem(KEY_STORE)) {
  api('/admin/overview').then(d => { enterApp._pre = d; enterApp(); renderDashboard(d); })
    .catch(() => sessionStorage.removeItem(KEY_STORE));
}

// ---------- tabs (lazy-load each pane's data on first visit) ----------
const loadedTabs = {};
const TAB_LOADERS = {
  groomsmen: loadGroomsmen,
  donations: loadDonations,
  playlist: loadPlaylist,
  checklist: loadChecklist,
  seating: loadSeating,
};

$('#tabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  $$('.tab').forEach(t => t.classList.toggle('active', t === btn));
  const name = btn.dataset.tab;
  $$('.pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + name));
  if (TAB_LOADERS[name] && !loadedTabs[name]) {
    loadedTabs[name] = true;
    TAB_LOADERS[name]();
  }
});

// Visible failure banner with retry — silent empty panes are worse than errors.
function errorBanner(el, msg, retryFn) {
  el.innerHTML = `<div class="card" style="border-color:var(--red);grid-column:1/-1;">
    <p style="color:var(--red);font-weight:600;">⚠ ${esc(msg)}</p>
    <p class="muted" style="margin:6px 0 10px;">Check your connection and try again.</p>
    <button class="btn" id="retry-${el.id}">↻ Retry</button></div>`;
  const b = document.getElementById('retry-' + el.id);
  if (b) b.onclick = retryFn;
}

// ---------- dashboard ----------
function loadDashboard() {
  if (enterApp._pre) { renderDashboard(enterApp._pre); enterApp._pre = null; return; }
  api('/admin/overview').then(renderDashboard)
    .catch(e => errorBanner($('#statGrid'), 'Couldn\'t load the dashboard: ' + e.message, loadDashboard));
}

function renderDashboard(d) {
  $('#statGrid').innerHTML = [
    ['🎉', d.parties, 'Parties RSVP\'d'],
    ['👥', d.totalHeadcount, 'Total headcount'],
    ['🍸', d.adults, 'Adults 21+'],
    ['🧃', d.youngAdults, 'Ages 12–20'],
    ['🧒', d.children, 'Under 11'],
    ['💰', '$' + Number(d.fundTotal || 0).toLocaleString(), 'Honeymoon fund'],
  ].map(([i, n, l]) => `<div class="stat"><div class="num">${i} ${esc(n)}</div><div class="lbl">${l}</div></div>`).join('');

  $('#dashSquad').innerHTML = (d.squad || []).map(m =>
    `<div class="squad-row"><span><b>${esc(m.name)}</b><span class="role">${esc(m.role)}</span></span>
     <span class="status-badge ${m.status === 'RECRUITED' ? 'ok' : 'wait'}">${esc(m.status)}</span></div>`).join('');

  $('#dashRecent').innerHTML = (d.recent && d.recent.length)
    ? d.recent.map(r => `<li><span>${esc(r.name)} <span class="muted">(${esc(r.headcount)} heads)</span></span><span class="when">${esc(String(r.when).slice(0, 16))}</span></li>`).join('')
    : '<li class="muted">No RSVPs yet.</li>';

  if (d.sheetUrl) {
    const a = $('#sheetLink');
    a.href = d.sheetUrl;
    a.style.display = '';
  }
}

// ---------- guests ----------
let guestFilter = 'all';

function loadGuests() {
  api('/admin/guests').then(d => {
    GUESTS = d.guests || [];
    renderGuests();
    renderRecipients();
    renderSmsTools();
    if (loadedTabs.seating) renderSeating(); // refresh the pool if it's open
  }).catch(e => {
    errorBanner($('#unseated'), 'Couldn\'t load the guest list: ' + e.message, loadGuests);
    $('#guestTable tbody').innerHTML =
      `<tr><td colspan="7" style="color:var(--red);">⚠ ${esc(e.message)} — <a href="#" onclick="loadGuests();return false;">retry</a></td></tr>`;
  });
}

function guestMatches(g, q) {
  if (guestFilter === 'plusone' && !yes(g['Has Plus One'])) return false;
  if (guestFilter === 'kids' && !yes(g['Has Children'])) return false;
  if (guestFilter === 'notes' && !String(g['Additional Notes'] || '').trim()) return false;
  if (!q) return true;
  return ['First Name', 'Last Name', 'Email', 'Phone', 'Plus One Name', 'Children List']
    .some(k => String(g[k] || '').toLowerCase().includes(q));
}

function headsOf(g) {
  return (+g['Total Adults (21+)'] || 0) + (+g['Total Young Adults (12-20)'] || 0) + (+g['Total Children (Under 11)'] || 0);
}

function renderGuests() {
  const q = $('#guestSearch').value.trim().toLowerCase();
  const rows = GUESTS.filter(g => guestMatches(g, q));
  $('#guestTable tbody').innerHTML = rows.map((g, i) => `
    <tr data-i="${GUESTS.indexOf(g)}">
      <td><b>${esc(g['First Name'])} ${esc(g['Last Name'])}</b></td>
      <td>${esc(g['Email'])}</td>
      <td>${esc(g['Phone'])}</td>
      <td>${headsOf(g)}</td>
      <td>${yes(g['Has Plus One']) ? '💑 ' + esc(g['Plus One Name'] || 'Yes') : '—'}</td>
      <td>${yes(g['Has Children']) ? '🧒 ' + esc(g['Children Count'] || '') : '—'}</td>
      <td><button class="btn btn-ghost" data-expand="${GUESTS.indexOf(g)}">▾</button></td>
    </tr>`).join('') || '<tr><td colspan="7" class="muted">No matches.</td></tr>';
}

$('#guestSearch').addEventListener('input', renderGuests);
$('#pane-guests .chip-row').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  $$('#pane-guests .chip').forEach(x => x.classList.toggle('active', x === c));
  guestFilter = c.dataset.filter;
  renderGuests();
});

$('#guestTable').addEventListener('click', e => {
  const btn = e.target.closest('[data-expand]');
  if (!btn) return;
  const tr = btn.closest('tr');
  const existing = tr.nextElementSibling;
  if (existing && existing.classList.contains('detail-row')) { existing.remove(); return; }
  const g = GUESTS[+btn.dataset.expand];
  const detail = document.createElement('tr');
  detail.className = 'detail-row';
  detail.innerHTML = `<td colspan="7">
    📮 <b>Address:</b> ${esc(g['Mailing Address'] || '—')}<br>
    ${yes(g['Has Plus One']) ? `💑 <b>Plus one:</b> ${esc(g['Plus One Name'])} · ${esc(g['Plus One Phone'] || '')} · ${esc(g['Plus One Email'] || '')}<br>` : ''}
    ${yes(g['Has Children']) ? `🧒 <b>Kids:</b> ${esc(g['Children List'] || g['Children Count'])}<br>` : ''}
    ${String(g['Additional Guests'] || '').trim() ? `➕ <b>Additional guests:</b> ${esc(g['Additional Guests'])}<br>` : ''}
    ${String(g['Additional Notes'] || '').trim() ? `📝 <b>Notes:</b> ${esc(g['Additional Notes'])}<br>` : ''}
    🎟 <b>Tier:</b> ${esc(g['Tier'] || '—')} · <b>Submitted:</b> ${esc(String(g['Timestamp']).slice(0, 16))}
  </td>`;
  tr.after(detail);
});

$('#csvBtn').addEventListener('click', () => {
  if (!GUESTS.length) { toast('No guests yet.'); return; }
  const headers = Object.keys(GUESTS[0]);
  const lines = [headers.join(',')].concat(GUESTS.map(g =>
    headers.map(h => '"' + String(g[h] ?? '').replace(/"/g, '""') + '"').join(',')));
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'wedding-guests.csv';
  a.click();
  toast('CSV downloaded 📥');
});

// ---------- contact: email ----------
const TEMPLATES = {
  reminder: {
    subject: 'Don’t forget to RSVP! — Sal & Lauren, April 24, 2027',
    body: 'Hi friends!\n\nJust a friendly nudge — RSVPs for our wedding are due by January 15th, 2027. It only takes a minute at caramucci.com.\n\nWe can’t wait to celebrate with you on the beach!\n\nLove,\nSal & Lauren',
  },
  hotel: {
    subject: 'Where to stay — Sal & Lauren’s wedding',
    body: 'Hi everyone!\n\nA quick note on hotels: the ceremony and reception are at the Hyatt Regency Clearwater Beach Resort & Spa. Details for room options are on caramucci.com under Travel.\n\nBook early — April is high season in Clearwater!\n\nLove,\nSal & Lauren',
  },
  weekof: {
    subject: 'One week away! Final details 🎉',
    body: 'Hi everyone!\n\nWe’re ONE WEEK out! A few final details:\n\n• Ceremony starts at [TIME] — please arrive 30 minutes early\n• Dress code: beach formal\n• Parking/shuttle: [DETAILS]\n\nSee you at the beach!\n\nLove,\nSal & Lauren',
  },
};

$('#emailTemplates').addEventListener('click', e => {
  const c = e.target.closest('.chip');
  if (!c) return;
  const t = TEMPLATES[c.dataset.tpl];
  $('#emailSubject').value = t.subject;
  $('#emailBody').value = t.body;
});

function renderRecipients() {
  const withEmail = GUESTS.filter(g => String(g['Email'] || '').includes('@'));
  $('#recipList').innerHTML = withEmail.map((g, i) => `
    <label><input type="checkbox" checked data-email="${esc(g['Email'])}">
      <span>${esc(g['First Name'])} ${esc(g['Last Name'])} <span class="sub">${esc(g['Email'])}</span></span>
    </label>`).join('') || '<p class="muted">No guest emails yet.</p>';
  updateRecipCount();
}

function updateRecipCount() {
  const n = $$('#recipList input:checked').length;
  $('#recipCount').textContent = n + ' recipient' + (n === 1 ? '' : 's') + ' selected';
}

$('#recipList').addEventListener('change', updateRecipCount);
$('#recipAll').addEventListener('click', () => { $$('#recipList input').forEach(c => c.checked = true); updateRecipCount(); });
$('#recipNone').addEventListener('click', () => { $$('#recipList input').forEach(c => c.checked = false); updateRecipCount(); });

// "Test to me" — same subject/body, delivered only to the host inbox.
$('#testEmailBtn').addEventListener('click', () => {
  const subject = $('#emailSubject').value.trim();
  const message = $('#emailBody').value.trim();
  if (!subject || !message) { toast('Add a subject and a message first.'); return; }
  $('#emailStatus').textContent = 'Sending test…';
  api('/admin/email', { method: 'POST', body: JSON.stringify({ subject, message, test: true }) })
    .then(() => { $('#emailStatus').textContent = '✔ Test sent to your inbox — check how it looks!'; toast('Test email sent 🧪'); })
    .catch(e => { $('#emailStatus').textContent = '✖ ' + e.message; });
});

$('#sendEmailBtn').addEventListener('click', () => {
  const subject = $('#emailSubject').value.trim();
  const message = $('#emailBody').value.trim();
  const emails = $$('#recipList input:checked').map(c => c.dataset.email);
  if (!subject || !message) { toast('Add a subject and a message first.'); return; }
  if (!emails.length) { toast('Pick at least one recipient.'); return; }
  if (!confirm(`Send "${subject}" to ${emails.length} guest${emails.length > 1 ? 's' : ''}?`)) return;
  const btn = $('#sendEmailBtn');
  btn.disabled = true;
  $('#emailStatus').textContent = 'Sending…';
  api('/admin/email', { method: 'POST', body: JSON.stringify({ subject, message, emails }) })
    .then(d => { $('#emailStatus').textContent = `✔ Queued to ${d.queued} inboxes — they'll trickle out over the next minute.`; toast('Email blast sent 💌'); })
    .catch(e => { $('#emailStatus').textContent = '✖ ' + e.message; })
    .finally(() => { btn.disabled = false; });
});

// ---------- contact: sms ----------
function allNumbers() {
  const nums = [];
  GUESTS.forEach(g => {
    if (String(g['Phone'] || '').trim()) nums.push(String(g['Phone']).trim());
    if (yes(g['Has Plus One']) && String(g['Plus One Phone'] || '').trim()) nums.push(String(g['Plus One Phone']).trim());
  });
  return [...new Set(nums)];
}

function renderSmsTools() {
  const nums = allNumbers();
  $('#groupSmsLink').href = 'sms:' + nums.join(',');
  $('#copyNumbersBtn').onclick = () => {
    navigator.clipboard.writeText(nums.join(', '))
      .then(() => toast(`Copied ${nums.length} numbers 📋`))
      .catch(() => toast('Copy failed — long-press to select instead.'));
  };
}

// ---------- seating ----------
let partyOf = {};     // guest name -> party index (for chip colors)
let partyLabels = {}; // party index -> display label ("The Pond Party")

function seatingParties() {
  // One entry per RSVP party: everyone who RSVP'd together stays lumped
  // together — primary guest, plus-one, and each child.
  partyOf = {};
  partyLabels = {};
  const parties = [];
  GUESTS.forEach((g, pi) => {
    const members = [];
    const push = n => {
      const name = String(n || '').trim();
      if (name && !(name in partyOf)) { partyOf[name] = pi; members.push(name); }
    };
    push(`${g['First Name'] || ''} ${g['Last Name'] || ''}`.trim());
    if (yes(g['Has Plus One'])) push(g['Plus One Name']);
    String(g['Children List'] || '').split(/[,;|]/).forEach(push);
    if (members.length) {
      const last = String(g['Last Name'] || '').trim();
      const label = members.length > 1
        ? (last ? `${last} Party` : `${members[0]} Party`)
        : members[0];
      partyLabels[pi] = label;
      parties.push({ idx: pi, label, members });
    }
  });
  return parties;
}

function seatingUnits() {
  return seatingParties().flatMap(p => p.members);
}

function chipHtml(name, extra = '') {
  const color = PARTY_COLORS[(partyOf[name] ?? 0) % PARTY_COLORS.length];
  return `<span class="gchip${extra ? ' ' + extra : ''}" data-name="${esc(name)}" style="--pc:${color}">${esc(name)}</span>`;
}

// "Amy, Rory & Mia" — how families read on the printed cards.
function joinNames(names) {
  if (names.length <= 1) return names.join('');
  return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
}

function loadSeating() {
  api('/admin/seating').then(d => {
    seatingTables = d.tables || [];
    if (!seatingTables.length) {
      seatingTables = [{ table: 'Table 1', capacity: 8, guests: [] }, { table: 'Table 2', capacity: 8, guests: [] }];
    }
    renderSeating();
  }).catch(e => {
    // Saved chart unavailable — still let Sal plan with fresh tables.
    toast('Saved seating unavailable: ' + e.message);
    seatingTables = [{ table: 'Table 1', capacity: 8, guests: [] }, { table: 'Table 2', capacity: 8, guests: [] }];
    renderSeating();
  });
}

function renderSeating() {
  const parties = seatingParties();
  const units = parties.flatMap(p => p.members);
  const seated = new Set(seatingTables.flatMap(t => t.guests));
  const pool = units.filter(n => !seated.has(n));
  selectedGuests = new Set([...selectedGuests].filter(n => pool.includes(n)));

  // Pool grouped by RSVP party: tap the label to grab the whole family,
  // or tap individual chips as before.
  $('#unseated').innerHTML = parties.map(p => {
    const open = p.members.filter(n => !seated.has(n));
    if (!open.length) return '';
    const color = PARTY_COLORS[p.idx % PARTY_COLORS.length];
    const allSelected = open.every(n => selectedGuests.has(n));
    return `<div class="party-group${allSelected ? ' all-sel' : ''}" style="--pc:${color}">
      <button class="party-label" type="button" data-party="${p.idx}"
        title="Select the whole party">${esc(p.label)}${open.length > 1 ? ' ·' + open.length : ''}</button>
      ${open.map(n => chipHtml(n, selectedGuests.has(n) ? 'selected' : '')).join('')}
    </div>`;
  }).join('') || '<span class="muted">Everyone is seated 🎉</span>';

  $('#tablesGrid').innerHTML = seatingTables.map((t, i) => `
    <div class="tbl-card${t.guests.length > t.capacity ? ' over' : ''}" data-t="${i}">
      <div class="tbl-head">
        <input class="tbl-name" value="${esc(t.table)}" data-rename="${i}" maxlength="30">
        <span class="tbl-cap"><b class="${t.guests.length > t.capacity ? 'overcap' : ''}">${t.guests.length}</b>/<input type="number" min="1" max="20" value="${t.capacity}" data-cap="${i}"></span>
        <button class="tbl-del" data-del="${i}" title="Remove table">✕</button>
      </div>
      <div class="tbl-guests">${t.guests.map(g => {
        const color = PARTY_COLORS[(partyOf[g] ?? 0) % PARTY_COLORS.length];
        return `<span class="gchip" data-unseat="${esc(g)}" style="--pc:${color}">${esc(g)}<span class="x">✕</span></span>`;
      }).join('') || '<span class="muted">Tap to seat selected guests</span>'}</div>
    </div>`).join('');

  const total = units.length;
  $('#seatCounter').textContent = `Seated ${seated.size}/${total}`;
}

// Tap one or several guests, then tap a table to seat them all at once.
// Tapping a party label toggles the entire family in one go.
$('#unseated').addEventListener('click', e => {
  const label = e.target.closest('.party-label');
  if (label) {
    const pi = +label.dataset.party;
    const seated = new Set(seatingTables.flatMap(t => t.guests));
    const open = seatingParties().find(p => p.idx === pi).members.filter(n => !seated.has(n));
    const allSelected = open.every(n => selectedGuests.has(n));
    open.forEach(n => allSelected ? selectedGuests.delete(n) : selectedGuests.add(n));
    renderSeating();
    return;
  }
  const chip = e.target.closest('.gchip');
  if (!chip) return;
  const name = chip.dataset.name;
  if (selectedGuests.has(name)) selectedGuests.delete(name);
  else selectedGuests.add(name);
  renderSeating();
});

$('#tablesGrid').addEventListener('click', e => {
  const unseat = e.target.closest('[data-unseat]');
  if (unseat) {
    const name = unseat.dataset.unseat;
    seatingTables.forEach(t => { t.guests = t.guests.filter(g => g !== name); });
    renderSeating();
    return;
  }
  const del = e.target.closest('[data-del]');
  if (del) {
    const t = seatingTables[+del.dataset.del];
    if (t.guests.length && !confirm(`Remove ${t.table}? Its ${t.guests.length} guests return to the pool.`)) return;
    seatingTables.splice(+del.dataset.del, 1);
    renderSeating();
    return;
  }
  const card = e.target.closest('.tbl-card');
  if (card && selectedGuests.size) {
    seatingTables[+card.dataset.t].guests.push(...selectedGuests);
    selectedGuests.clear();
    renderSeating();
  }
});

// Excel-friendly CSV of the whole chart (Party column keeps families visible)
$('#seatCsvBtn').addEventListener('click', () => {
  seatingParties(); // refresh partyOf/partyLabels
  const lines = ['Table,Capacity,Seat,Guest,Party'];
  seatingTables.forEach(t => {
    if (!t.guests.length) lines.push(`"${t.table.replace(/"/g, '""')}",${t.capacity},,,`);
    t.guests.forEach((g, i) =>
      lines.push(`"${t.table.replace(/"/g, '""')}",${t.capacity},${i + 1},"${g.replace(/"/g, '""')}","${String(partyLabels[partyOf[g]] || '').replace(/"/g, '""')}"`));
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = 'seating-chart.csv';
  a.click();
  toast('Seating chart downloaded — opens right in Excel 📥');
});

// Guests grouped by RSVP party — families share a line on everything printed.
function partyLines(t) {
  const groups = [];
  const byParty = new Map();
  t.guests.forEach(g => {
    const pi = partyOf[g] ?? '__' + g;
    if (!byParty.has(pi)) { byParty.set(pi, []); groups.push(byParty.get(pi)); }
    byParty.get(pi).push(g);
  });
  return groups.map(g =>
    esc(joinNames(g)).replace(/ &amp; /g, ' <span class="pc-amp">&amp;</span> '));
}

// PDF export: page 1 is a poster-ready "Find Your Seat" sign showing every
// table (blow it up for the entrance); then one keepsake card per table.
$('#printPdfBtn').addEventListener('click', () => {
  if (!seatingTables.some(t => t.guests.length)) { toast('Seat some guests first!'); return; }
  seatingParties(); // refresh partyOf for grouping
  const tables = seatingTables.filter(t => t.guests.length);

  const signPage = `
    <div class="print-sign">
      <div class="ps-mono">S <span class="pc-heart">♥</span> L</div>
      <h1 class="ps-title">Find Your Seat</h1>
      <div class="ps-sub">Sal &amp; Lauren &nbsp;·&nbsp; April 24, 2027 &nbsp;·&nbsp; Clearwater Beach</div>
      <div class="ps-rule">✦ &nbsp; ✦ &nbsp; ✦</div>
      <div class="ps-grid ps-cols-${tables.length <= 4 ? 2 : (tables.length <= 9 ? 3 : 4)}">
        ${tables.map(t => `
          <div class="ps-table">
            <div class="ps-tname">${esc(t.table)}</div>
            <ul class="ps-guests">${partyLines(t).map(l => `<li>${l}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
      <div class="ps-foot">We're so glad you're here — find your name &amp; make yourself at home</div>
    </div>`;

  const cards = tables.map(t => `
    <div class="print-card">
      <div class="pc-corner pc-tl">✦</div><div class="pc-corner pc-tr">✦</div>
      <div class="pc-corner pc-bl">✦</div><div class="pc-corner pc-br">✦</div>
      <div class="pc-mono">S <span class="pc-heart">♥</span> L</div>
      <div class="pc-sub">Sal &amp; Lauren · April 24, 2027</div>
      <div class="pc-rule">· ✦ ·</div>
      <h1 class="pc-table">${esc(t.table)}</h1>
      <ul class="pc-guests">${partyLines(t).map(l => `<li class="pc-party">${l}</li>`).join('')}</ul>
      <div class="pc-count">✦ &nbsp;${t.guests.length} ${t.guests.length === 1 ? 'seat' : 'seats'}&nbsp; ✦</div>
      <div class="pc-foot">Clearwater Beach, Florida</div>
    </div>`).join('');

  $('#printSheet').innerHTML = signPage + cards;
  document.body.classList.add('print-mode');
  window.print();
});
window.addEventListener('afterprint', () => document.body.classList.remove('print-mode'));

$('#tablesGrid').addEventListener('change', e => {
  if (e.target.dataset.cap !== undefined) {
    seatingTables[+e.target.dataset.cap].capacity = Math.max(1, +e.target.value || 8);
    renderSeating();
  }
  if (e.target.dataset.rename !== undefined) {
    seatingTables[+e.target.dataset.rename].table = e.target.value.trim() || 'Table';
  }
});

$('#addTableBtn').addEventListener('click', () => {
  seatingTables.push({ table: 'Table ' + (seatingTables.length + 1), capacity: 8, guests: [] });
  renderSeating();
});

$('#saveSeatingBtn').addEventListener('click', () => {
  $('#seatingStatus').textContent = 'Saving…';
  api('/admin/seating', { method: 'POST', body: JSON.stringify({ tables: seatingTables }) })
    .then(() => { $('#seatingStatus').textContent = '✔ Saved to your Google Sheet'; toast('Seating saved 🪑'); })
    .catch(e => { $('#seatingStatus').textContent = '✖ ' + e.message; });
});

// ---------- groomsmen ----------
function renderMissions() {
  $('#missionTable tbody').innerHTML = MISSIONS.map((m, i) => `
    <tr><td>${esc(String(m['Timestamp']).slice(0, 16))}</td><td>${esc(m['Name'])}</td>
    <td>${esc(m['Role'])}</td><td>${m['Response'] === 'ACCEPTED' ? '✅' : '❌'} ${esc(m['Response'])}</td>
    <td><button class="del-row" data-mdel="${i}" title="Delete entry">✕</button></td></tr>`).join('')
    || '<tr><td colspan="5" class="muted">No mission responses yet.</td></tr>';
  $('#saveMissionsBtn').style.display = missionsDirty ? '' : 'none';
}

function renderLoadouts() {
  $('#loadoutTable tbody').innerHTML = LOADOUTS.map(l => `
    <tr><td><b>${esc(l['Name'])}</b></td><td>${esc(l['Email'])}</td><td>${esc(l['Drink of Choice'])}</td>
    <td>${esc(l['Dance Move'])}</td><td>${esc(l['Hype Song'])}</td><td>${esc(l['Perks'])}</td></tr>`).join('')
    || '<tr><td colspan="6" class="muted">No loadouts deployed yet.</td></tr>';
}

function loadGroomsmen() {
  api('/admin/groomsmen').then(d => {
    MISSIONS = d.missions || [];
    LOADOUTS = d.loadouts || [];
    missionsDirty = false;
    renderMissions();
    renderLoadouts();
  }).catch(e => toast('Groomsmen failed: ' + e.message));
}

$('#missionTable').addEventListener('click', e => {
  const del = e.target.closest('[data-mdel]');
  if (!del) return;
  MISSIONS.splice(+del.dataset.mdel, 1);
  missionsDirty = true;
  renderMissions();
});

$('#saveMissionsBtn').addEventListener('click', () => {
  if (!confirm(`Save the Mission Log with ${MISSIONS.length} entr${MISSIONS.length === 1 ? 'y' : 'ies'}? Deleted rows are gone for good.`)) return;
  api('/admin/missions', { method: 'POST', body: JSON.stringify({ missions: MISSIONS }) })
    .then(() => { missionsDirty = false; renderMissions(); toast('Mission Log saved 🕵️'); })
    .catch(e => toast('Save failed: ' + e.message));
});

$('#clearLoadoutsBtn').addEventListener('click', () => {
  if (!LOADOUTS.length) { toast('No loadouts to clear.'); return; }
  if (!confirm(`Delete all ${LOADOUTS.length} loadouts? The groomsmen can redeploy new ones anytime.`)) return;
  api('/admin/loadouts', { method: 'POST', body: JSON.stringify({ loadouts: [] }) })
    .then(() => { LOADOUTS = []; renderLoadouts(); toast('Loadouts cleared 🗑'); })
    .catch(e => toast('Clear failed: ' + e.message));
});

// ---------- donations ----------
function loadDonations() {
  api('/admin/donations').then(d => {
    const rows = d.donations || [];
    const total = rows.reduce((s, r) => s + (parseFloat(r['Amount']) || 0), 0);
    $('#fundTotalLabel').textContent = '$' + total.toLocaleString();
    $('#donationTable tbody').innerHTML = rows.map(r => `
      <tr><td>${esc(String(r['Timestamp']).slice(0, 16))}</td><td><b>${esc(r['Name'])}</b><br><span class="muted">${esc(r['Email'])}</span></td>
      <td>$${esc(r['Amount'])}</td><td>${esc(r['Message'])}</td></tr>`).join('')
      || '<tr><td colspan="4" class="muted">No gifts yet.</td></tr>';
  }).catch(e => toast('Donations failed: ' + e.message));
}

// ---------- playlist ----------
function loadPlaylist() {
  const render = () => {
    const songs = LOADOUTS.filter(l => String(l['Hype Song'] || '').trim());
    $('#playlistList').innerHTML = songs.map(l =>
      `<li><span>🎵 <b>${esc(l['Hype Song'])}</b></span><span class="who">${esc(l['Name'])}</span></li>`).join('')
      || '<li class="muted">No song requests yet — they come from Create-a-Class.</li>';
    $('#copyPlaylistBtn').onclick = () => {
      navigator.clipboard.writeText(songs.map(l => `${l['Hype Song']} (requested by ${l['Name']})`).join('\n'))
        .then(() => toast('Playlist copied 🎵'));
    };
  };
  if (LOADOUTS.length) { render(); }
  else api('/admin/groomsmen').then(d => { LOADOUTS = d.loadouts || []; render(); }).catch(e => toast(e.message));
}

// ---------- checklist ----------
const STARTER_TASKS = [
  'Book florist', 'Book photographer for full day', 'Confirm DJ + share playlist',
  'Order invitations', 'Send invitations', 'Book hair & makeup trial',
  'Schedule cake tasting', 'Final guest headcount to venue', 'Confirm groomsmen suit fittings',
  'Write vows', 'Book rehearsal dinner spot', 'Arrange guest shuttle',
  'Marriage license (FL: within 60 days)', 'Final venue walkthrough', 'Seating chart to venue',
];

function loadChecklist() {
  api('/admin/checklist').then(d => { checklistItems = d.items || []; renderChecklist(); })
    .catch(e => toast('Checklist failed: ' + e.message));
}

function renderChecklist() {
  const done = checklistItems.filter(i => i.done).length;
  $('#checkStatus').textContent = checklistItems.length ? `${done}/${checklistItems.length} done` : '';
  $('#checkList').innerHTML = checklistItems.map((it, i) => `
    <li class="${it.done ? 'done' : ''}">
      <input type="checkbox" ${it.done ? 'checked' : ''} data-i="${i}">
      <span class="task">${esc(it.task)}</span>
      <button class="del" data-del="${i}">✕</button>
    </li>`).join('') || '<li class="muted" style="padding:10px 6px;">Nothing yet — add a task or load the starter list.</li>';
}

let checkSaveTimer = null;
function saveChecklistSoon() {
  renderChecklist();
  clearTimeout(checkSaveTimer);
  checkSaveTimer = setTimeout(() => {
    api('/admin/checklist', { method: 'POST', body: JSON.stringify({ items: checklistItems }) })
      .then(() => { $('#checkStatus').textContent += ' · saved ✔'; })
      .catch(e => toast('Save failed: ' + e.message));
  }, 900);
}

$('#checkAddForm').addEventListener('submit', e => {
  e.preventDefault();
  const v = $('#checkAddInput').value.trim();
  if (!v) return;
  checklistItems.push({ task: v, done: false });
  $('#checkAddInput').value = '';
  saveChecklistSoon();
});

$('#checkList').addEventListener('change', e => {
  if (e.target.dataset.i !== undefined) {
    checklistItems[+e.target.dataset.i].done = e.target.checked;
    saveChecklistSoon();
  }
});

$('#checkList').addEventListener('click', e => {
  const del = e.target.closest('[data-del]');
  if (del) { checklistItems.splice(+del.dataset.del, 1); saveChecklistSoon(); }
});

$('#starterListBtn').addEventListener('click', () => {
  const existing = new Set(checklistItems.map(i => i.task));
  STARTER_TASKS.filter(t => !existing.has(t)).forEach(t => checklistItems.push({ task: t, done: false }));
  saveChecklistSoon();
  toast('Starter list added ✨');
});
