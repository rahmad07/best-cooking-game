# Sizzle & Serve — Best Cooking Game

[![make.fun](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Rank](https://make.fun/badge/best-cooking-game-20261125-0137/rahmad07/best-cooking-game/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)
[![Reward](https://make.fun/badge/best-cooking-game-20261125-0137/rahmad07/best-cooking-game/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137)

A fast kitchen game for the [make.fun best cooking game bounty](https://make.fun/bounty/best-cooking-game-20261125-0137). You run a rush-hour kitchen: chop, grill and fry to order, build each dish on the plate, and serve it before the customer's patience runs out. Played with keyboard and mouse in a desktop browser; static files only, no network requests.

Play it: serve `game/` with any static HTTP server and open `game/index.html`.

## How to play

1. **Prep** — Click an ingredient bin and it goes to its station: lettuce and tomato to the chopping board, patties and steak to the grill, potatoes to the fryer. Buns and cheese go straight to the plate.
2. **Perfect** — Collect the grill inside the green zone for a PERFECT piece (+15 points). Leave it too long and it burns.
3. **Plate** — Click ready items on the shelf to build the dish on the plate. It must match the customer's order exactly.
4. **Serve** — When the plate matches an order, the customer glows: click them to serve. Fast serves pay a patience bonus; serves in a row build your combo multiplier.

A customer whose patience runs out leaves angry and costs a life. You have three lives per run and two-minute shifts — survive the shift to start the next day, when orders come faster and patience runs shorter. Every day at 45 seconds, Rush Hour hits: orders flood in and points pay 1.5x.

## The menu

| Dish | Recipe | Price | Points |
| --- | --- | --- | --- |
| Classic Burger | Bun + grilled patty + chopped lettuce + chopped tomato | $12 | 120 |
| Steak Plate | Grilled steak + fries | $18 | 180 |
| Garden Salad | Chopped lettuce + chopped tomato + cheese | $9 | 90 |
| Cheesy Fries | Fries + cheese | $7 | 70 |

## Controls

- Mouse: click bins, the grill, shelf items, customers and buttons.
- Keys: `1–7` ingredient bins · `G` collect grill · `S` serve a ready customer · `P` pause · `R` restart · `M` sound on/off · `Enter` start / next day.

## Files

- `game/index.html` — the game shell (fixed 1280×720 stage, scales to fit).
- `game/src/config.js` — tuning, menu, recipes, pacing.
- `game/src/random.js` — seeded random numbers (same seed, same customers).
- `game/src/world.js` — the kitchen: customers, stations, scoring, days.
- `game/src/render.js` — the DOM kitchen: HUD, order board, stations, menu.
- `game/src/input.js` — keyboard shortcuts.
- `game/src/shots.js` — the autopilot that stages the screenshots.
- `game/src/main.js` — boot, game loop, synthesized sound effects.
- `screenshots/` — four real renders of the game (title, play, serve, game over).
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

Sounds are synthesized with WebAudio — no audio files, nothing loads over the network. Best score is kept in the browser's local storage.
