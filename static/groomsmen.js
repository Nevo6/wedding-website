// =========================================================
// OPERATION: APRIL 2027 — Groomsmen Portal logic
// Black-tie spy recruitment for Sal Caramucci & Lauren Hayle.
// =========================================================

const API_URL = 'https://api.caramucci.com';

// Clearance code -> dossier. Mirrors GROOMSMEN_ROSTER in backend.py.
// Entry is ONLY via the main-site password box (passes ?code=…); there is no
// second password prompt here.
const ROSTER = {
  'Wyatt Rayner': { name: 'Wyatt Rayner', role: 'Groomsman', intel: "Sal's closest friend since the 6th grade.",
                    img: '/static/portraits/wyatt.webp?v=1', focus: '60% 28%',
                    gallery: { dir: 'wyatt', count: 18 } },
  'James Lange':  { name: 'James Lange',  role: 'Groomsman', intel: "Sal's longest-lasting friend since the 4th grade.",
                    img: '/static/portraits/james.webp?v=1', focus: 'center 30%',
                    gallery: { dir: 'james', count: 14 } },
  'Jon Edwards':  { name: 'Jon Edwards',  role: 'Best Man',  intel: 'Brother. Priority asset. The Best Man.',
                    img: '/static/portraits/jon.webp?v=1', focus: 'center 22%',
                    gallery: { dir: 'jon', count: 27 } },
  'Joey PS4':     { name: 'Joey Moglia',  role: 'Groomsman', intel: "One of Sal's closest friends.",
                    img: '/static/portraits/joey.webp?v=1', focus: 'center 30%',
                    gallery: { dir: 'joey', count: 11 } },
};

// On Accept we unlock the main wedding site with a real Tier-1 password so the
// guest skips the gate AND can RSVP (backend re-validates this password).
const BYPASS_PASSWORD = 'HyattRegency2027';

let activeCode = null;
let activeTarget = null;

