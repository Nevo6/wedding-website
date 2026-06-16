// =========================================================
// OPERATION: APRIL 2027 — Groomsmen Portal logic
// Black-tie spy recruitment for Sal Caramucci & Lauren Hayle.
// =========================================================

const API_URL = 'https://api.caramucci.com';

// Clearance code -> dossier. Mirrors GROOMSMEN_ROSTER in backend.py.
// Entry is ONLY via the main-site password box (passes ?code=…); there is no
// second password prompt here.
const ROSTER = {
  'Wyatt Rayner': { name: 'Wyatt Rayner', role: 'Groomsman', intel: "Sal's closest friend since the 6th grade." },
  'James Lange':  { name: 'James Lange',  role: 'Groomsman', intel: "Sal's longest-lasting friend since the 4th grade." },
  'Jon Edwards':  { name: 'Jon Edwards',  role: 'Best Man',  intel: 'Brother. Priority asset. The Best Man.' },
  'Joey PS4':     { name: 'Joey Moglia',  role: 'Groomsman', intel: "One of Sal's closest friends." },
};

// On Accept we unlock the main wedding site with a real Tier-1 password so the
// guest skips the gate AND can RSVP (backend re-validates this password).
const BYPASS_PASSWORD = 'HyattRegency2027';

let activeCode = null;
let activeTarget = null;

// ---------- Stages ----------
const stages = {
  briefing: document.getElementById('briefing'),
  ultimatum: document.getElementById('ultimatum'),
};
function showStage(name) {
  Object.values(stages).forEach(s => s.classList.remove('active'));
  if (stages[name]) stages[name].classList.add('active');
}

const screen = document.getElementById('screen');

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

// ---------- BRIEFING ----------
function bootSequence() {
  showStage('briefing');
  initAvatar();
  populateDossier(activeTarget);
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

function populateDossier(target) {
  const lines = [
    { el: 'dTarget', text: target.name, speed: 32 },
    { el: 'dRole', text: target.role, speed: 32 },
    { el: 'dIntel', text: target.intel, speed: 22 },
    { el: 'dBrief', speed: 16, text:
      'Your assignment, should you choose to accept it: report to the Hyatt Regency ' +
      'in Clearwater Beach on the 24th of April, 2027, in full black tie. Stand beside ' +
      'Sal Caramucci as he marries Lauren Hayle, keep the rings secure, the toasts ' +
      'flowing, and the dance floor under control. Discretion optional. Style mandatory.' },
  ];
  let idx = 0;
  const next = () => {
    if (idx >= lines.length) {
      document.getElementById('engageBtn').style.visibility = 'visible';
      return;
    }
    const line = lines[idx++];
    typeInto(document.getElementById(line.el), line.text, line.speed, next);
  };
  next();
}

// ---------- THREE.JS TUXEDO AGENT ----------
let renderer, scene, camera, agent, animId;
function initAvatar() {
  if (renderer) return;
  const wrap = document.getElementById('avatarWrap');
  const w = wrap.clientWidth, h = wrap.clientHeight;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
  camera.position.set(0, 0.6, 9.5);
  camera.lookAt(0, 0.3, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  wrap.appendChild(renderer.domElement);

  // Warm gold key light + soft fill + gold rim
  const key = new THREE.DirectionalLight(0xfff0d0, 1.15);
  key.position.set(3, 6, 5);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x3a3326, 0.7));
  const rim = new THREE.PointLight(0xc9a24b, 0.9, 22);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  agent = new THREE.Group();

  const suit   = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.55, metalness: 0.25 });
  const shirtM = new THREE.MeshStandardMaterial({ color: 0xf4efe3, roughness: 0.6 });
  const black  = new THREE.MeshStandardMaterial({ color: 0x050507, roughness: 0.4, metalness: 0.3 });
  const skin   = new THREE.MeshStandardMaterial({ color: 0xd2a982, roughness: 0.85 });
  const censor = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
  const goldM  = new THREE.MeshStandardMaterial({ color: 0xc9a24b, roughness: 0.25, metalness: 0.9 });

  // Torso (jacket)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.45, 1.85, 0.7), suit);
  torso.position.y = 1.0;
  agent.add(torso);

  // White shirt panel down the front
  const shirt = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.4, 0.06), shirtM);
  shirt.position.set(0, 1.0, 0.37);
  agent.add(shirt);

  // Lapels (two angled black strips over the shirt edges)
  [-1, 1].forEach(side => {
    const lap = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.2, 0.04), black);
    lap.position.set(side * 0.34, 1.05, 0.38);
    lap.rotation.z = side * 0.18;
    agent.add(lap);
  });

  // Bow tie
  const knot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.08), black);
  knot.position.set(0, 1.72, 0.4);
  agent.add(knot);
  [-1, 1].forEach(side => {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.06), black);
    wing.position.set(side * 0.18, 1.72, 0.4);
    agent.add(wing);
  });

  // Gold boutonniere / lapel pin
  const pin = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), goldM);
  pin.position.set(-0.42, 1.35, 0.42);
  agent.add(pin);

  // Head + redaction bar
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.8), skin);
  head.position.y = 2.4;
  agent.add(head);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.92), censor);
  bar.position.set(0, 2.5, 0);
  agent.add(bar);

  // Arms
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.65, 0.45), suit);
    arm.position.set(side * 0.98, 1.0, 0);
    agent.add(arm);
  });
  // Legs (tux trousers)
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.7, 0.55), suit);
    leg.position.set(side * 0.38, -0.75, 0);
    agent.add(leg);
  });

  agent.position.y = -0.55;
  scene.add(agent);

  // Gold pedestal ring at the feet
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.06, 12, 60), goldM);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -2.15;
  scene.add(ring);

  const onResize = () => {
    const nw = wrap.clientWidth, nh = wrap.clientHeight;
    if (!nw || !nh) return;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener('resize', onResize);

  const animate = () => {
    animId = requestAnimationFrame(animate);
    agent.rotation.y += 0.007;
    renderer.render(scene, camera);
  };
  animate();
}

