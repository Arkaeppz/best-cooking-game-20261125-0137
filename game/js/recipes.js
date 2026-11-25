// recipes.js — the menu of Sizzle & Serve: every ingredient, how it is prepped,
// and the dishes the kitchen serves. Ingredients are shared between dishes in
// different combinations, so one prep run can feed several orders.

// An ingredient moves through states: raw (from the counter) -> prepped.
// prep: 'chop' sends it to the chopping board, 'cook' sends it to the stove,
// null means it goes on the plate as it is.
export const INGREDIENTS = {
  bun:    { name: 'Bun',          prep: null,   colour: '#e8a94e' },
  patty:  { name: 'Beef patty',   prep: 'cook', cookedName: 'Cooked patty',  colour: '#7a4a26' },
  cheese: { name: 'Cheese slice', prep: null,   colour: '#f7b731' },
  tomato: { name: 'Tomato',       prep: 'chop', cookedName: 'Tomato slices', colour: '#e0392a' },
  lettuce:{ name: 'Lettuce',      prep: 'chop', cookedName: 'Lettuce shreds', colour: '#58b368' },
  egg:    { name: 'Egg',          prep: 'cook', cookedName: 'Fried egg',     colour: '#f5c542' },
  potato: { name: 'Potato',       prep: 'chop', cookedName: 'Cut potato',    colour: '#d9b380' },
};

// The state an ingredient reaches after its prep step. Potato is the two-step
// ingredient: chop it into cut potato, then cook the cut potato into fries.
export const PREPPED_STATE = {
  patty: 'pattyCooked',
  tomato: 'tomatoSlices',
  lettuce: 'lettuceShreds',
  egg: 'eggFried',
  potato: 'potatoCut',
  potatoCut: 'friesDone',
};

// Display names for every state an item can be in while it is carried,
// on a station, or stacked on the plate.
export const STATE_NAMES = {
  bun: 'Bun',
  patty: 'Beef patty (raw)',
  pattyCooked: 'Cooked patty',
  cheese: 'Cheese slice',
  tomato: 'Tomato',
  tomatoSlices: 'Tomato slices',
  lettuce: 'Lettuce',
  lettuceShreds: 'Lettuce shreds',
  egg: 'Egg (raw)',
  eggFried: 'Fried egg',
  potato: 'Potato',
  potatoCut: 'Cut potato',
  friesDone: 'Golden fries',
};

// Which station turns a state into its prepped state, if any.
const PREP_STATION = {
  tomato: 'chop',
  lettuce: 'chop',
  potato: 'chop',
  patty: 'cook',
  egg: 'cook',
  potatoCut: 'cook',
};

export function prepStationFor(state) {
  return PREP_STATION[state] ?? null;
}

// The dishes. items are plate states, in the order they stack best.
// unlockAt is the service elapsed seconds before the dish can be ordered.
export const RECIPES = [
  { id: 'classic-burger', name: 'Classic Burger', items: ['bun', 'pattyCooked', 'cheese'], price: 12, unlockAt: 0 },
  { id: 'cheesy-fries', name: 'Cheesy Fries', items: ['friesDone', 'cheese'], price: 9, unlockAt: 0 },
  { id: 'garden-salad', name: 'Garden Salad', items: ['lettuceShreds', 'tomatoSlices', 'cheese'], price: 11, unlockAt: 20 },
  { id: 'sunrise-plate', name: 'Sunrise Plate', items: ['eggFried', 'friesDone', 'tomatoSlices'], price: 14, unlockAt: 45 },
  { id: 'deluxe-burger', name: 'Deluxe Burger', items: ['bun', 'pattyCooked', 'cheese', 'tomatoSlices', 'lettuceShreds'], price: 18, unlockAt: 75 },
  { id: 'double-stack', name: 'Double Stack', items: ['bun', 'pattyCooked', 'pattyCooked', 'cheese'], price: 17, unlockAt: 110 },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id);
}

// Does the plate hold exactly this recipe's items, in any order?
export function plateMatchesRecipe(plateItems, recipe) {
  if (plateItems.length !== recipe.items.length) return false;
  const sortedPlate = [...plateItems].sort();
  const sortedRecipe = [...recipe.items].sort();
  return sortedPlate.every((item, index) => item === sortedRecipe[index]);
}