// ---------- RPG character profiles ----------
// Per-code character sheets. Fill these out as Sal supplies each agent's lore.
const RPG = {
  'Joey PS4': {
    className: 'Supersonic Financial Vanguard',
    level: 26,
    origin: 'Spawned in the halls of McKamy Middle School and leveled up through ' +
            'Flower Mound High School. Early game consisted of daily grinds at the ' +
            'WAC, dominating the basketball court and accumulating mass in the weight room.',
    stats: [
      { name: 'Strength',     key: 'STR', val: 85, note: 'Forged from daily WAC lifting sessions.' },
      { name: 'Agility',      key: 'AGI', val: 92, note: 'Unmatched ankle-breaking on the post-middle school basketball courts.' },
      { name: 'Intelligence', key: 'INT', val: 88, note: 'Stock market analysis and shared portfolio gains.' },
      { name: 'Mechanics',    key: 'MEC', val: 99, note: 'Aerials, flip resets, and daily Rocket League grinds.' },
    ],
    abilities: [
      { name: 'Court Sweeper',     icon: '🏀',    anim: 'bounce', text: 'Passive ability activated every day after middle school. Grants +10 dominance against kids at the WAC.' },
      { name: 'Bull Market Buff',  icon: 'chart', anim: 'chart',  text: 'Strategic investment protocol. Yields compounding returns when pooling stocks together.' },
      { name: 'Supersonic Acrobat',icon: '🚀',    anim: 'roll',   text: 'Equips a rocket-powered battle-car for daily ranked grinds and clutch saves.' },
    ],
  },

  'Jon Edwards': {
    className: 'Right-Hand Legend',
    level: 26,
    // Note: corrected to the real wedding date (April 24th, 2027).
    origin: 'Brother. Priority asset. The Best Man. A founding member of the crew, ' +
            'battle-tested across countless campaigns and ready for the final boss: April 24th, 2027.',
    stats: [
      { name: 'Strength',     key: 'STR', val: 90, note: 'Carries the squad, literally and figuratively.' },
      { name: 'Agility',      key: 'AGI', val: 88, note: 'Quick reflexes — except after midnight.' },
      { name: 'Intelligence', key: 'INT', val: 91, note: 'Always three moves ahead.' },
      { name: 'Loyalty',      key: 'LOY', val: 100, note: 'Maxed since day one. The Best Man stat.' },
    ],
    abilities: [
      { name: 'Ride or Die',   icon: '🤝',    anim: 'bounce', text: 'Passive aura. Answers the call every time, no questions asked.' },
      { name: 'Hype Man',      icon: 'chart', anim: 'chart',  text: 'Buffs party morale and keeps the whole crew trending upward.' },
      { name: 'Clutch Factor', icon: '🚀',    anim: 'roll',   text: 'Comes through when the stakes are highest. Best Man clutch.' },
    ],
    campaigns: [
      'Operation: Grand Champ — Survived the Rocket League trenches.',
    ],
    debuffs: [
      'Irish Exit: −50 Stealth when leaving a venue.',
      'Midnight IPA: 2× damage penalty to Agility (AGI) after 12:00 AM.',
    ],
    gear: [
      'Emergency Advil Cache (+20 Recovery)',
    ],
  },

  'James Lange': {
    className: 'Ride-or-Die Vanguard',
    level: 26,
    origin: 'Our story starts all the way back in 4th grade on North View Court in ' +
            'Flower Mound. Back then, my main memory is being completely terrified of ' +
            'him during after-school lacrosse — he played all the time and would chuck ' +
            'the ball so ridiculously fast I was afraid to even join in. We survived ' +
            'Wellington, McKamy, and Flower Mound High School together, where James easily ' +
            'cemented himself as the funniest guy in the room. During a game of "two ' +
            'truths and a lie" in history class, his truth was that "we are best friends" ' +
            '(even though we didn\'t really know each other yet) and his lie was something ' +
            'entirely absurd, like having wet socks. The joke was so genius I immediately ' +
            'stole it to use on strangers. From those early days to now, the friendship ' +
            'hasn\'t skipped a beat, and I absolutely cannot wait to celebrate him at his ' +
            'own wedding in Mexico City this year.',
    stats: [
      { name: 'Strength',     key: 'STR', val: 86, note: 'Chucked a lacrosse ball so fast it scared kids off the field.' },
      { name: 'Agility',      key: 'AGI', val: 89, note: 'Wheels ready in the driver seat the second he got his license.' },
      { name: 'Intelligence', key: 'INT', val: 90, note: 'The "two truths and a lie" mastermind. Genius-tier comedic timing.' },
      { name: 'Loyalty',      key: 'LOY', val: 100, note: 'Longest-lasting friend since the 4th grade. Maxed since day one.' },
    ],
    abilities: [
      { name: 'Ride or Die',   icon: '🤝',    anim: 'bounce', text: 'The second he got his license, he made sure I always had a shotgun seat waiting for the morning commute. While everyone else was hunting for high school parties, you could find us holding it down, marathoning Rick and Morty, and dominating as undisputed Halo 3 champs. Today we still lock in every Friday night to catch up and game online — with James always ready to spot me some fake cash and carry my online poker habits.' },
      { name: 'Hype Man',      icon: 'chart', anim: 'chart',  text: 'If you need someone to bring the energy, James is your guy. Nothing beats cruising in and out of the high school parking lot — blasting Hannah Montana one minute, aggressively rapping Migos\' "Pipe It Up" the next, and dropping our own legendary (and probably terrible) freestyles from the passenger seat.' },
      { name: 'Clutch Factor', icon: '🚀',    anim: 'roll',   text: 'Whenever we link up, it feels like we step into a movie. Whether we meet in Nashville or he comes down to Tampa, a chain of unbelievable events always unfolds. Case in point: his Tampa trip — three spins into the slots at the Hard Rock, the man hits a real-money jackpot, then immediately splits the winnings with me and covers our drinks all night. James always comes through when it counts.' },
    ],
    campaigns: [
      'Operation: Hard Rock Jackpot — Hit real money three spins in, split it on the spot.',
      'The North View Court Origin — Survived Wellington, McKamy, and Flower Mound High together.',
    ],
    gear: [
      'Shotgun Seat (permanently reserved, +15 Loyalty)',
      'Infinite Fake-Cash Buy-In (+poker carry)',
    ],
  },
};

