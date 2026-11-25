// chef.js — the chef of Sizzle & Serve: a little cook who walks the floor lane
// in front of the counter to whichever station the player clicks, and carries
// one item at a time. The walk is what makes the player plan a route through
// the kitchen instead of teleporting between stations.

export function createChef() {
  return {
    // Where the chef stands, as an x position in stage pixels.
    x: 640,
    targetX: 640,
    // The item state in the chef's hands, or null when empty-handed.
    carrying: null,
    // Which way the chef faces: 1 right, -1 left.
    facing: 1,
    walking: false,
  };
}

// Send the chef walking toward a station's x position.
export function sendChefTo(chef, x) {
  chef.targetX = x;
  if (x !== chef.x) chef.facing = x > chef.x ? 1 : -1;
}

// Move the chef toward the target at walking speed. Returns true on arrival.
export function updateChef(chef, dt) {
  const speed = 620; // stage pixels per second
  const dx = chef.targetX - chef.x;
  if (Math.abs(dx) <= speed * dt) {
    chef.x = chef.targetX;
    chef.walking = false;
    return true;
  }
  chef.x += Math.sign(dx) * speed * dt;
  chef.walking = true;
  return false;
}

export function pickUp(chef, itemState) {
  chef.carrying = itemState;
}

export function putDown(chef) {
  const item = chef.carrying;
  chef.carrying = null;
  return item;
}

export function handsFree(chef) {
  return chef.carrying === null;
}
