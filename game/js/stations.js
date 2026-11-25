// stations.js — the working kitchen of Sizzle & Serve: the chopping board, the
// two stove burners, the assembly plate and the serving pass. Each station is
// a small state machine the player drives by walking the chef to it.

import { PREPPED_STATE, prepStationFor } from './recipes.js';

export const CHOP_SECONDS = 1.15;
export const BURN_GRACE_SECONDS = 2.0;
export const COOK_SECONDS = { patty: 2.6, egg: 2.2, potatoCut: 2.4 };

export function createKitchen() {
  return {
    // The chopping board holds one item while it is chopped.
    board: { item: null, progress: 0 },
    // Two burners, each: empty, cooking (progress 0..1), done, or burnt.
    burners: [
      { item: null, progress: 0, phase: 'empty' },
      { item: null, progress: 0, phase: 'empty' },
    ],
    // The dish being built on the assembly counter: a stack of item states.
    plate: [],
    // A finished dish waiting at the serving pass, or null.
    passPlate: null,
  };
}

// Put the carried item on the board and start chopping. False when the board
// is taken or the item needs no chopping.
export function startChopping(kitchen, itemState) {
  if (kitchen.board.item !== null) return false;
  if (prepStationFor(itemState) !== 'chop') return false;
  kitchen.board.item = itemState;
  kitchen.board.progress = 0;
  return true;
}

// Put the carried item on a free burner. False when both burners are busy or
// the item needs no cooking.
export function startCooking(kitchen, itemState) {
  if (prepStationFor(itemState) !== 'cook') return false;
  const burner = kitchen.burners.find((b) => b.phase === 'empty');
  if (!burner) return false;
  burner.item = itemState;
  burner.progress = 0;
  burner.phase = 'cooking';
  return true;
}

// Advance the board and burners by dt seconds. Events tell the caller what
// finished: { type: 'chopped' }, { type: 'cooked', burner },
// { type: 'burnt', burner }.
export function updateStations(kitchen, dt) {
  const events = [];
  const board = kitchen.board;
  if (board.item !== null && board.progress < 1) {
    board.progress = Math.min(1, board.progress + dt / CHOP_SECONDS);
    if (board.progress >= 1) {
      board.item = PREPPED_STATE[board.item];
      events.push({ type: 'chopped' });
    }
  }
  for (const burner of kitchen.burners) {
    if (burner.phase === 'cooking') {
      const seconds = COOK_SECONDS[burner.item] ?? 2.4;
      burner.progress = Math.min(1, burner.progress + dt / seconds);
      if (burner.progress >= 1) {
        burner.item = PREPPED_STATE[burner.item];
        burner.phase = 'done';
        burner.progress = 0;
        events.push({ type: 'cooked', burner });
      }
    } else if (burner.phase === 'done') {
      burner.progress += dt / BURN_GRACE_SECONDS;
      if (burner.progress >= 1) {
        burner.phase = 'burnt';
        events.push({ type: 'burnt', burner });
      }
    }
  }
  return events;
}

// Take the finished item off the board. Null while it is still chopping or
// the board is empty.
export function takeFromBoard(kitchen) {
  if (kitchen.board.item === null || kitchen.board.progress < 1) return null;
  const item = kitchen.board.item;
  kitchen.board.item = null;
  kitchen.board.progress = 0;
  return item;
}

// Take a cooked item off a burner, or clear a burnt one. Returns the item
// state, 'burnt', or null when there is nothing to take.
export function takeFromBurner(kitchen, index) {
  const burner = kitchen.burners[index];
  if (burner.phase === 'done') {
    const item = burner.item;
    burner.item = null;
    burner.progress = 0;
    burner.phase = 'empty';
    return item;
  }
  if (burner.phase === 'burnt') {
    burner.item = null;
    burner.progress = 0;
    burner.phase = 'empty';
    return 'burnt';
  }
  return null;
}

// Add a carried item to the assembly plate. Anything the chef can carry can
// be plated; the recipe check happens at the pass.
export function addToPlate(kitchen, itemState) {
  kitchen.plate.push(itemState);
  return kitchen.plate.length;
}

// Pop the plate's top layer back into the chef's hands (the undo for a
// misplaced layer). Null when the plate is empty.
export function popFromPlate(kitchen) {
  return kitchen.plate.length ? kitchen.plate.pop() : null;
}

// Move the finished assembly plate to the serving pass. False when the plate
// is empty or the pass is already taken.
export function movePlateToPass(kitchen) {
  if (kitchen.plate.length === 0 || kitchen.passPlate !== null) return false;
  kitchen.passPlate = kitchen.plate;
  kitchen.plate = [];
  return true;
}

// Clear the pass after a serve (or a binning). Returns what was on it.
export function clearPass(kitchen) {
  const plate = kitchen.passPlate;
  kitchen.passPlate = null;
  return plate;
}