// Tasteful generic sheet for agents whose lore Sal hasn't supplied yet.
function profileFor(code, target) {
  if (RPG[code]) return RPG[code];
  const isBest = target.role === 'Best Man';
  return {
    className: isBest ? 'Right-Hand Legend' : 'Loyal Vanguard',
    level: 26,
    origin: target.intel + ' A founding member of the crew, battle-tested across ' +
            'countless campaigns and ready for the final boss: April 24th, 2027.',
    stats: [
      { name: 'Strength',     key: 'STR', val: 80, note: 'Years of carrying the squad.' },
      { name: 'Agility',      key: 'AGI', val: 84, note: 'Quick to show up when it counts.' },
      { name: 'Intelligence', key: 'INT', val: 86, note: 'Always has the plan.' },
      { name: 'Loyalty',      key: 'LOY', val: 99, note: 'Maxed out since day one.' },
    ],
    abilities: [
      { name: 'Ride or Die',  icon: '🤝',    anim: 'bounce', text: 'Passive aura. Always answers the call, no questions asked.' },
      { name: 'Hype Man',     icon: 'chart', anim: 'chart',  text: 'Buffs morale and keeps the whole party trending upward.' },
      { name: 'Clutch Factor',icon: '🚀',    anim: 'roll',   text: 'Comes through when the stakes are highest.' },
    ],
  };
}

// Inline upward green line chart for the "chart" ability icon.
const CHART_SVG = '<svg class="chart-svg" viewBox="0 0 40 28">' +
  '<polyline class="chart-line" points="2,25 12,17 21,20 29,9 38,3"></polyline>' +
  '<polyline class="chart-line" points="32,3 38,3 38,9"></polyline></svg>';

// ---------- Stages ----------
const stages = {
  briefing: document.getElementById('briefing'),
};
function showStage(name) {
  Object.values(stages).forEach(s => s && s.classList.remove('active'));
  if (stages[name]) stages[name].classList.add('active');
}

const screen = document.getElementById('screen');

// ---------- Background music + mute ----------
const bgMusic = document.getElementById('bg-music');
const muteBtn = document.getElementById('muteBtn');
const ICON_SOUND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7.5 7.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const ICON_MUTED = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16 9l5 5M21 9l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

let muted = false;
try { muted = sessionStorage.getItem('portalMuted') === '1'; } catch (e) { /* ignore */ }

function applyMute() {
  if (bgMusic) bgMusic.muted = muted;
  if (muteBtn) {
    muteBtn.classList.toggle('muted', muted);
    muteBtn.setAttribute('aria-label', muted ? 'Unmute music' : 'Mute music');
    muteBtn.innerHTML = muted ? ICON_MUTED : ICON_SOUND;
  }
}

function startMusic() {
  if (!bgMusic) return;
  bgMusic.volume = 0.45;
  applyMute();
  const p = bgMusic.play();
  if (p && p.catch) p.catch(() => { /* autoplay blocked — starts on first gesture below */ });
}

if (muteBtn) {
  muteBtn.addEventListener('click', () => {
    muted = !muted;
    try { sessionStorage.setItem('portalMuted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
    applyMute();
    if (!muted && bgMusic && bgMusic.paused) bgMusic.play().catch(() => {});
  });
}
applyMute();
startMusic();
// Browsers block autoplay until a gesture — kick the music off on the first one.
['click', 'keydown', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, () => {
    if (bgMusic && bgMusic.paused && !muted) bgMusic.play().catch(() => {});
  }, { once: true }));

// ---------- Audio ----------
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // soft, low ambient lounge hum
    const hum = audioCtx.createOscillator();
    const humGain = audioCtx.createGain();
    hum.type = 'sine';
    hum.frequency.value = 48;
    humGain.gain.value = 0.018;
    hum.connect(humGain).connect(audioCtx.destination);
    hum.start();
  } catch (e) { /* silent fallback */ }
}
// Start ambience on the very first user gesture (autoplay policies).
['click', 'keydown', 'touchstart'].forEach(ev =>
  window.addEventListener(ev, ensureAudio, { once: true }));

// Soft elegant tick while text types in.
function typeTick() {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = 880 + Math.random() * 220;
    g.gain.setValueAtTime(0.018, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.04);
  } catch (e) { /* ignore */ }
}

