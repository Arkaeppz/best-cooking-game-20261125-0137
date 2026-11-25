// score.js — the till and the clock of Sizzle & Serve: score, tips, the combo
// streak for fast service, the hearts a lost order costs, and the three-minute
// service timer that ends the day.

export const SERVICE_SECONDS = 180;
export const STARTING_HEARTS = 3;

export function createScore() {
  return {
    points: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    hearts: STARTING_HEARTS,
    elapsed: 0,
    served: 0,
    lost: 0,
  };
}

// The combo multiplier: each serve in a row adds half a step, capped at x3.
export function comboMultiplier(score) {
  return Math.min(1 + score.combo * 0.5, 3);
}

// Pay for a served dish: its price, a tip scaled by the patience the customer
// had left, all times the combo multiplier. Returns the points earned.
export function payForDish(score, recipe, patienceFraction) {
  const tip = Math.round(recipe.price * 0.6 * patienceFraction);
  const earned = Math.round((recipe.price + tip) * comboMultiplier(score));
  score.points += earned;
  score.coins += recipe.price + tip;
  score.combo += 1;
  score.bestCombo = Math.max(score.bestCombo, score.combo);
  score.served += 1;
  return earned;
}

// A ticket walked out: the streak ends and a heart goes with it.
export function loseOrder(score) {
  score.combo = 0;
  score.hearts -= 1;
  score.lost += 1;
}

export function isDayOver(score) {
  return score.elapsed >= SERVICE_SECONDS || score.hearts <= 0;
}

export function secondsLeft(score) {
  return Math.max(0, Math.ceil(SERVICE_SECONDS - score.elapsed));
}

export function formatClock(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
