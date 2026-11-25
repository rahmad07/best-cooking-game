// Sizzle & Serve — the kitchen itself. Pure logic: no DOM here, so the same
// world drives the live game, the autopilot and the screenshot scenes.
// Time advances in fixed steps; every click is an explicit action method.

import {
  BEST_KEY,
  CUSTOMER_NAMES,
  DAY_MENU,
  DISHES,
  GRILL_PERFECT_FROM,
  GRILL_PERFECT_TO,
  INGREDIENTS,
  MAX_CUSTOMERS,
  PERFECT_BONUS,
  PREPPED,
  RUSH_AT_SECONDS,
  RUSH_DURATION,
  RUSH_POINTS_MULT,
  SHIFT_SECONDS,
  START_LIVES,
  comboMult,
  patienceFor,
  spawnIntervalFor,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_DAY = 'day';
export const SCREEN_OVER = 'over';
export const SCREEN_PAUSED = 'paused';

const MAX_PLATE = 6;

export function createWorld(rng) {
  const world = {
    state: null,
    events: [],
    reset,
    step,
    sendIngredient,
    collectGrill,
    takeFromShelf,
    serveCustomer,
    clearPlate,
    startGame,
    nextDay,
    restart,
    togglePause,
    servableCustomer,
    plateMatches,
    daySummary,
  };

  function freshState() {
    return {
      screen: SCREEN_TITLE,
      day: 1,
      timeLeft: SHIFT_SECONDS,
      elapsed: 0,
      score: 0,
      coins: 0,
      combo: 0,
      maxCombo: 0,
      served: 0,
      perfects: 0,
      lost: 0,
      lives: START_LIVES,
      customers: [],
      nextCustomerId: 1,
      board: { kind: null, progress: 0, dur: 0 },
      grill: { kind: null, progress: 0, dur: 0, burnt: false, burnT: 0 },
      fryer: { kind: null, progress: 0, dur: 0 },
      shelf: [],
      plate: [],
      feed: [],
      rush: { active: false, t: 0, fired: false },
      spawnT: 2,
      servedToday: 0,
      lostToday: 0,
      perfectsToday: 0,
      dayBonusLife: false,
      best: readBest(),
      muted: false,
    };
  }

  function readBest() {
    try {
      return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      window.localStorage.setItem(BEST_KEY, String(value));
    } catch {
      // Storage can be off: the best score then lasts this visit only.
    }
  }

  function reset() {
    world.state = freshState();
    world.events = [];
  }

  function log(text, kind) {
    const s = world.state;
    s.feed.unshift({ text, kind: kind || 'info', t: s.elapsed });
    if (s.feed.length > 6) s.feed.length = 6;
  }

  function emit(type, data) {
    world.events.push({ type, ...(data || {}) });
  }

  function spawnCustomer() {
    const s = world.state;
    const menu = DAY_MENU[Math.min(s.day, 3)];
    const dish = rng.pick(menu);
    const patience = patienceFor(s.day);
    const customer = {
      id: s.nextCustomerId,
      name: CUSTOMER_NAMES[(s.nextCustomerId - 1) % CUSTOMER_NAMES.length],
      dish,
      patience,
      maxPatience: patience,
      state: 'waiting',
    };
    s.nextCustomerId += 1;
    s.customers.push(customer);
    log(`${customer.name} wants a ${DISHES[dish].name}.`, 'order');
  }

  // --- actions (called by clicks, keys and the autopilot) -----------------

  function sendIngredient(kind) {
    const s = world.state;
    if (s.screen !== SCREEN_PLAY) return false;
    const ing = INGREDIENTS[kind];
    if (!ing) return false;
    if (ing.station === 'plate') {
      if (s.plate.length >= MAX_PLATE) {
        log('Plate is full — serve or clear it first.', 'warn');
        return false;
      }
      s.plate.push({ item: kind, perfect: false });
      emit('place', { kind });
      return true;
    }
    const slot = s[ing.station];
    if (slot.kind) {
      log(`${stationName(ing.station)} is busy!`, 'warn');
      emit('busy', { station: ing.station });
      return false;
    }
    const dur = ing.cookSeconds || ing.chopSeconds || ing.frySeconds || 3;
    slot.kind = kind;
    slot.progress = 0;
    slot.dur = dur;
    slot.burnt = false;
    emit('start', { station: ing.station, kind });
    if (ing.station === 'grill') log(`Grilling ${ing.label} — watch the green zone!`, 'info');
    return true;
  }

  function collectGrill() {
    const s = world.state;
    if (s.screen !== SCREEN_PLAY) return false;
    const g = s.grill;
    if (!g.kind || g.burnt) return false;
    const frac = g.progress / g.dur;
    if (frac < 0.5) {
      log('Still raw — wait for the green zone!', 'warn');
      emit('raw', {});
      return false;
    }
    const perfect = frac >= GRILL_PERFECT_FROM && frac <= GRILL_PERFECT_TO;
    s.shelf.push({ item: PREPPED[g.kind], perfect });
    if (perfect) {
      s.perfects += 1;
      s.perfectsToday += 1;
      log(`PERFECT ${PREPPED[g.kind]}!`, 'perfect');
      emit('perfect', { item: PREPPED[g.kind] });
    } else {
      log(`${PREPPED[g.kind]} ready.`, 'info');
      emit('ding', { item: PREPPED[g.kind] });
    }
    g.kind = null;
    g.progress = 0;
    return true;
  }

  function takeFromShelf(index) {
    const s = world.state;
    if (s.screen !== SCREEN_PLAY) return false;
    const item = s.shelf[index];
    if (!item) return false;
    if (s.plate.length >= MAX_PLATE) {
      log('Plate is full — serve or clear it first.', 'warn');
      return false;
    }
    s.shelf.splice(index, 1);
    s.plate.push(item);
    emit('place', { kind: item.item });
    return true;
  }

  function plateMatches(dishKey) {
    const s = world.state;
    const want = [...DISHES[dishKey].components].sort();
    const have = s.plate.map((p) => p.item).sort();
    return want.length === have.length && want.every((w, i) => w === have[i]);
  }

  function servableCustomer() {
    const s = world.state;
    return s.customers.find((c) => c.state === 'waiting' && plateMatches(c.dish)) || null;
  }

  function serveCustomer(id) {
    const s = world.state;
    if (s.screen !== SCREEN_PLAY) return false;
    const c = s.customers.find((x) => x.id === id && x.state === 'waiting');
    if (!c) return false;
    if (!plateMatches(c.dish)) {
      log(`That plate is not a ${DISHES[c.dish].name}!`, 'warn');
      emit('nomatch', { id });
      return false;
    }
    const dish = DISHES[c.dish];
    const patienceBonus = Math.round(50 * (c.patience / c.maxPatience));
    const perfectCount = s.plate.filter((p) => p.perfect).length;
    const mult = comboMult(s.combo) * (s.rush.active ? RUSH_POINTS_MULT : 1);
    const gained = Math.round((dish.points + patienceBonus + perfectCount * PERFECT_BONUS) * mult);
    s.score += gained;
    s.coins += dish.price;
    s.combo += 1;
    s.maxCombo = Math.max(s.maxCombo, s.combo);
    s.served += 1;
    s.servedToday += 1;
    c.state = 'served';
    s.customers = s.customers.filter((x) => x.state === 'waiting');
    s.plate = [];
    log(`Served ${c.name}: ${dish.name} +${gained} pts (x${mult.toFixed(1)})`, 'serve');
    emit('serve', { id, gained, dish: c.dish });
    return true;
  }

  function clearPlate() {
    const s = world.state;
    if (s.screen !== SCREEN_PLAY || s.plate.length === 0) return false;
    s.plate = [];
    log('Plate cleared.', 'info');
    emit('clear', {});
    return true;
  }

  function startGame() {
    const s = world.state;
    s.screen = SCREEN_PLAY;
    spawnCustomer();
    spawnCustomer();
    log('Shift started — serve them all!', 'info');
    emit('start', {});
  }

  function nextDay() {
    const s = world.state;
    s.day += 1;
    s.timeLeft = SHIFT_SECONDS;
    s.elapsed = 0;
    s.customers = [];
    s.shelf = [];
    s.plate = [];
    s.board.kind = null;
    s.grill.kind = null;
    s.fryer.kind = null;
    s.servedToday = 0;
    s.lostToday = 0;
    s.perfectsToday = 0;
    s.dayBonusLife = false;
    s.rush = { active: false, t: 0, fired: false };
    s.spawnT = 2;
    s.screen = SCREEN_PLAY;
    spawnCustomer();
    spawnCustomer();
    log(`Day ${s.day} — faster orders, bigger tips!`, 'info');
    emit('day', { day: s.day });
  }

  function restart() {
    const best = world.state.best;
    reset();
    world.state.best = best;
    startGame();
  }

  function togglePause() {
    const s = world.state;
    if (s.screen === SCREEN_PLAY) s.screen = SCREEN_PAUSED;
    else if (s.screen === SCREEN_PAUSED) s.screen = SCREEN_PLAY;
  }

  function daySummary() {
    const s = world.state;
    return {
      day: s.day,
      served: s.servedToday,
      perfects: s.perfectsToday,
      lost: s.lostToday,
      score: s.score,
      coins: s.coins,
      lives: s.lives,
      bonusLife: s.dayBonusLife,
    };
  }

  // --- time ----------------------------------------------------------------

  function step(dt) {
    const s = world.state;
    if (!s || s.screen !== SCREEN_PLAY) return;
    s.elapsed += dt;
    s.timeLeft -= dt;

    // Rush Hour, once per day.
    if (!s.rush.fired && s.elapsed >= RUSH_AT_SECONDS) {
      s.rush.fired = true;
      s.rush.active = true;
      s.rush.t = RUSH_DURATION;
      log('RUSH HOUR! Orders flood in — 1.5x points!', 'rush');
      emit('rush', {});
    }
    if (s.rush.active) {
      s.rush.t -= dt;
      if (s.rush.t <= 0) {
        s.rush.active = false;
        log('Rush Hour over. Breathe.', 'info');
      }
    }

    // New customers walk in.
    s.spawnT -= dt;
    if (s.spawnT <= 0) {
      const waiting = s.customers.filter((c) => c.state === 'waiting').length;
      if (waiting < MAX_CUSTOMERS) spawnCustomer();
      const base = spawnIntervalFor(s.day) * (s.rush.active ? 0.5 : 1);
      s.spawnT = base * (0.85 + rng.next() * 0.3);
    }

    // Patience drains; an empty meter walks out angry.
    for (const c of s.customers) {
      if (c.state !== 'waiting') continue;
      c.patience -= dt;
      if (c.patience <= 0) {
        c.state = 'left';
        s.lives -= 1;
        s.lost += 1;
        s.lostToday += 1;
        s.combo = 0;
        log(`${c.name} left angry! -1 life.`, 'bad');
        emit('walkout', { id: c.id });
      }
    }
    s.customers = s.customers.filter((c) => c.state === 'waiting');

    // Stations cook, chop and fry.
    advanceStation(s.board, dt, 'board');
    advanceStation(s.fryer, dt, 'fryer');
    const g = s.grill;
    if (g.kind && !g.burnt) {
      g.progress += dt;
      if (g.progress >= g.dur) {
        g.burnt = true;
        g.burnT = 1.5;
        log(`Burnt ${INGREDIENTS[g.kind].label}! It goes in the trash.`, 'bad');
        emit('burnt', { kind: g.kind });
      }
    } else if (g.kind && g.burnt) {
      g.burnT -= dt;
      if (g.burnT <= 0) {
        g.kind = null;
        g.progress = 0;
        g.burnt = false;
      }
    }

    if (s.lives <= 0) {
      s.screen = SCREEN_OVER;
      if (s.score > s.best) {
        s.best = s.score;
        saveBest(s.best);
      }
      log(`Game over — final score ${s.score}.`, 'bad');
      emit('over', { score: s.score });
      return;
    }

    if (s.timeLeft <= 0) {
      s.timeLeft = 0;
      if (s.lostToday === 0 && s.lives < START_LIVES) {
        s.lives += 1;
        s.dayBonusLife = true;
      }
      s.screen = SCREEN_DAY;
      if (s.score > s.best) {
        s.best = s.score;
        saveBest(s.best);
      }
      log(`Day ${s.day} complete!`, 'serve');
      emit('daydone', { day: s.day });
    }
  }

  function advanceStation(slot, dt, name) {
    const s = world.state;
    if (!slot.kind) return;
    slot.progress += dt;
    if (slot.progress >= slot.dur) {
      const item = PREPPED[slot.kind];
      s.shelf.push({ item, perfect: false });
      log(`${item} ready on the shelf.`, 'info');
      slot.kind = null;
      slot.progress = 0;
      emit('ding', { item, station: name });
    }
  }

  function stationName(station) {
    return { board: 'Chopping board', grill: 'Grill', fryer: 'Fryer' }[station] || station;
  }

  reset();
  return world;
}
