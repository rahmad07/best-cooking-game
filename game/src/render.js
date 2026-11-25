// Sizzle & Serve — the DOM renderer. Builds the kitchen once, then repaints
// it every frame from the world state. Everything the judge sees — the HUD,
// the order board, the stations, the plate, the menu and the feed — is DOM,
// so every screenshot stays crisp and readable.

import {
  DISHES,
  GRILL_PERFECT_FROM,
  GRILL_PERFECT_TO,
  INGREDIENTS,
  PREPPED_LABEL,
} from './config.js';
import { SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const CUSTOMER_COLORS = ['#e8a87c', '#c98d5f', '#f0c297', '#b9794f', '#e5b88f', '#d19a6b'];

function moodOf(customer) {
  const frac = customer.patience / customer.maxPatience;
  if (frac > 0.6) return 'happy';
  if (frac > 0.3) return 'ok';
  if (frac > 0.15) return 'impatient';
  return 'angry';
}

function patienceClass(customer) {
  const frac = customer.patience / customer.maxPatience;
  if (frac > 0.5) return 'good';
  if (frac > 0.25) return 'warn';
  return 'bad';
}

// A little food glyph: a coloured CSS shape plus a readable label.
export function foodChip(item, perfect) {
  const label = PREPPED_LABEL[item] || (INGREDIENTS[item] ? INGREDIENTS[item].label : item);
  const color = (INGREDIENTS[item] || {}).color || '#c9a86a';
  const shape = (INGREDIENTS[item] || {}).shape || 'round';
  return `<span class="chip${perfect ? ' perfect' : ''}" title="${label}">`
    + `<span class="shape shape-${shape}" style="background:${color}"></span>`
    + `<span class="chip-label">${label}${perfect ? ' ★' : ''}</span></span>`;
}

export function createRenderer(root, hooks) {
  root.innerHTML = `
  <div id="hud">
    <div class="brand">🍳 SIZZLE &amp; SERVE <span class="sub">Rush Hour Kitchen</span></div>
    <div class="stat"><span class="k">DAY</span><span class="v" id="hud-day">1</span></div>
    <div class="stat"><span class="k">TIME</span><span class="v" id="hud-time">2:00</span></div>
    <div class="stat"><span class="k">SCORE</span><span class="v" id="hud-score">0</span></div>
    <div class="stat"><span class="k">COINS</span><span class="v" id="hud-coins">$0</span></div>
    <div class="stat"><span class="k">COMBO</span><span class="v" id="hud-combo">x1.0</span></div>
    <div class="stat"><span class="k">SERVED</span><span class="v" id="hud-served">0</span></div>
    <div class="stat"><span class="k">PERFECT</span><span class="v" id="hud-perfect">0</span></div>
    <div class="stat lives"><span class="k">LIVES</span><span class="v" id="hud-lives">♥♥♥</span></div>
    <div class="hud-btns">
      <button id="btn-pause" title="Pause (P)">⏸</button>
      <button id="btn-sound" title="Sound (M)">♪</button>
      <button id="btn-restart" title="Restart (R)">↻</button>
    </div>
  </div>
  <div id="rush-banner">⚡ RUSH HOUR — 1.5x POINTS! ⚡</div>
  <div id="orders"><div class="section-title">ORDER BOARD — click a glowing customer to serve</div><div id="order-cards"></div></div>
  <div id="kitchen">
    <div id="bins"><div class="section-title">INGREDIENTS — click a bin to send it to its station</div><div id="bin-row"></div></div>
    <div id="stations">
      <div class="station" id="st-board"><div class="st-name">🔪 CHOPPING BOARD</div><div class="st-slot"></div><div class="st-bar"><div class="st-fill"></div></div><div class="st-status">Empty</div></div>
      <div class="station" id="st-grill"><div class="st-name">🔥 GRILL</div><div class="st-slot"></div><div class="st-bar grill-bar"><div class="st-perfect"></div><div class="st-fill"></div></div><div class="st-status">Empty</div></div>
      <div class="station" id="st-fryer"><div class="st-name">🍟 FRYER</div><div class="st-slot"></div><div class="st-bar"><div class="st-fill"></div></div><div class="st-status">Empty</div></div>
      <div class="station" id="st-shelf"><div class="st-name">✅ READY SHELF — click to plate</div><div class="st-slot shelf"></div><div class="st-status">Nothing ready yet</div></div>
      <div class="station plate-station" id="st-plate"><div class="st-name">🍽 PLATE — build the dish here</div><div class="st-slot plate"></div><div class="st-status"><button id="btn-clear">Clear plate</button></div></div>
    </div>
  </div>
  <div id="bottom">
    <div id="menu"><div class="section-title">MENU — recipes &amp; prices</div><div id="menu-cards"></div></div>
    <div id="side">
      <div id="feed"><div class="section-title">KITCHEN FEED</div><div id="feed-lines"></div></div>
      <div id="help">HOW TO PLAY: 1) Click a bin — it goes to its station. 2) Grill: click the grill inside the <b>green zone</b> for PERFECT. 3) Click ready items to plate them. 4) When the plate matches an order, click the glowing customer to SERVE. Keys: 1–7 bins · G grill · S serve · P pause · R restart</div>
    </div>
  </div>
  <div class="overlay" id="ov-title"><div class="panel">
    <h1>🍳 SIZZLE &amp; SERVE</h1>
    <h2>Rush Hour Kitchen</h2>
    <p class="tag">Chop it. Grill it. Serve it — before they walk out.</p>
    <div class="rules">
      <div><b>1 · PREP</b> Click ingredient bins. Lettuce &amp; tomato go to the board, patties &amp; steak to the grill, potatoes to the fryer.</div>
      <div><b>2 · PERFECT</b> Collect the grill inside the green zone for a PERFECT piece (+15 pts). Too long and it burns!</div>
      <div><b>3 · PLATE</b> Click ready items to build the dish on the plate. Match the customer's order exactly.</div>
      <div><b>4 · SERVE</b> Click a glowing customer to serve. Fast serves pay patience bonuses; serves in a row build your COMBO.</div>
      <div><b>⚠</b> A customer whose patience runs out leaves angry — and costs a life. Three lives, two-minute shifts, then the next day gets faster.</div>
    </div>
    <button class="big" id="btn-start">▶ START SHIFT</button>
    <div class="best">BEST SCORE: <span id="title-best">0</span></div>
  </div></div>
  <div class="overlay hidden" id="ov-day"><div class="panel">
    <h1 id="day-title">DAY 1 COMPLETE!</h1>
    <div class="stats" id="day-stats"></div>
    <button class="big" id="btn-next">▶ NEXT DAY</button>
  </div></div>
  <div class="overlay hidden" id="ov-over"><div class="panel">
    <h1>GAME OVER</h1>
    <p class="tag">The kitchen is closed — for now.</p>
    <div class="stats" id="over-stats"></div>
    <button class="big" id="btn-again">↻ PLAY AGAIN</button>
  </div></div>
  <div class="overlay hidden" id="ov-paused"><div class="panel">
    <h1>PAUSED</h1>
    <p class="tag">The orders can wait. Barely.</p>
    <button class="big" id="btn-resume">▶ RESUME</button>
  </div></div>
  <p id="status" role="status" aria-live="polite"></p>`;

  const $ = (id) => root.querySelector(`#${id}`);

  // Ingredient bins, one button per ingredient.
  const binRow = $('bin-row');
  for (const [key, ing] of Object.entries(INGREDIENTS)) {
    const b = document.createElement('button');
    b.className = 'bin';
    b.dataset.kind = key;
    b.innerHTML = `<span class="shape shape-${ing.shape}" style="background:${ing.color}"></span><span class="bin-label">${ing.label}</span><span class="bin-station">${ing.station === 'plate' ? '→ plate' : '→ ' + ing.station}</span>`;
    b.addEventListener('click', () => hooks.onBin(key));
    binRow.appendChild(b);
  }

  // Menu cards.
  const menuCards = $('menu-cards');
  for (const [key, dish] of Object.entries(DISHES)) {
    const card = document.createElement('div');
    card.className = 'menu-card';
    card.innerHTML = `<div class="menu-name">${dish.name} <span class="menu-price">$${dish.price} · ${dish.points} pts</span></div>`
      + `<div class="menu-comps">${dish.components.map((c) => foodChip(c, false)).join('')}</div>`
      + `<div class="menu-blurb">${dish.blurb}</div>`;
    menuCards.appendChild(card);
  }

  $('btn-start').addEventListener('click', () => hooks.onStart());
  $('btn-next').addEventListener('click', () => hooks.onNextDay());
  $('btn-again').addEventListener('click', () => hooks.onRestart());
  $('btn-resume').addEventListener('click', () => hooks.onPause());
  $('btn-pause').addEventListener('click', () => hooks.onPause());
  $('btn-restart').addEventListener('click', () => hooks.onRestart());
  $('btn-sound').addEventListener('click', () => hooks.onSound());
  $('btn-clear').addEventListener('click', () => hooks.onClearPlate());
  $('st-grill').addEventListener('click', () => hooks.onGrill());

  let lastCustomerSig = '';
  let lastShelfSig = '';
  let lastPlateSig = '';
  let lastFeedSig = '';

  function fmtTime(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function drawStation(el, slot, opts) {
    const slotEl = el.querySelector('.st-slot');
    const fillEl = el.querySelector('.st-fill');
    const statusEl = el.querySelector('.st-status');
    const perfectEl = el.querySelector('.st-perfect');
    if (perfectEl) {
      perfectEl.style.left = `${GRILL_PERFECT_FROM * 100}%`;
      perfectEl.style.width = `${(GRILL_PERFECT_TO - GRILL_PERFECT_FROM) * 100}%`;
      // The green band only means something while something is on the grill.
      perfectEl.style.display = slot.kind ? 'block' : 'none';
    }
    if (!slot.kind) {
      slotEl.innerHTML = '<span class="empty">—</span>';
      if (fillEl) fillEl.style.width = '0%';
      if (statusEl && !el.id.includes('shelf') && !el.id.includes('plate')) statusEl.textContent = 'Empty';
      el.classList.remove('busy', 'ready', 'burnt');
      return;
    }
    const frac = slot.progress / slot.dur;
    const ing = INGREDIENTS[slot.kind];
    slotEl.innerHTML = `<span class="shape shape-${ing.shape} big" style="background:${ing.color}"></span><span class="slot-label">${ing.label}</span>`;
    if (fillEl) fillEl.style.width = `${Math.min(100, frac * 100)}%`;
    el.classList.add('busy');
    if (opts && opts.isGrill) {
      if (slot.burnt) {
        el.classList.add('burnt');
        statusEl.textContent = 'BURNT! Trashing…';
      } else if (frac >= GRILL_PERFECT_FROM && frac <= GRILL_PERFECT_TO) {
        el.classList.add('ready');
        statusEl.textContent = '★ PERFECT ZONE — CLICK TO COLLECT! ★';
      } else if (frac >= 0.5) {
        el.classList.add('ready');
        statusEl.textContent = 'Ready — click to collect';
      } else {
        statusEl.textContent = 'Cooking… wait for green';
      }
    } else {
      statusEl.textContent = `${opts && opts.verb ? opts.verb : 'Working'}… ${Math.round(frac * 100)}%`;
    }
  }

  function draw(state, screen, best) {
    $('hud-day').textContent = state.day;
    $('hud-time').textContent = fmtTime(state.timeLeft);
    $('hud-time').classList.toggle('urgent', state.timeLeft <= 30 && screen === SCREEN_PLAY);
    $('hud-score').textContent = state.score;
    $('hud-coins').textContent = `$${state.coins}`;
    $('hud-combo').textContent = `x${(1 + 0.2 * Math.min(state.combo, 10)).toFixed(1)}`;
    $('hud-served').textContent = state.served;
    $('hud-perfect').textContent = state.perfects;
    $('hud-lives').textContent = '♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 3 - state.lives));
    $('hud-lives').classList.toggle('low', state.lives === 1);
    $('btn-sound').textContent = state.muted ? '✕' : '♪';
    $('rush-banner').classList.toggle('on', state.rush.active && screen === SCREEN_PLAY);

    // Order board.
    const sig = state.customers.map((c) => `${c.id}:${c.dish}:${c.state}:${Math.round(c.patience)}`).join('|') + '|' + state.plate.map((p) => p.item).join(',');
    if (sig !== lastCustomerSig) {
      lastCustomerSig = sig;
      const cards = $('order-cards');
      cards.innerHTML = '';
      if (state.customers.length === 0 && screen === SCREEN_PLAY) {
        cards.innerHTML = '<div class="no-orders">No customers — the next one is on the way…</div>';
      }
      for (const c of state.customers) {
        const dish = DISHES[c.dish];
        const servable = state.plate.length > 0
          && [...dish.components].sort().join() === state.plate.map((p) => p.item).sort().join();
        const card = document.createElement('div');
        card.className = `customer mood-${moodOf(c)}${servable ? ' servable' : ''}`;
        card.innerHTML = `
          <div class="face" style="background:${CUSTOMER_COLORS[c.id % CUSTOMER_COLORS.length]}">
            <span class="eyes">• •</span><span class="mouth"></span>
          </div>
          <div class="cust-main">
            <div class="cust-name">${c.name} <span class="cust-dish">wants ${dish.name}</span></div>
            <div class="cust-comps">${dish.components.map((x) => foodChip(x, false)).join('')}</div>
            <div class="patience"><div class="patience-fill ${patienceClass(c)}" style="width:${Math.max(0, (c.patience / c.maxPatience) * 100)}%"></div></div>
            <div class="cust-note">${servable ? '★ READY TO SERVE — CLICK! ★' : `Patience ${Math.ceil(c.patience)}s`}</div>
          </div>`;
        card.addEventListener('click', () => hooks.onServe(c.id));
        cards.appendChild(card);
      }
    }

    // Stations.
    drawStation($('st-board'), state.board, { verb: 'Chopping' });
    drawStation($('st-grill'), state.grill, { isGrill: true });
    drawStation($('st-fryer'), state.fryer, { verb: 'Frying' });

    // Ready shelf.
    const shelfSig = state.shelf.map((s) => `${s.item}:${s.perfect}`).join('|');
    if (shelfSig !== lastShelfSig) {
      lastShelfSig = shelfSig;
      const shelfEl = $('st-shelf').querySelector('.st-slot');
      shelfEl.innerHTML = state.shelf.length === 0
        ? '<span class="empty">—</span>'
        : state.shelf.map((s, i) => `<button class="shelf-item" data-i="${i}">${foodChip(s.item, s.perfect)}</button>`).join('');
      shelfEl.querySelectorAll('.shelf-item').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          hooks.onShelf(Number(b.dataset.i));
        });
      });
      $('st-shelf').querySelector('.st-status').textContent = state.shelf.length === 0
        ? 'Nothing ready yet'
        : `${state.shelf.length} item${state.shelf.length > 1 ? 's' : ''} ready — click to plate`;
    }

    // Plate.
    const plateSig = state.plate.map((p) => `${p.item}:${p.perfect}`).join('|');
    if (plateSig !== lastPlateSig) {
      lastPlateSig = plateSig;
      const plateEl = $('st-plate').querySelector('.st-slot');
      plateEl.innerHTML = state.plate.length === 0
        ? '<span class="empty">Empty plate — build a dish</span>'
        : state.plate.map((p) => foodChip(p.item, p.perfect)).join('');
      const servable = state.customers.some((c) => [...DISHES[c.dish].components].sort().join() === state.plate.map((p) => p.item).sort().join());
      $('st-plate').classList.toggle('ready', servable);
    }

    // Feed.
    const feedSig = state.feed.map((f) => f.text).join('|');
    if (feedSig !== lastFeedSig) {
      lastFeedSig = feedSig;
      $('feed-lines').innerHTML = state.feed.map((f) => `<div class="feed-line ${f.kind}">${f.text}</div>`).join('');
    }

    // Overlays.
    $('ov-title').classList.toggle('hidden', screen !== SCREEN_TITLE);
    $('ov-day').classList.toggle('hidden', screen !== SCREEN_DAY);
    $('ov-over').classList.toggle('hidden', screen !== SCREEN_OVER);
    $('ov-paused').classList.toggle('hidden', screen !== SCREEN_PAUSED);
    $('title-best').textContent = best;
    if (screen === SCREEN_DAY) {
      $('day-title').textContent = `DAY ${state.day} COMPLETE!`;
      $('day-stats').innerHTML = statRows([
        ['Served today', state.servedToday],
        ['Perfect pieces', state.perfectsToday],
        ['Walk-outs', state.lostToday],
        ['Day bonus', state.dayBonusLife ? '+1 life ♥' : '—'],
        ['Total score', state.score],
        ['Coins earned', `$${state.coins}`],
      ]);
    }
    if (screen === SCREEN_OVER) {
      $('over-stats').innerHTML = statRows([
        ['Days survived', state.day],
        ['Customers served', state.served],
        ['Perfect pieces', state.perfects],
        ['Best combo', `x${state.maxCombo}`],
        ['Coins earned', `$${state.coins}`],
        ['Final score', state.score],
        ['Best score', best],
      ]);
    }
    $('status').textContent = `Day ${state.day}, score ${state.score}, ${state.lives} lives, ${state.customers.length} customers waiting.`;
  }

  function statRows(rows) {
    return rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  return { draw };
}
