// Sizzle & Serve — Rush Hour Kitchen
// Tuning, menu and recipes. Everything the world, renderer and autopilot
// agree on lives here so a balance change is a one-line edit.

export const STEP = 1 / 60;
export const BEST_KEY = 'sizzle-and-serve-best';

// A shift lasts two minutes; surviving it completes the day.
export const SHIFT_SECONDS = 120;
export const START_LIVES = 3;
export const MAX_CUSTOMERS = 4;

// Ingredients: what they are, where they are prepped, how long it takes,
// and the colour the UI paints them with.
export const INGREDIENTS = {
  bun: { label: 'Bun', station: 'plate', color: '#e8b06a', shape: 'bun' },
  patty: { label: 'Patty', station: 'grill', color: '#8a5a2b', shape: 'patty', cookSeconds: 6 },
  steak: { label: 'Steak', station: 'grill', color: '#a34a3a', shape: 'steak', cookSeconds: 8 },
  lettuce: { label: 'Lettuce', station: 'board', color: '#5da244', shape: 'leaf', chopSeconds: 2.5 },
  tomato: { label: 'Tomato', station: 'board', color: '#d84a35', shape: 'round', chopSeconds: 2.5 },
  cheese: { label: 'Cheese', station: 'plate', color: '#f2c230', shape: 'slice' },
  potato: { label: 'Potato', station: 'fryer', color: '#d9a441', shape: 'round', frySeconds: 4 },
};

// What a station turns an ingredient into.
export const PREPPED = {
  patty: 'grilledPatty',
  steak: 'grilledSteak',
  lettuce: 'choppedLettuce',
  tomato: 'choppedTomato',
  potato: 'fries',
};

export const PREPPED_LABEL = {
  grilledPatty: 'Grilled Patty',
  grilledSteak: 'Grilled Steak',
  choppedLettuce: 'Chopped Lettuce',
  choppedTomato: 'Chopped Tomato',
  fries: 'Fries',
  bun: 'Bun',
  cheese: 'Cheese',
};

// The menu: each dish is a set of plate components, a price and base points.
// The grill's green band is the perfect window: collecting inside it marks
// the piece PERFECT, worth +15 points each when the dish is served.
export const DISHES = {
  burger: {
    name: 'Classic Burger',
    components: ['bun', 'grilledPatty', 'choppedLettuce', 'choppedTomato'],
    price: 12,
    points: 120,
    blurb: 'The house favourite. Four parts, one happy customer.',
  },
  steak: {
    name: 'Steak Plate',
    components: ['grilledSteak', 'fries'],
    price: 18,
    points: 180,
    blurb: 'Slow-grilled steak with golden fries. Worth the wait.',
  },
  salad: {
    name: 'Garden Salad',
    components: ['choppedLettuce', 'choppedTomato', 'cheese'],
    price: 9,
    points: 90,
    blurb: 'Fresh, fast and light. No grill required.',
  },
  cheesyFries: {
    name: 'Cheesy Fries',
    components: ['fries', 'cheese'],
    price: 7,
    points: 70,
    blurb: 'The quick win: fries, cheese, done.',
  },
};

// Dishes a customer can order on each day (the menu opens up as days pass).
export const DAY_MENU = {
  1: ['burger', 'salad', 'cheesyFries'],
  2: ['burger', 'salad', 'cheesyFries', 'steak'],
  3: ['burger', 'salad', 'cheesyFries', 'steak'],
};

// Grill timing: collect between PERFECT_FROM and PERFECT_TO (fraction of the
// cook) for a PERFECT piece. Past 1.0 the piece burns and is trashed.
export const GRILL_PERFECT_FROM = 0.6;
export const GRILL_PERFECT_TO = 0.85;

// Customer pacing. Patience and spawn interval tighten every day.
export function patienceFor(day) {
  return Math.max(20, 34 - (day - 1) * 2);
}
export function spawnIntervalFor(day) {
  return Math.max(4.5, 9 - (day - 1) * 0.8);
}

// Rush Hour: once a day, halfway through the shift, orders flood in.
export const RUSH_AT_SECONDS = 45;
export const RUSH_DURATION = 20;
export const RUSH_POINTS_MULT = 1.5;

// Combo: every serve in a row without a walk-out raises the multiplier.
export function comboMult(combo) {
  return 1 + 0.2 * Math.min(combo, 10);
}
export const PERFECT_BONUS = 15;

// The regulars who walk through the door.
export const CUSTOMER_NAMES = [
  'Mia', 'Leo', 'Zoe', 'Max', 'Ruby', 'Finn', 'Ivy', 'Omar',
  'Lena', 'Kai', 'Nora', 'Eli', 'Sara', 'Hugo', 'Tara', 'Ben',
];
