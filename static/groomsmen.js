// =========================================================
// OPERATION: SUIT UP — Groomsmen Portal logic
// Auth gate, dossier typing, Three.js agent, ultimatum, CRT-off.
// =========================================================

const API_URL = 'https://api.caramucci.com';

// Clearance code -> dossier. Mirrors GROOMSMEN_ROSTER in backend.py.
const ROSTER = {
  WR_Groomsmen: { name: 'Wyatt Rayner', role: 'Groomsman', intel: 'My closest friend since the 6th grade.' },
  JL_Groomsmen: { name: 'James Lange',  role: 'Groomsman', intel: 'My longest lasting friend since 4th grade.' },
  JE_BestMan:   { name: 'Jon Edwards',  role: 'Best Man',  intel: 'Brother. Priority Target.' },
  JM_Groomsmen: { name: 'Joey Moglia',  role: 'Groomsman', intel: 'One of my closest friends.' },
};

let activeCode = null;
let activeTarget = null;

// ---------- Stage helpers ----------
const stages = {
  login: document.getElementById('login'),
  briefing: document.getElementById('briefing'),
  ultimatum: document.getElementById('ultimatum'),
};
function showStage(name) {
  Object.values(stages).forEach(s => s.classList.remove('active'));
  if (stages[name]) stages[name].classList.add('active');
}

// ---------- Audio (optional ambient hum + type clicks) ----------
let audioCtx = null;
function ensureAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Low ambient room hum
    const hum = audioCtx.createOscillator();
    const humGain = audioCtx.createGain();
    hum.type = 'sine';
    hum.frequency.value = 58;
    humGain.gain.value = 0.025;
    hum.connect(humGain).connect(audioCtx.destination);
    hum.start();
  } catch (e) { /* audio not available — silent fallback */ }
}
function typeClick() {
  if (!audioCtx) return;
  try {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'square';
    o.frequency.value = 120 + Math.random() * 80;
    g.gain.setValueAtTime(0.04, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);
    o.connect(g).connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + 0.05);
  } catch (e) { /* ignore */ }
}

// ---------- LOGIN ----------
const codeInput = document.getElementById('codeInput');
const loginError = document.getElementById('loginError');
const screen = document.getElementById('screen');

function attemptLogin() {
  ensureAudio();
  const code = (codeInput.value || '').trim();
  const target = ROSTER[code];
  if (!target) {
    loginError.textContent = '> ACCESS DENIED — INVALID CLEARANCE CODE';
    screen.classList.add('glitch');
    setTimeout(() => screen.classList.remove('glitch'), 800);
    codeInput.value = '';
    return;
  }
  activeCode = code;
  activeTarget = target;
  loginError.textContent = '';
  bootSequence();
}

document.getElementById('authBtn').addEventListener('click', attemptLogin);
codeInput.addEventListener('keydown', e => { if (e.key === 'Enter') attemptLogin(); });

// ---------- BOOT -> BRIEFING ----------
function bootSequence() {
  showStage('briefing');
  initAvatar();
  populateDossier(activeTarget);
}

// Typewriter that fills a target element char-by-char.
function typeInto(el, text, speed, done) {
  el.textContent = '';
  el.classList.add('cursor-blink');
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      el.textContent += text[i++];
      if (text[i - 1] !== ' ') typeClick();
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
    { el: 'dTarget', text: target.name },
    { el: 'dRole', text: target.role.toUpperCase() },
    { el: 'dIntel', text: target.intel },
    { el: 'dBrief', text:
      'OPERATION APRIL 2027 // Secure the perimeter at the Hyatt Regency, ' +
      'Clearwater Beach. The subject is required to stand beside the principal ' +
      'on the day of operations. Dress code: black suit. Failure is not an option.' },
  ];
  let idx = 0;
  const next = () => {
    if (idx >= lines.length) {
      document.getElementById('engageBtn').style.visibility = 'visible';
      return;
    }
    const line = lines[idx++];
    typeInto(document.getElementById(line.el), line.text, line.el === 'dBrief' ? 14 : 28, next);
  };
  next();
}

// ---------- THREE.JS AGENT ----------
let renderer, scene, camera, agent, animId;
function initAvatar() {
  if (renderer) return; // build once
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

  // Gritty key + rim light
  const key = new THREE.DirectionalLight(0x9dff9d, 1.1);
  key.position.set(3, 5, 4);
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x224422, 0.6));
  const rim = new THREE.PointLight(0x39ff14, 0.6, 20);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  agent = new THREE.Group();

  const suit = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.85, metalness: 0.1 });
  const skin = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 });
  const censor = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 });
  const shirt = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.7 });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.8, 0.7), suit);
  torso.position.y = 1.0;
  agent.add(torso);

  // Shirt/tie strip
  const tie = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.05), shirt);
  tie.position.set(0, 1.05, 0.37);
  agent.add(tie);

  // Head
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.95, 0.8), skin);
  head.position.y = 2.35;
  agent.add(head);

  // Censorship bar over the eyes
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.32, 0.92), censor);
  bar.position.set(0, 2.45, 0);
  agent.add(bar);

  // Arms
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.6, 0.45), suit);
    arm.position.set(side * 0.95, 1.0, 0);
    agent.add(arm);
  });

  // Legs
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.6, 0.55), suit);
    leg.position.set(side * 0.38, -0.7, 0);
    agent.add(leg);
  });

  agent.position.y = -0.6;
  scene.add(agent);

  const onResize = () => {
    const nw = wrap.clientWidth, nh = wrap.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  };
  window.addEventListener('resize', onResize);

  const animate = () => {
    animId = requestAnimationFrame(animate);
    agent.rotation.y += 0.008; // slow continuous spin
    renderer.render(scene, camera);
  };
  animate();
}

// ---------- ULTIMATUM ----------
document.getElementById('engageBtn').addEventListener('click', () => showStage('ultimatum'));

const declineBtn = document.getElementById('declineBtn');
const acceptBtn = document.getElementById('acceptBtn');

// Decline button runs away from the cursor + glitches the screen.
function fleeDecline() {
  const maxX = Math.min(window.innerWidth / 2 - 120, 220);
  const maxY = Math.min(window.innerHeight / 2 - 120, 160);
  const x = (Math.random() * 2 - 1) * maxX;
  const y = (Math.random() * 2 - 1) * maxY;
  declineBtn.style.transform = `translate(${x}px, ${y}px)`;
  screen.classList.add('glitch');
  setTimeout(() => screen.classList.remove('glitch'), 400);
}
declineBtn.addEventListener('mouseenter', fleeDecline);
declineBtn.addEventListener('click', e => { e.preventDefault(); fleeDecline(); });

// Accept -> POST -> CRT power-off -> redirect home.
acceptBtn.addEventListener('click', async () => {
  acceptBtn.disabled = true;
  acceptBtn.textContent = 'TRANSMITTING...';
  try {
    await fetch(`${API_URL}/mission_response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: activeCode, response: 'accepted' }),
    });
  } catch (e) {
    console.error('Mission transmit failed:', e);
  }
  powerOffAndRedirect();
});

function powerOffAndRedirect() {
  const crt = document.getElementById('crtOff');
  crt.classList.add('run');
  setTimeout(() => { window.location.href = '/'; }, 1100);
}

// Start on the login stage.
showStage('login');
codeInput.focus();