// ---- Funny "you tried to decline" sounds ----
function playSadTrombone() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const notes = [233.08, 220.0, 207.65, 185.0]; // Bb3, A3, Ab3, descending to G3
  notes.forEach((f, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 900;
    o.type = 'sawtooth';
    const start = t0 + i * 0.22;
    const dur = i === notes.length - 1 ? 0.55 : 0.2;
    o.frequency.setValueAtTime(f, start);
    if (i === notes.length - 1) o.frequency.linearRampToValueAtTime(f * 0.86, start + dur); // final droop
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(lp).connect(g).connect(audioCtx.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  });
}
function playBoing() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(520, t0);
  o.frequency.exponentialRampToValueAtTime(90, t0 + 0.18);
  o.frequency.exponentialRampToValueAtTime(260, t0 + 0.34);
  o.frequency.exponentialRampToValueAtTime(120, t0 + 0.5);
  g.gain.setValueAtTime(0.16, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
  o.connect(g).connect(audioCtx.destination);
  o.start(t0); o.stop(t0 + 0.6);
}
function playSlideWhistle() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(400, t0);
  o.frequency.exponentialRampToValueAtTime(1600, t0 + 0.22);
  o.frequency.exponentialRampToValueAtTime(300, t0 + 0.5);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(0.1, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
  o.connect(g).connect(audioCtx.destination);
  o.start(t0); o.stop(t0 + 0.55);
}
const FUNNY_SOUNDS = [playSadTrombone, playBoing, playSlideWhistle, playSadTrombone];
function playFunnyDecline() {
  ensureAudio();
  FUNNY_SOUNDS[Math.floor(Math.random() * FUNNY_SOUNDS.length)]();
}

// ---------- BRIEFING (RPG character sheet) ----------
function bootSequence() {
  showStage('briefing');
  setPortrait(activeTarget);
  renderCharacter(activeCode, activeTarget);
}

// Swap the redacted portrait in and run the "decryption" reveal.
function setPortrait(target) {
  const img = document.getElementById('portrait');
  if (!img) return;
  img.style.setProperty('--focus', target.focus || 'center 25%');
  img.alt = 'Operative ' + target.name;
  img.src = target.img;
  // restart the decrypt animation each load
  const frame = document.querySelector('.portrait-frame');
  if (frame) { frame.classList.remove('decrypt'); void frame.offsetWidth; frame.classList.add('decrypt'); }
}

function typeInto(el, text, speed, done) {
  el.textContent = '';
  el.classList.add('cursor-blink');
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      if (text[i - 1] !== ' ') typeTick();
      setTimeout(tick, speed);
    } else {
      el.classList.remove('cursor-blink');
      if (done) done();
    }
  };
  tick();
}

function renderCharacter(code, target) {
  const p = profileFor(code, target);

  document.getElementById('charName').textContent = target.name;
  document.getElementById('charClass').textContent = p.className;
  document.getElementById('charLevel').textContent = p.level;

  // Core stats — the CSS "grow" keyframe animates each bar 0 → target on insert.
  const rows = document.getElementById('statRows');
  rows.innerHTML = '';
  p.stats.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.title = s.note;
    row.innerHTML =
      `<div class="stat-top"><span class="stat-name">${s.name} <small>(${s.key})</small></span>` +
      `<span class="stat-num">${s.val}/100</span></div>` +
      `<div class="stat-track"><div class="stat-fill" style="--val:${s.val}%;animation-delay:${(i * 0.12).toFixed(2)}s"></div></div>` +
      `<div class="stat-note">${s.note}</div>`;
    rows.appendChild(row);
  });

  // Skill tree — each node animates on hover and reveals its text in the readout.
  const tree = document.getElementById('skillTree');
  const readout = document.getElementById('skillReadout');
  tree.innerHTML = '';
  p.abilities.forEach(a => {
    const node = document.createElement('div');
    node.className = 'skill-node anim-' + a.anim;
    node.tabIndex = 0;
    node.innerHTML =
      `<div class="skill-icon">${a.icon === 'chart' ? CHART_SVG : a.icon}</div>` +
      `<div class="skill-name">${a.name}</div>`;
    const reveal = () => {
      readout.innerHTML = `<strong>${a.name}.</strong> ${a.text}`;
      readout.classList.add('lit');
    };
    node.addEventListener('mouseenter', reveal);
    node.addEventListener('focus', reveal);
    node.addEventListener('click', reveal);
    tree.appendChild(node);
  });

  // Optional lore sections (Past Campaigns / Known Debuffs / Equipped Gear).
  renderLoreSection('campaignsSection', 'campaignsList', p.campaigns);
  renderLoreSection('debuffsSection', 'debuffsList', p.debuffs);
  renderLoreSection('gearSection', 'gearList', p.gear);

  // Type out the origin lore, then reveal the terminal RSVP prompt.
  typeInto(document.getElementById('originText'), p.origin, 13, () => {
    const term = document.getElementById('terminal');
    if (term) term.style.visibility = 'visible';
  });
}