// ---------- ULTIMATUM ----------
document.getElementById('engageBtn').addEventListener('click', () => showStage('ultimatum'));

const declineBtn = document.getElementById('declineBtn');
const acceptBtn = document.getElementById('acceptBtn');

const TAUNTS = ['Nope!', 'Too slow!', 'Nice try, 007.', 'Not today.', 'As if.',
                'Catch me!', 'Denied.', 'You blinked.', 'Missed me.', 'Out of the question.'];

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

function fleeDecline() {
  const maxX = Math.min(window.innerWidth / 2 - 130, 240);
  const maxY = Math.min(window.innerHeight / 2 - 120, 180);
  const x = (Math.random() * 2 - 1) * maxX;
  const y = (Math.random() * 2 - 1) * maxY;
  declineBtn.style.transform = `translate(${x}px, ${y}px) rotate(${(Math.random() * 16 - 8).toFixed(1)}deg)`;
  declineBtn.textContent = TAUNTS[Math.floor(Math.random() * TAUNTS.length)];
  playFunnyDecline();
  reportDeclineAttempt();
  screen.classList.add('glitch');
  setTimeout(() => screen.classList.remove('glitch'), 400);
}
declineBtn.addEventListener('mouseenter', fleeDecline);
declineBtn.addEventListener('click', e => { e.preventDefault(); fleeDecline(); });

acceptBtn.addEventListener('click', async () => {
  acceptBtn.disabled = true;
  acceptBtn.textContent = 'Transmitting…';
  try {
    await fetch(`${API_URL}/mission_response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeCode, response: 'accepted' }),
    });
  } catch (e) {
    console.error('Mission transmit failed:', e);
  }
  // Unlock the main wedding site (bypass the password gate) for this session.
  try {
    sessionStorage.setItem('weddingAuthenticated', 'true');
    sessionStorage.setItem('weddingTier', '1');
    sessionStorage.setItem('weddingPassword', BYPASS_PASSWORD);
    if (activeTarget) sessionStorage.setItem('groomsmanCodename', activeTarget.name);
  } catch (e) { /* sessionStorage may be unavailable */ }
  irisAndRedirect();
});

function irisAndRedirect() {
  document.getElementById('curtain').classList.add('run');
  setTimeout(() => { window.location.href = '/'; }, 1250);
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
