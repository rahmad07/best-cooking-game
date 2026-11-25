// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the
// real rules forward from a fresh world for a fixed time, steered by a simple
// greedy autopilot (serve when a plate matches, collect the grill in the
// perfect zone, plate only what the first order still needs), so every frame
// is what a short game really looks like — and the same seed always gives
// the same frame. The end scene's pilot does nothing, so the customers walk
// out one by one, exactly like a hurried player who stops playing.

import { DISHES, INGREDIENTS, PREPPED, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './world.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 45;
const SERVE_LIMIT_SECONDS = 120;
const END_PLAY_SECONDS = 45;
const END_LIMIT_SECONDS = 300;

// What raw ingredient a plate component comes from.
function rawFor(component) {
  for (const [raw, prepped] of Object.entries(PREPPED)) {
    if (prepped === component) return raw;
  }
  return component;
}

// Components of `dish` that are not on the plate yet (multiset difference).
function missingComponents(dish, plate) {
  const have = plate.map((p) => p.item);
  const missing = [];
  for (const comp of dish.components) {
    const at = have.indexOf(comp);
    if (at === -1) missing.push(comp);
    else have.splice(at, 1);
  }
  return missing;
}

// One greedy decision per step. Returns after the first action it takes.
function autopilot(world) {
  const s = world.state;
  if (s.screen !== SCREEN_PLAY) return;
  const servable = world.servableCustomer();
  if (servable) {
    world.serveCustomer(servable.id);
    return;
  }
  if (s.grill.kind && !s.grill.burnt) {
    const frac = s.grill.progress / s.grill.dur;
    if (frac >= 0.62) {
      world.collectGrill();
      return;
    }
  }
  const target = s.customers[0];
  if (!target) return;
  const dish = DISHES[target.dish];
  const need = missingComponents(dish, s.plate);
  for (let i = 0; i < s.shelf.length; i += 1) {
    if (need.includes(s.shelf[i].item)) {
      world.takeFromShelf(i);
      return;
    }
  }
  for (const comp of need) {
    const raw = rawFor(comp);
    const station = INGREDIENTS[raw].station;
    if (station === 'plate') {
      world.sendIngredient(raw);
      return;
    }
    if (!s[station].kind) {
      world.sendIngredient(raw);
      return;
    }
  }
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name
 * is start) and return the screen to draw over it and the best score.
 */
export function stageShot(name, world) {
  world.reset();
  world.state.screen = SCREEN_PLAY;
  world.startGame();
  if (name === 'start') {
    for (let t = 0; t < START_SECONDS; t += STEP) {
      autopilot(world);
      world.step(STEP);
    }
    world.state.screen = SCREEN_TITLE;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'serve') {
    for (let t = 0; t < SERVE_LIMIT_SECONDS; t += STEP) {
      autopilot(world);
      world.step(STEP);
      if (world.servableCustomer()) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    // Play well first so the game-over screen shows a real run (serves and a
    // score), then the lazy pilot stops touching anything and the customers
    // walk out one by one, exactly like a hurried player who stops playing.
    for (let t = 0; t < END_PLAY_SECONDS; t += STEP) {
      autopilot(world);
      world.step(STEP);
      if (world.state.screen !== SCREEN_PLAY) break;
    }
    for (let t = 0; t < END_LIMIT_SECONDS; t += STEP) {
      world.step(STEP);
      if (world.state.screen === SCREEN_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // The play scene stops the moment the kitchen is at its busiest: customers
  // waiting, a dish mid-assembly on the plate, and a station working — the
  // frame the judge should see, not an empty board between serves.
  for (let t = 0; t < PLAY_SECONDS; t += STEP) {
    autopilot(world);
    world.step(STEP);
    if (world.state.screen !== SCREEN_PLAY) break;
    const s = world.state;
    const waiting = s.customers.filter((c) => c.state === 'waiting').length;
    const busy = s.grill.kind || s.board.kind || s.fryer.kind || s.shelf.length > 0;
    if (waiting >= 3 && s.plate.length >= 1 && busy && s.score > 0) break;
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