function renderLoreSection(sectionId, listId, items) {
  const section = document.getElementById(sectionId);
  const list = document.getElementById(listId);
  if (!section || !list) return;
  if (!items || !items.length) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = items.map(t => `<li>${t}</li>`).join('');
}

// ---------- TERMINAL RSVP (replaces the 3D avatar + ultimatum) ----------
const TAUNTS = ['Nice try.', 'Denied.', 'Out of the question.', 'Not happening.', 'There is no ‘N’.'];

// Tattle to Sal the first time someone tries to bail (once per session).
let declineReported = false;
function reportDeclineAttempt() {
  if (declineReported || !activeCode) return;
  declineReported = true;
  fetch(`${API_URL}/decline_attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: activeCode }),
  }).catch(e => console.error('Decline report failed:', e));
}

let missionResolved = false;
function termPrint(text, cls) {
  const out = document.getElementById('termOut');
  if (!out) return;
  const line = document.createElement('div');
  line.className = 'term-msg' + (cls ? ' ' + cls : '');
  line.textContent = text;
  out.appendChild(line);
}

function acceptMission() {
  if (missionResolved) return;
  missionResolved = true;
  const term = document.getElementById('terminal');
  if (term) term.classList.add('resolved');
  termPrint('> ACCESS GRANTED — MISSION ACCEPTED', 'ok');

  acceptSequence();

  // Notify Sal, log to Google Sheets, and unlock the site (all in background).
  try {
    fetch(`${API_URL}/mission_response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeCode, response: 'accepted' }),
    }).catch(e => console.error('Mission transmit failed:', e));
  } catch (e) { /* ignore */ }
  try {
    sessionStorage.setItem('weddingAuthenticated', 'true');
    sessionStorage.setItem('weddingTier', '1');
    sessionStorage.setItem('weddingPassword', BYPASS_PASSWORD);
    if (activeTarget) sessionStorage.setItem('groomsmanCodename', activeTarget.name);
  } catch (e) { /* sessionStorage may be unavailable */ }
}

function declineMission() {
  if (missionResolved) return;
  playFunnyDecline();
  reportDeclineAttempt();
  termPrint('> ' + TAUNTS[Math.floor(Math.random() * TAUNTS.length)] + ' THERE IS NO BACKING OUT. [ Y / N ]', 'err');
  screen.classList.add('glitch');
  setTimeout(() => screen.classList.remove('glitch'), 400);
}

// Keyboard (desktop) + tap (mobile) for the Y / N prompt.
window.addEventListener('keydown', e => {
  const term = document.getElementById('terminal');
  if (!term || term.style.visibility !== 'visible') return;
  const k = (e.key || '').toLowerCase();
  if (k === 'y') acceptMission();
  else if (k === 'n') declineMission();
});
const btnYes = document.getElementById('btnYes');
const btnNo = document.getElementById('btnNo');
if (btnYes) btnYes.addEventListener('click', acceptMission);
if (btnNo) btnNo.addEventListener('click', declineMission);

// ---------- ACCEPT SEQUENCE: boombox song + memory cascade + redirect ----------
const MEMORY_EMOJI = ['🏀', '📈', '🚀', '🎮', '🥂', '🎓', '💪', '🤝', '🏎️', '📸', '🔥', '👑', '🎯', '🍻'];

let redirected = false;
function redirectHomeOnce() {
  if (redirected) return;
  redirected = true;
  window.location.href = '/';
}

function acceptSequence() {
  playAchievement(activeTarget);

  // 10-second level animation + trophy cards + a beat to enjoy 999.
  const wait = Math.min(20000, Math.max(14000, montageDurationMs + 4500));
  setTimeout(redirectHomeOnce, wait);
}

