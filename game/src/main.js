// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between five screens: title, play, day complete, paused and game over.
// Sounds are synthesized with WebAudio — no audio files, nothing loads over
// the network.
//
// ?seed=N fixes the customer pattern. ?shot=start|play|serve|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.

import { STEP } from './config.js';
import { createRandom } from './random.js';
import {
  SCREEN_DAY,
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  createWorld,
} from './world.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const world = createWorld(createRandom(seed));

// --- tiny WebAudio synth (no files) ---------------------------------------
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      audioCtx = null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}
function tone(freq, dur, type, gain) {
  const ctx = ensureAudio();
  if (!ctx || world.state.muted) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = freq;
  amp.gain.setValueAtTime(gain || 0.12, ctx.currentTime);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}
function playEvent(event) {
  if (world.state.muted) return;
  switch (event.type) {
    case 'serve': tone(880, 0.12, 'sine', 0.14); setTimeout(() => tone(1318, 0.18, 'sine', 0.14), 90); break;
    case 'perfect': tone(1568, 0.15, 'triangle', 0.14); setTimeout(() => tone(2093, 0.2, 'triangle', 0.12), 80); break;
    case 'ding': tone(660, 0.1, 'sine', 0.1); break;
    case 'place': tone(440, 0.06, 'square', 0.05); break;
    case 'walkout': tone(160, 0.3, 'sawtooth', 0.12); break;
    case 'burnt': tone(110, 0.35, 'sawtooth', 0.12); break;
    case 'raw': case 'busy': case 'nomatch': tone(200, 0.12, 'square', 0.08); break;
    case 'rush':
      [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.12, 'triangle', 0.12), i * 90));
      break;
    case 'daydone': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.12), i * 110)); break;
    case 'over': [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sine', 0.12), i * 160)); break;
    default: break;
  }
}
window.addEventListener('pointerdown', ensureAudio, { once: true });
window.addEventListener('keydown', ensureAudio, { once: true });

// --- hooks: renderer + keyboard talk to the world --------------------------
const hooks = {
  onBin(kind) { world.sendIngredient(kind); },
  onGrill() { world.collectGrill(); },
  onShelf(index) { world.takeFromShelf(index); },
  onServe(id) { world.serveCustomer(id); },
  onServeFirst() {
    const c = world.servableCustomer();
    if (c) world.serveCustomer(c.id);
  },
  onClearPlate() { world.clearPlate(); },
  onStart() {
    if (world.state.screen === SCREEN_TITLE) {
      world.reset();
      world.startGame();
    }
  },
  onNextDay() {
    if (world.state.screen === SCREEN_DAY) world.nextDay();
  },
  onRestart() { world.restart(); },
  onPause() { world.togglePause(); },
  onSound() { world.state.muted = !world.state.muted; },
  onConfirm() {
    const s = world.state.screen;
    if (s === SCREEN_TITLE) hooks.onStart();
    else if (s === SCREEN_DAY) hooks.onNextDay();
    else if (s === SCREEN_OVER) hooks.onRestart();
    else if (s === SCREEN_PAUSED) hooks.onPause();
  },
};

const renderer = createRenderer(document.getElementById('stage'), hooks);
createInput(hooks);

function drainEvents() {
  for (const event of world.events) playEvent(event);
  world.events.length = 0;
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Keep repainting (draw only, no stepping): the frame stays exactly the
  // staged one, but the page stays interactive — a click on a servable
  // customer still serves, and the HUD updates to show it.
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted === 2) window.__shotReady = true;
    requestAnimationFrame(paint);
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const elapsed = Math.min(MAX_FRAME, (now - last) / 1000);
    last = now;
    accumulator += elapsed;
    while (accumulator >= STEP) {
      world.step(STEP);
      accumulator -= STEP;
    }
    drainEvents();
    renderer.draw(world.state, world.state.screen, world.state.best);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
