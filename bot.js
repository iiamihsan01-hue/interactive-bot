/*!
 * CuteBot — Elephant Cub Edition v2.0 — bot.js
 * Drop-in interactive widget for any webpage.
 */

(function () {
  'use strict';

  /* ─── Config ─────────────────────────────── */
  const IDLE_TIMEOUT   = 6000;   // ms idle before parking
  const PEEK_OFFSET    = 38;     // px visible when peeking at edge (keep enough for clicks)
  const WALK_SPEED     = 3.2;    // px per frame during walk
  const TRAIL_INTERVAL = 55;     // ms between particles
  const FOOTPRINT_INT  = 160;    // ms between footprints during walk

  /* ─── State ──────────────────────────────── */
  let isDragging   = false;
  let isActive     = false;
  let isPeeking    = false;
  let isWalking    = false;
  let idleTimer    = null;
  let trailTimer   = null;
  let footTimer    = null;
  let walkRAF      = null;
  let bubbleTimer  = null;
  let walkTargetX  = 0;
  let walkTargetY  = 0;
  let walkDir      = 1;     // 1 = right, -1 = left
  let dragMoved    = false;
  let touchMoved   = false;
  let peekEdge     = '';

  /* ─── Data ───────────────────────────────── */
  const idleMessages = [
    "Pssst… click me! 🐘",
    "I'm right here~ ✨",
    "Hungry for a quiz? 🧠",
    "Wanna hear a joke? 😄",
    "I'm peeking at you! 👀",
    "Pick your mood! 🌸",
    "Let's play! ✊✋✌️",
    "*trumpet noises* 🎺",
    "Don't mind me…",
    "Tap tap tap 🐾",
  ];
  const greetings = [
    "Yay, you found me! 🎉",
    "Hello, friend! 🐘💜",
    "Let's have fun! ✨",
    "I ran all the way here!",
    "Ready to play? 🥳",
  ];
  const jokes = [
    { setup:"Why don't scientists trust atoms?", punchline:"They make up everything! 😄" },
    { setup:"What do you call a fish without eyes?", punchline:"A fsh! 🐟😂" },
    { setup:"Why did the elephant sit on a marshmallow?", punchline:"To keep from falling into the hot chocolate! 🍫" },
    { setup:"What do you call a sleeping dinosaur?", punchline:"A dino-snore! 🦕😴" },
    { setup:"What's an elephant's favorite vegetable?", punchline:"Squash! 🐘💥" },
    { setup:"Why can't you trust stairs?", punchline:"Always up to something! 🪜" },
    { setup:"What do you call an elephant in a phone booth?", punchline:"Stuck! 😂" },
    { setup:"What's a computer's favorite snack?", punchline:"Microchips! 🍟" },
  ];
  const trivia = [
    { q:"🌍 Which planet is closest to the Sun?", opts:["Venus","Mercury","Mars","Earth"], a:1 },
    { q:"🐘 What is a group of elephants called?", opts:["Herd","Pod","Pack","Flock"], a:0 },
    { q:"🕐 How many hours in a day?", opts:["12","36","48","24"], a:3 },
    { q:"🌙 How many moons does Earth have?", opts:["2","0","1","3"], a:2 },
    { q:"🐘 Elephants are afraid of…", opts:["Water","Mice (myth!)","Bees","Nothing"], a:2 },
    { q:"🎵 How many notes in a musical scale?", opts:["5","7","8","12"], a:1 },
    { q:"🦋 What is a caterpillar's final form?", opts:["Moth","Butterfly","Bee","Dragonfly"], a:1 },
  ];
  const moodResponses = {
    "😄":["Yay! Happy friends! 🎉","Your smile charges me up! ⚡"],
    "😢":["Aww, trunk hugs! 🫂","Here's a virtual hug 🐘💜"],
    "😡":["Take a deep breath… 🌿","I'll fan you with my ears!"],
    "😴":["Rest well, friend~ 🌙","Nap time? I'll keep watch! 👀"],
    "🤩":["SAME ENERGY! ✨🚀","You're on fire! 🔥"],
  };

  /* ─── SVG Elephant ───────────────────────── */
  function elephantSVG () {
    return `
<svg id="eleph-svg" viewBox="0 0 100 110" xmlns="http://www.w3.org/2000/svg"
     style="width:100%;height:100%;overflow:visible;">
  <defs>
    <radialGradient id="bodyGrad" cx="42%" cy="40%" r="56%">
      <stop offset="0%" stop-color="#e8e2f7"/>
      <stop offset="100%" stop-color="#c4b9e0"/>
    </radialGradient>
    <radialGradient id="earGrad" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#ddd5f5"/>
      <stop offset="100%" stop-color="#b8aad8"/>
    </radialGradient>
    <radialGradient id="innerEarGrad" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#f5c9d8"/>
      <stop offset="100%" stop-color="#e8a8be"/>
    </radialGradient>
    <filter id="softShadow" x="-10%" y="0%" width="120%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#9b8ec4" flood-opacity="0.20"/>
    </filter>
  </defs>

  <!-- Shadow under body -->
  <ellipse cx="50" cy="108" rx="26" ry="5" fill="#c4b9e0" opacity="0.25"/>

  <!-- ── Ears ── -->
  <g id="eleph-ear-r">
    <ellipse cx="74" cy="44" rx="14" ry="18" fill="url(#earGrad)" filter="url(#softShadow)"/>
    <ellipse cx="73" cy="45" rx="9" ry="12" fill="url(#innerEarGrad)" opacity="0.7"/>
  </g>
  <g id="eleph-ear-l">
    <ellipse cx="26" cy="44" rx="14" ry="18" fill="url(#earGrad)" filter="url(#softShadow)"/>
    <ellipse cx="27" cy="45" rx="9" ry="12" fill="url(#innerEarGrad)" opacity="0.7"/>
  </g>

  <!-- ── Body ── -->
  <ellipse cx="50" cy="72" rx="27" ry="28" fill="url(#bodyGrad)" filter="url(#softShadow)"/>

  <!-- ── Head ── -->
  <ellipse cx="50" cy="44" rx="26" ry="24" fill="url(#bodyGrad)" filter="url(#softShadow)"/>

  <!-- ── Trunk ── -->
  <g id="eleph-trunk">
    <path d="M 41 60 Q 35 70 36 80 Q 37 88 43 88 Q 49 88 48 80"
          stroke="#c4b9e0" stroke-width="7" fill="none" stroke-linecap="round"
          stroke-linejoin="round"/>
    <path d="M 41 60 Q 35 70 36 80 Q 37 88 43 88 Q 49 88 48 80"
          stroke="#d4cfe8" stroke-width="4.5" fill="none" stroke-linecap="round"
          stroke-linejoin="round" opacity="0.7"/>
    <!-- Trunk tip -->
    <circle cx="48" cy="80" r="4" fill="#c4b9e0"/>
    <!-- Nostril -->
    <circle cx="47" cy="79.5" r="1.3" fill="#9b8ec4" opacity="0.5"/>
  </g>

  <!-- ── Tusk (tiny cute) ── -->
  <path d="M 42 60 Q 38 64 39 68" stroke="#f0ece8" stroke-width="2.5"
        fill="none" stroke-linecap="round" opacity="0.9"/>

  <!-- ── Eyes ── -->
  <g id="eleph-eye-l">
    <ellipse cx="39" cy="41" rx="5" ry="5.5" fill="white"/>
    <ellipse cx="39.5" cy="41.5" rx="3" ry="3.5" fill="#3d3250"/>
    <ellipse cx="40.8" cy="40" rx="1.1" ry="1.1" fill="white" opacity="0.8"/>
    <!-- Lashes -->
    <line x1="36" y1="37.5" x2="34.5" y2="36" stroke="#9b8ec4" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="38" y1="36.5" x2="38" y2="35" stroke="#9b8ec4" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="40" y1="36.5" x2="40.8" y2="35.2" stroke="#9b8ec4" stroke-width="0.8" stroke-linecap="round"/>
  </g>
  <g id="eleph-eye-r">
    <ellipse cx="61" cy="41" rx="5" ry="5.5" fill="white"/>
    <ellipse cx="61.5" cy="41.5" rx="3" ry="3.5" fill="#3d3250"/>
    <ellipse cx="62.8" cy="40" rx="1.1" ry="1.1" fill="white" opacity="0.8"/>
    <!-- Lashes -->
    <line x1="64" y1="37.5" x2="65.5" y2="36" stroke="#9b8ec4" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="62" y1="36.5" x2="62" y2="35" stroke="#9b8ec4" stroke-width="0.8" stroke-linecap="round"/>
    <line x1="60" y1="36.5" x2="59.2" y2="35.2" stroke="#9b8ec4" stroke-width="0.8" stroke-linecap="round"/>
  </g>

  <!-- ── Blush cheeks ── -->
  <ellipse cx="34" cy="48" rx="5.5" ry="3.5" fill="#f0b8c8" opacity="0.45"/>
  <ellipse cx="66" cy="48" rx="5.5" ry="3.5" fill="#f0b8c8" opacity="0.45"/>

  <!-- ── Mouth (smile) ── -->
  <path d="M 44 54 Q 50 58 56 54" stroke="#9b8ec4" stroke-width="1.8"
        fill="none" stroke-linecap="round" opacity="0.8"/>

  <!-- ── Legs ── -->
  <g id="eleph-leg-fl">
    <rect x="37" y="92" rx="5" ry="5" width="10" height="16" fill="url(#bodyGrad)"/>
    <ellipse cx="42" cy="108" rx="5.5" ry="2.5" fill="#c4b9e0"/>
  </g>
  <g id="eleph-leg-fr">
    <rect x="53" y="92" rx="5" ry="5" width="10" height="16" fill="url(#bodyGrad)"/>
    <ellipse cx="58" cy="108" rx="5.5" ry="2.5" fill="#c4b9e0"/>
  </g>
  <g id="eleph-leg-bl">
    <rect x="33" y="88" rx="5" ry="5" width="10" height="14" fill="#cfc8e8"/>
    <ellipse cx="38" cy="102" rx="5" ry="2.2" fill="#b8aad8"/>
  </g>
  <g id="eleph-leg-br">
    <rect x="57" y="88" rx="5" ry="5" width="10" height="14" fill="#cfc8e8"/>
    <ellipse cx="62" cy="102" rx="5" ry="2.2" fill="#b8aad8"/>
  </g>

  <!-- ── Tail ── -->
  <path d="M 76 68 Q 84 62 82 72 Q 80 78 76 76" stroke="#c4b9e0" stroke-width="2.5"
        fill="none" stroke-linecap="round"/>
  <circle cx="76" cy="76" r="3" fill="#d4cfe8"/>
</svg>`;
  }

  /* ─── Panel HTML ─────────────────────────── */
  function buildPanel () {
    return `
      <button id="bot-close" aria-label="Close">✕</button>
      <h3>🐘 Ellie's Playground</h3>
      <div class="game-tabs">
        <button class="game-tab active" data-tab="rps">✊ RPS</button>
        <button class="game-tab" data-tab="trivia">🧠 Trivia</button>
        <button class="game-tab" data-tab="joke">😂 Jokes</button>
        <button class="game-tab" data-tab="mood">🌸 Mood</button>
      </div>
      <div class="game-section active" id="tab-rps">
        <p style="text-align:center;font-size:13px;color:#9b8ec4;margin:0 0 10px;font-weight:500">Pick your move!</p>
        <div class="rps-choices">
          <button class="rps-btn" data-rps="rock">✊</button>
          <button class="rps-btn" data-rps="paper">✋</button>
          <button class="rps-btn" data-rps="scissors">✌️</button>
        </div>
        <div class="rps-result" id="rps-result">Choose to start!</div>
      </div>
      <div class="game-section" id="tab-trivia">
        <div class="quiz-q" id="quiz-q"></div>
        <div class="quiz-options" id="quiz-opts"></div>
        <div class="rps-result" id="quiz-result"></div>
      </div>
      <div class="game-section" id="tab-joke">
        <div class="joke-text" id="joke-text">Ready for a joke? 🎭</div>
        <button class="joke-btn" id="joke-btn">Tell me a joke!</button>
      </div>
      <div class="game-section" id="tab-mood">
        <p style="text-align:center;font-size:13px;color:#9b8ec4;margin:0 0 12px;font-weight:500">How are you feeling?</p>
        <div class="mood-row">
          <button class="mood-btn" data-mood="😄">😄</button>
          <button class="mood-btn" data-mood="😢">😢</button>
          <button class="mood-btn" data-mood="😡">😡</button>
          <button class="mood-btn" data-mood="😴">😴</button>
          <button class="mood-btn" data-mood="🤩">🤩</button>
        </div>
        <div class="mood-response" id="mood-resp"></div>
      </div>`;
  }

  /* ─── Build DOM ──────────────────────────── */
  function injectFont () {
    if (document.getElementById('ellie-font')) return;
    const l = document.createElement('link');
    l.id = 'ellie-font';
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Serif+Display&display=swap';
    document.head.appendChild(l);
  }

  function build () {
    injectFont();
    const bot = document.createElement('div');
    bot.id = 'cute-bot';
    bot.setAttribute('aria-label', 'Ellie the Elephant Bot — click to play!');
    bot.innerHTML = `
      <div id="bot-svg-wrap">${elephantSVG()}</div>
      <div id="bot-bubble"></div>`;

    const panel = document.createElement('div');
    panel.id = 'bot-game';
    panel.innerHTML = buildPanel();

    document.body.appendChild(bot);
    document.body.appendChild(panel);
    return { bot, panel };
  }

  /* ─── Helpers ────────────────────────────── */
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  function botSize () {
    const bot = document.getElementById('cute-bot');
    return { w: bot.offsetWidth, h: bot.offsetHeight };
  }

  function showBubble (text, dur = 3200) {
    const b = document.getElementById('bot-bubble');
    if (!b) return;
    clearTimeout(bubbleTimer);
    b.textContent = text;
    b.classList.add('visible');
    if (dur > 0) bubbleTimer = setTimeout(() => b.classList.remove('visible'), dur);
  }
  function hideBubble () {
    clearTimeout(bubbleTimer);
    document.getElementById('bot-bubble')?.classList.remove('visible');
  }

  function spawnParticle (x, y) {
    const p = document.createElement('div');
    p.className = 'bot-particle';
    const sz = 4 + Math.random() * 6;
    const cols = ['#d4cfe8','#f0b8c8','#c4b9e0','#e8e2f7','#9b8ec4'];
    p.style.cssText = `left:${x}px;top:${y}px;width:${sz}px;height:${sz}px;background:${rand(cols)};opacity:0.7;`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }

  function spawnFootprint (x, y, dir) {
    const f = document.createElement('div');
    f.className = 'bot-footprint';
    f.textContent = dir > 0 ? '🐾' : '🐾';
    f.style.cssText = `left:${x - 6}px;top:${y + 2}px;transform:scaleX(${dir})`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1400);
  }

  /* ─── Eye tracking ──────────────────────── */
  function trackEyes (bot, mx, my) {
    const pupils = bot.querySelectorAll('#eleph-eye-l ellipse:nth-child(2), #eleph-eye-r ellipse:nth-child(2)');
    const rect   = bot.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2;
    const cy     = rect.top  + rect.height / 2;
    const angle  = Math.atan2(my - cy, mx - cx);
    const dist   = Math.min(1.5, Math.hypot(mx - cx, my - cy) * 0.04);
    const dx     = Math.cos(angle) * dist;
    const dy     = Math.sin(angle) * dist;
    pupils.forEach(p => { p.style.transform = `translate(${dx}px, ${dy}px)`; });
  }

  /* ─── Idle timer ────────────────────────── */
  function resetIdleTimer (bot) {
    clearTimeout(idleTimer);
    if (isActive || isWalking || isPeeking) return;
    bot.classList.remove('idle');
    idleTimer = setTimeout(() => startPeek(bot), IDLE_TIMEOUT);
  }

  /* ─── PEEK behavior ─────────────────────── */
  function startPeek (bot) {
    if (isActive || isWalking || isDragging) return;
    isPeeking = true;
    const W = window.innerWidth;
    const H  = window.innerHeight;
    const { w, h } = botSize();

    // Find nearest edge
    const bx = parseFloat(bot.style.left) || 0;
    const by = parseFloat(bot.style.top)  || 0;
    const distL = bx;
    const distR = W - bx - w;
    const distT = by;
    const distB = H - by - h;
    const minD  = Math.min(distL, distR, distT, distB);

    bot.classList.remove('idle');

    // Smooth glide to peek position
    bot.style.transition = `left 0.9s cubic-bezier(.23,1,.32,1), top 0.9s cubic-bezier(.23,1,.32,1)`;

    if (minD === distL) {
      peekEdge = 'left';
      // Flip elephant to face right (into screen)
      bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(1)';
      bot.style.left = `${-w + PEEK_OFFSET}px`;
      bot.style.top  = `${Math.max(0, Math.min(H - h, by))}px`;
    } else if (minD === distR) {
      peekEdge = 'right';
      // Flip to face left
      bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(-1)';
      bot.style.left = `${W - PEEK_OFFSET}px`;
      bot.style.top  = `${Math.max(0, Math.min(H - h, by))}px`;
    } else if (minD === distT) {
      peekEdge = 'top';
      bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(1)';
      bot.style.top  = `${-h + PEEK_OFFSET}px`;
      bot.style.left = `${Math.max(0, Math.min(W - w, bx))}px`;
    } else {
      peekEdge = 'bottom';
      bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(1)';
      bot.style.top  = `${H - PEEK_OFFSET}px`;
      bot.style.left = `${Math.max(0, Math.min(W - w, bx))}px`;
    }

    setTimeout(() => {
      bot.style.transition = '';
      bot.classList.add(`peek-${peekEdge}`);
    }, 950);

    showBubble(rand(idleMessages), 4500);
  }

  function unpeek (bot) {
    isPeeking = false;
    peekEdge  = '';
    bot.classList.remove('peek-left','peek-right','peek-top','peek-bottom');
    bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(1)';
    hideBubble();
  }

  /* ─── WALK to center ────────────────────── */
  function startWalk (bot, panel) {
    if (isWalking) return;
    isActive  = false;
    isWalking = true;
    unpeek(bot);
    clearTimeout(idleTimer);

    bot.classList.remove('idle','active');
    bot.classList.add('walking');

    const W  = window.innerWidth;
    const H  = window.innerHeight;
    const { w, h } = botSize();

    walkTargetX = (W - w) / 2;
    walkTargetY = H * 0.28;

    const curX = parseFloat(bot.style.left) || 0;
    walkDir = walkTargetX > curX ? 1 : -1;
    bot.querySelector('#bot-svg-wrap').style.transform = `scaleX(${walkDir})`;

    // Footprints
    footTimer = setInterval(() => {
      const r = bot.getBoundingClientRect();
      spawnFootprint(r.left + w / 2, r.bottom - 10, walkDir);
    }, FOOTPRINT_INT);

    // Particle trail while walking
    trailTimer = setInterval(() => {
      const r = bot.getBoundingClientRect();
      spawnParticle(r.left + w / 2, r.top + h / 2);
    }, TRAIL_INTERVAL);

    function step () {
      const cx = parseFloat(bot.style.left) || 0;
      const cy = parseFloat(bot.style.top)  || 0;
      const dx = walkTargetX - cx;
      const dy = walkTargetY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < WALK_SPEED + 1) {
        // Arrived!
        bot.style.left = `${walkTargetX}px`;
        bot.style.top  = `${walkTargetY}px`;
        finishWalk(bot, panel);
        return;
      }

      const nx = cx + (dx / dist) * WALK_SPEED;
      const ny = cy + (dy / dist) * WALK_SPEED;
      bot.style.left = `${nx}px`;
      bot.style.top  = `${ny}px`;

      // Keep facing direction of horizontal movement
      if (Math.abs(dx) > 2) {
        walkDir = dx > 0 ? 1 : -1;
        bot.querySelector('#bot-svg-wrap').style.transform = `scaleX(${walkDir})`;
      }

      walkRAF = requestAnimationFrame(step);
    }
    walkRAF = requestAnimationFrame(step);
  }

  function finishWalk (bot, panel) {
    isWalking = false;
    isActive  = true;
    clearInterval(trailTimer);
    clearInterval(footTimer);
    bot.classList.remove('walking');
    bot.classList.add('active');
    // Face forward
    bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(1)';

    panel.classList.add('open');
    showBubble(rand(greetings), 2500);
    loadTrivia();
  }

  /* ─── Deactivate ────────────────────────── */
  function deactivate (bot, panel) {
    isActive = false;
    bot.classList.remove('active');
    panel.classList.remove('open');
    hideBubble();
    bot.classList.add('idle');
    resetIdleTimer(bot);
  }

  /* ─── Drag ──────────────────────────────── */
  function startDrag (e, bot) {
    if (isWalking) { cancelAnimationFrame(walkRAF); isWalking = false; clearInterval(trailTimer); clearInterval(footTimer); }
    isDragging = true;
    dragMoved  = false;
    unpeek(bot);
    bot.classList.add('dragging');
    bot.classList.remove('idle','walking','active');
    bot.style.transition = '';

    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    bot._dragOX = cx - parseFloat(bot.style.left || 0);
    bot._dragOY = cy - parseFloat(bot.style.top  || 0);

    trailTimer = setInterval(() => {
      const r = bot.getBoundingClientRect();
      spawnParticle(r.left + r.width / 2, r.top + r.height / 2);
    }, TRAIL_INTERVAL);
  }

  function doDrag (e, bot) {
    if (!isDragging) return;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    const W  = window.innerWidth;
    const H  = window.innerHeight;
    const { w, h } = botSize();
    let nx = cx - bot._dragOX;
    let ny = cy - bot._dragOY;
    nx = Math.max(0, Math.min(W - w, nx));
    ny = Math.max(0, Math.min(H - h, ny));
    bot.style.left = `${nx}px`;
    bot.style.top  = `${ny}px`;
    dragMoved = true;
  }

  function endDrag (bot) {
    if (!isDragging) return;
    isDragging = false;
    clearInterval(trailTimer);
    bot.classList.remove('dragging');
    bot.querySelector('#bot-svg-wrap').style.transform = 'scaleX(1)';
    if (!isActive) {
      bot.classList.add('idle');
      resetIdleTimer(bot);
    }
  }

  /* ─── Mini-games ────────────────────────── */
  function setupRPS () {
    const result = document.getElementById('rps-result');
    document.querySelectorAll('.rps-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ch = ['rock','paper','scissors'];
        const em = { rock:'✊', paper:'✋', scissors:'✌️' };
        const u  = btn.dataset.rps;
        const b  = rand(ch);
        let msg;
        if (u === b) msg = `Tie! We both chose ${em[u]} 🤝`;
        else if ((u==='rock'&&b==='scissors')||(u==='paper'&&b==='rock')||(u==='scissors'&&b==='paper'))
          msg = `You win! ${em[u]} beats ${em[b]} 🎉`;
        else msg = `Ellie wins! ${em[b]} beats ${em[u]} 😏`;
        result.textContent = `Bot: ${em[b]} — ${msg}`;
        showBubble(msg.split('!')[0]+'!', 2000);
      });
    });
  }

  function loadTrivia () {
    const q = rand(trivia);
    const qEl = document.getElementById('quiz-q');
    const oEl = document.getElementById('quiz-opts');
    const rEl = document.getElementById('quiz-result');
    if (!qEl) return;
    qEl.textContent = q.q;
    rEl.textContent = '';
    oEl.innerHTML   = '';
    q.opts.forEach((opt, i) => {
      const b = document.createElement('button');
      b.className   = 'quiz-opt';
      b.textContent = opt;
      b.addEventListener('click', function () {
        document.querySelectorAll('.quiz-opt').forEach(x => x.disabled = true);
        if (i === q.a) { b.classList.add('correct'); rEl.textContent = '✅ Correct!'; }
        else { b.classList.add('wrong'); document.querySelectorAll('.quiz-opt')[q.a].classList.add('correct'); rEl.textContent = `❌ Right answer: "${q.opts[q.a]}"`; }
        setTimeout(loadTrivia, 2100);
      });
      oEl.appendChild(b);
    });
  }

  function setupJokes () {
    const textEl = document.getElementById('joke-text');
    const btnEl  = document.getElementById('joke-btn');
    if (!textEl || !btnEl) return;
    let cur = rand(jokes);
    let state = 'setup';
    textEl.textContent = cur.setup;
    btnEl.textContent  = 'Tell me the punchline!';
    // Fresh listener (clone to remove old)
    const fresh = btnEl.cloneNode(true);
    btnEl.parentNode.replaceChild(fresh, btnEl);
    fresh.addEventListener('click', () => {
      if (state === 'setup') {
        textEl.textContent = cur.punchline;
        fresh.textContent  = 'Next joke ➡️';
        state = 'next';
      } else {
        cur = rand(jokes);
        textEl.textContent = cur.setup;
        fresh.textContent  = 'Tell me the punchline!';
        state = 'setup';
      }
    });
  }

  function setupMood () {
    const resp = document.getElementById('mood-resp');
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const r = rand(moodResponses[btn.dataset.mood] || ['Thanks! 💜']);
        if (resp) resp.textContent = r;
        showBubble(r, 3000);
      });
    });
  }

  function setupTabs () {
    document.querySelectorAll('.game-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`)?.classList.add('active');
        if (tab.dataset.tab === 'trivia') loadTrivia();
        if (tab.dataset.tab === 'joke')   setupJokes();
      });
    });
  }

  /* ─── Init ──────────────────────────────── */
  function init () {
    const { bot, panel } = build();

    // Start position: bottom-right corner
    const W = window.innerWidth;
    const H = window.innerHeight;
    const { w, h } = botSize();
    bot.style.left = `${W - w - 24}px`;
    bot.style.top  = `${H - h - 24}px`;
    bot.classList.add('idle');

    /* ── Drag (mouse) ── */
    bot.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag(e, bot);
    });
    document.addEventListener('mousemove', e => {
      doDrag(e, bot);
      trackEyes(bot, e.clientX, e.clientY);
    });
    document.addEventListener('mouseup', () => endDrag(bot));

    /* ── Touch ── */
    bot.addEventListener('touchstart', e => { touchMoved = false; startDrag(e, bot); }, { passive: true });
    document.addEventListener('touchmove', e => {
      touchMoved = true;
      doDrag(e, bot);
      if (e.touches[0]) trackEyes(bot, e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    document.addEventListener('touchend', () => endDrag(bot));

    /* ── Click = walk to center ── */
    bot.addEventListener('mouseup', () => {
      if (dragMoved) return;
      if (isActive) deactivate(bot, panel);
      else startWalk(bot, panel);
    });
    bot.addEventListener('touchend', () => {
      if (touchMoved) return;
      if (isActive) deactivate(bot, panel);
      else startWalk(bot, panel);
    });

    /* ── Panel close ── */
    document.addEventListener('click', e => {
      if (e.target.id === 'bot-close') deactivate(bot, panel);
    });

    /* ── Hover bubble ── */
    bot.addEventListener('mouseenter', () => {
      if (!isActive && !isWalking) showBubble('👋 Hi! Click me!', 2000);
    });
    bot.addEventListener('mouseleave', () => {
      if (!isActive) hideBubble();
    });

    /* ── User activity un-peeks ── */
    ['mousemove','keydown','scroll','click','touchstart'].forEach(ev => {
      document.addEventListener(ev, () => {
        if (isDragging || isActive || isWalking) return;
        if (isPeeking) { unpeek(bot); bot.classList.add('idle'); }
        resetIdleTimer(bot);
      }, { passive: true });
    });

    /* ── Window resize ── */
    window.addEventListener('resize', () => {
      const nW = window.innerWidth;
      const nH = window.innerHeight;
      let bx = parseFloat(bot.style.left) || 0;
      let by = parseFloat(bot.style.top)  || 0;
      bx = Math.min(bx, nW - w);
      by = Math.min(by, nH - h);
      bot.style.left = `${bx}px`;
      bot.style.top  = `${by}px`;
    });

    /* ── Games ── */
    setupRPS();
    setupTabs();
    setupJokes();
    setupMood();
    loadTrivia();

    /* ── Idle timer start ── */
    resetIdleTimer(bot);

    console.log('%c🐘 Ellie is here! Click her to play.','color:#9b8ec4;font-weight:bold;font-size:14px');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
