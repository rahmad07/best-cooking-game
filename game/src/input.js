// Keyboard shortcuts for Sizzle & Serve. Mouse does everything; keys are the
// fast lane: bins 1-7, G collects the grill, S serves a ready customer.

import { INGREDIENTS } from './config.js';

const BIN_KEYS = Object.keys(INGREDIENTS);

export function createInput(hooks) {
  function onKey(event) {
    if (event.repeat) return;
    const key = event.key.toLowerCase();
    if (key >= '1' && key <= '7') {
      const kind = BIN_KEYS[Number(key) - 1];
      if (kind) hooks.onBin(kind);
      return;
    }
    if (key === 'g') hooks.onGrill();
    else if (key === 's') hooks.onServeFirst();
    else if (key === 'p') hooks.onPause();
    else if (key === 'r') hooks.onRestart();
    else if (key === 'm') hooks.onSound();
    else if (key === 'enter' || key === ' ') {
      hooks.onConfirm();
      event.preventDefault();
    }
  }
  window.addEventListener('keydown', onKey);
  return { destroy() { window.removeEventListener('keydown', onKey); } };
}