// Build the list of a groomsman's showcase photo URLs.
function galleryUrls(target) {
  if (!target || !target.gallery) return [];
  const { dir, count } = target.gallery;
  const urls = [];
  for (let i = 1; i <= count; i++) urls.push(`/static/showcase/${dir}/${String(i).padStart(2, '0')}.webp`);
  return urls;
}

let montageDurationMs = 6000;
let _orbInterval = null;   // guard against double-invocation

// ---------- Minecraft-style XP orbs + BO2 rank-up audio ----------
// Sounds are synthesized with the Web Audio API (no asset files / no licensing).
let _xpAudio = null;
function xpAudioCtx() {
  if (!_xpAudio) {
    try { _xpAudio = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return null; }
  }
  if (_xpAudio.state === 'suspended') _xpAudio.resume().catch(() => {});
  return _xpAudio;
}

// Short pitched blip approximating Minecraft's orb-pickup ("random.orb") sound.
function playOrbBlip() {
  const ctx = xpAudioCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  const base = 500 + Math.random() * 240;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(base, now);
  o.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.05);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.16, now + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
  o.connect(g).connect(ctx.destination);
  o.start(now); o.stop(now + 0.18);
}

// Brighter two-note rising chime on each level / rank up.
function playLevelChime() {
  const ctx = xpAudioCtx(); if (!ctx) return;
  const now = ctx.currentTime;
  [0, 0.09].forEach((dt, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(i === 0 ? 784 : 1175, now + dt); // G5 -> D6
    g.gain.setValueAtTime(0.0001, now + dt);
    g.gain.exponentialRampToValueAtTime(0.11, now + dt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dt + 0.22);
    o.connect(g).connect(ctx.destination);
    o.start(now + dt); o.stop(now + dt + 0.24);
  });
}

// One green XP orb: flies from a random spot, arcs, and lands in the XP bar.
function spawnXpOrb(tx, ty, onArrive) {
  const layer = document.getElementById('xpOrbs');
  if (!layer) { onArrive && onArrive(); return; }
  const orb = document.createElement('div');
  orb.className = 'xp-orb';
  const sx = Math.random() * window.innerWidth;
  const sy = (Math.random() < 0.5 ? 0.06 : 0.5) * window.innerHeight + Math.random() * 0.32 * window.innerHeight;
  orb.style.left = sx + 'px';
  orb.style.top = sy + 'px';
  layer.appendChild(orb);
  const midX = (sx + tx) / 2 + (Math.random() * 160 - 80);
  const midY = Math.min(sy, ty) - (50 + Math.random() * 90);
  const anim = orb.animate([
    { transform: 'translate(0,0) scale(.7)', opacity: 0.25 },
    { transform: `translate(${midX - sx}px,${midY - sy}px) scale(1.2)`, opacity: 1, offset: 0.55 },
    { transform: `translate(${tx - sx}px,${ty - sy}px) scale(.35)`, opacity: 0.9 },
  ], { duration: 620 + Math.random() * 360, easing: 'cubic-bezier(.55,0,.7,1)' });
  anim.onfinish = () => { orb.remove(); onArrive && onArrive(); };
  anim.oncancel = () => { orb.remove(); };
}

