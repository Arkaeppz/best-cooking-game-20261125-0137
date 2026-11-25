// orders.js — the order board of Sizzle & Serve: tickets arrive, patience
// drains, and the kitchen either serves the dish in time or loses the order.
// Spawning speeds up and patience shrinks as the service goes on, and bigger
// dishes unlock later, so the pressure grows without adding new chores.

import { RECIPES } from './recipes.js';

const MAX_TICKETS = 4;
let nextTicketId = 1;

export function createOrderBook() {
  return { tickets: [], sinceLastSpawn: 99, servedCount: 0, lostCount: 0 };
}

// How long between new tickets, and how patient a new customer is, at a given
// elapsed time in the service. Both tighten over the first three minutes.
export function spawnIntervalAt(elapsed) {
  const t = Math.min(elapsed / 180, 1);
  return 13 - 6.5 * t;
}

export function patienceAt(elapsed) {
  const t = Math.min(elapsed / 180, 1);
  return 52 - 18 * t;
}

function pickRecipe(elapsed, rng) {
  const unlocked = RECIPES.filter((recipe) => recipe.unlockAt <= elapsed);
  // Later, bigger dishes show up more often: weight by price.
  const weights = unlocked.map((recipe) => recipe.price);
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = rng() * total;
  for (let i = 0; i < unlocked.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) return unlocked[i];
  }
  return unlocked[unlocked.length - 1];
}

// Advance the book by dt seconds. Returns events for the caller to react to:
// { type: 'arrived', ticket } and { type: 'expired', ticket }.
export function updateOrders(book, dt, elapsed, rng) {
  const events = [];
  book.sinceLastSpawn += dt;
  for (const ticket of book.tickets) ticket.remaining -= dt;
  const expired = book.tickets.filter((ticket) => ticket.remaining <= 0);
  for (const ticket of expired) {
    book.tickets.splice(book.tickets.indexOf(ticket), 1);
    book.lostCount += 1;
    events.push({ type: 'expired', ticket });
  }
  if (book.tickets.length < MAX_TICKETS && book.sinceLastSpawn >= spawnIntervalAt(elapsed)) {
    book.sinceLastSpawn = 0;
    const recipe = pickRecipe(elapsed, rng);
    const patience = patienceAt(elapsed);
    const ticket = {
      id: nextTicketId,
      recipeId: recipe.id,
      patience,
      remaining: patience,
    };
    nextTicketId += 1;
    book.tickets.push(ticket);
    events.push({ type: 'arrived', ticket });
  }
  return events;
}

// The fraction of patience left, 1 (just arrived) down to 0 (about to leave).
export function patienceFraction(ticket) {
  return Math.max(0, ticket.remaining / ticket.patience);
}

// Stage a fixed ticket for screenshots and tests.
export function stageTicket(book, recipeId, fractionLeft) {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  const ticket = {
    id: nextTicketId,
    recipeId,
    patience: 40,
    remaining: 40 * fractionLeft,
  };
  nextTicketId += 1;
  book.tickets.push(ticket);
  return ticket;
}