// Level 1 → 999 in 10 seconds.
// Piecewise easing: levels 1-900 in 6 s (blurring fast), 900-970 in 2 s (slowing),
// 970-999 in 2 s (one level at a time, super dramatic).
function playXpRankUp() {
  const DURATION = 10000;
  const MAX_LEVEL = 999;

  function levelAtTime(t) {
    if (t < 0.60) {
      return Math.max(1, Math.floor(1 + 899 * Math.pow(t / 0.60, 0.28)));
    } else if (t < 0.80) {
      return 900 + Math.floor(70 * (t - 0.60) / 0.20);
    } else {
      return 970 + Math.floor(29 * (t - 0.80) / 0.20);
    }
  }

  function continuousLevel(t) {
    if (t < 0.60) return 1 + 899 * Math.pow(t / 0.60, 0.28);
    if (t < 0.80) return 900 + 70 * (t - 0.60) / 0.20;
    return 970 + 29 * (t - 0.80) / 0.20;
  }

  const fill    = document.getElementById('achXp');
  const xpBar   = fill && fill.parentElement;
  const epEl    = document.getElementById('achEp');
  const lvBig   = document.getElementById('achLvBig');
  const lvEl    = document.getElementById('achLv');
  const lvNextEl= document.getElementById('achLvNext');
  const gainEl  = document.getElementById('achEpGain');
  const tallies = document.getElementById('rankTallies');
  const rank    = document.getElementById('achRank');
  const rankUp  = document.getElementById('achRankUp');

  let startTime = null;
  let lastLevel = 0;

  function barTarget() {
    if (!xpBar) return { x: window.innerWidth / 2, y: window.innerHeight * 0.55 };
    const r = xpBar.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  // Init display
  if (lvBig)    lvBig.textContent = '1';
  if (lvEl)     lvEl.textContent  = '1';
  if (lvNextEl) lvNextEl.textContent = '2';
  if (epEl)     epEl.textContent  = '0';

  // Continuous orb stream for the full 10 s (clear any previous invocation)
  if (_orbInterval) { clearInterval(_orbInterval); _orbInterval = null; }
  _orbInterval = setInterval(() => {
    const bt = barTarget();
    spawnXpOrb(bt.x, bt.y, () => {});
  }, 200);

  function tick(ts) {
    if (!startTime) startTime = ts;
    const elapsed = Math.min(ts - startTime, DURATION);
    const t = elapsed / DURATION;

    const currentLevel = levelAtTime(t);
    const ep = Math.floor(currentLevel * 9980);
    if (epEl) epEl.textContent = ep.toLocaleString();

    // XP bar fills within each level then snaps (no CSS transition — we drive it)
    const barPct = (continuousLevel(t) % 1) * 100;
    if (fill) { fill.style.transition = 'none'; fill.style.width = barPct + '%'; }

    if (currentLevel !== lastLevel) {
      const jumped = currentLevel - lastLevel;
      lastLevel = currentLevel;

      if (lvBig) lvBig.textContent = currentLevel;
      if (lvEl)  lvEl.textContent  = currentLevel;
      if (lvNextEl) lvNextEl.textContent = currentLevel < MAX_LEVEL ? currentLevel + 1 : 'MAX';

      // EP gain readout
      if (gainEl) { gainEl.textContent = '+' + ep.toLocaleString() + ' EP'; gainEl.classList.add('show'); }

      // Blur: heavy in fast phase, fades to zero in slow phase
      const blurPx = t < 0.60 ? Math.min(14, jumped * 0.6) :
                     t < 0.80 ? Math.min(4,  jumped * 0.5) : 0;
      if (lvBig) lvBig.style.filter = blurPx > 0 ? `blur(${blurPx}px)` : '';

      // Growing glow as you approach 999
      const glowA = 0.25 + (currentLevel / MAX_LEVEL) * 0.75;
      const glowR = 30 + Math.floor(currentLevel / 10);
      if (lvBig) lvBig.style.textShadow =
        `0 0 ${glowR}px rgba(201,162,75,${glowA.toFixed(2)}), ` +
        `0 0 ${glowR * 2}px rgba(201,162,75,${(glowA * 0.45).toFixed(2)})`;

      // Sound: every 12 levels fast, every 3 medium, every 1 slow
      const playBlip = t < 0.60 ? (currentLevel % 12 === 0) :
                       t < 0.80 ? (currentLevel % 3  === 0) : true;
      if (playBlip) playOrbBlip();

      // Chime + RANK UP: medium phase every 7, slow phase every single level
      const doRankUp = (t >= 0.80) || (t >= 0.60 && currentLevel % 7 === 0);
      if (doRankUp) {
        playLevelChime();
        if (rankUp) { rankUp.classList.remove('show'); void rankUp.offsetWidth; rankUp.classList.add('show'); }
        if (rank)   { rank.classList.remove('up');    void rank.offsetWidth;   rank.classList.add('up'); setTimeout(() => rank.classList.remove('up'), 480); }
      }

      // BO2 tally mark: one per 100 levels
      if (tallies && currentLevel % 100 === 0 && currentLevel < MAX_LEVEL) {
        const tk = document.createElement('span');
        tk.className = 'rank-tally';
        tallies.appendChild(tk);
        requestAnimationFrame(() => tk.classList.add('show'));
      }

      // XP bar flash on level-up
      if (xpBar) { xpBar.classList.add('flash'); setTimeout(() => xpBar.classList.remove('flash'), 100); }
    }

    if (elapsed < DURATION) {
      requestAnimationFrame(tick);
    } else {
      // ── FINALE: hit 999 ──
      clearInterval(_orbInterval); _orbInterval = null;
      if (lvBig) { lvBig.textContent = '999'; lvBig.style.filter = ''; lvBig.style.textShadow = ''; lvBig.classList.add('max'); }
      if (fill)  { fill.style.transition = ''; fill.style.width = '100%'; }
      if (lvEl)  lvEl.textContent = '999';
      if (lvNextEl) lvNextEl.textContent = 'MAX';
      if (epEl)  epEl.textContent = (MAX_LEVEL * 9980).toLocaleString();
      if (rankUp) { rankUp.textContent = '⚡ MAX RANK ⚡'; rankUp.classList.remove('show'); void rankUp.offsetWidth; rankUp.classList.add('show'); }
      // Triple chime salvo
      playLevelChime();
      setTimeout(playLevelChime, 220);
      setTimeout(playLevelChime, 440);
      // Final orb burst
      for (let i = 0; i < 10; i++) {
        setTimeout(() => { const bt = barTarget(); spawnXpOrb(bt.x, bt.y, () => {}); }, i * 55);
      }
    }
  }

  requestAnimationFrame(tick);
}

// ACHIEVEMENT UNLOCKED finale: title slam, XP bar fills to LV 27, a "+N role"
// toast, and the groomsman's photos pop in as unlocked trophy cards.
function playAchievement(target) {
  const ov = document.getElementById('achievement');
  if (!ov) return;
  ov.classList.add('active');

  const role = (target && target.role) || 'Groomsman';
  const title = document.getElementById('achTitle');
  const toast = document.getElementById('achToast');
  if (title) title.textContent = role.toUpperCase();
  if (toast) toast.textContent = '+1 ' + role;

  // Kick off the Minecraft-style XP-orb flood + BO2-style rank-up cascade
  // once the rank/level row has faded in.
  setTimeout(playXpRankUp, 900);

  // Unlock the trophy cards.
  const cards = document.getElementById('achCards');
  cards.innerHTML = '';
  const photos = galleryUrls(target);
  const START = 3.0;                                   // seconds before first card
  const STAGGER = photos.length > 16 ? 0.16 : 0.22;    // seconds between cards
  const CARD_ANIM = 0.5;

  if (photos.length) {
    photos.forEach((url, i) => {
      const t = document.createElement('div');
      t.className = 'trophy';
      t.style.setProperty('--r', (Math.random() * 10 - 5).toFixed(1) + 'deg');
      t.style.animationDelay = (START + i * STAGGER).toFixed(2) + 's';
      const img = document.createElement('img');
      img.src = url; img.alt = ''; img.loading = 'eager';
      t.appendChild(img);
      cards.appendChild(t);
    });
    montageDurationMs = Math.round((START + (photos.length - 1) * STAGGER + CARD_ANIM) * 1000 + 600);
  } else {
    // Emoji trophies for any agent without a photo gallery.
    const set = MEMORY_EMOJI.slice(0, 12);
    set.forEach((e, i) => {
      const t = document.createElement('div');
      t.className = 'trophy emoji';
      t.style.setProperty('--r', (Math.random() * 10 - 5).toFixed(1) + 'deg');
      t.style.animationDelay = (START + i * 0.18).toFixed(2) + 's';
      t.innerHTML = `<span>${e}</span>`;
      cards.appendChild(t);
    });
    montageDurationMs = Math.round((START + set.length * 0.18 + CARD_ANIM) * 1000 + 600);
  }
}

// ---------- ENTRY ----------
// Entry is only via the main-site password box, which passes ?code=…
// No valid code = no business here, so send them to the wedding site.
(function init() {
  const urlCode = new URLSearchParams(window.location.search).get('code');
  if (urlCode && ROSTER[urlCode]) {
    activeCode = urlCode;
    activeTarget = ROSTER[urlCode];
    bootSequence();
  } else {
    window.location.replace('/');
  }
})();
