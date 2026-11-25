// shots.js — staged scenes for the entry's screenshots. When the game is
// opened with ?shot=<name>, main.js freezes the clock and calls stageShot to
// arrange a real mid-service moment with the game's own state and rendering:
// nothing here draws anything the game itself cannot show.

import { stageTicket } from './orders.js';

// The cover scene: a full rush — three tickets on the board, a Deluxe Burger
// half-stacked on the assembly plate, a patty cooking on one burner, golden
// fries waiting at the pass, and the clock mid-service.
export function stageShot(name, ctx) {
  const { book, kitchen, score, chef } = ctx;
  if (name === 'menu') return; // the title screen is the scene
  score.elapsed = 83;
  score.points = 340;
  score.coins = 96;
  score.combo = 2;
  score.served = 7;

  if (name === 'cover') {
    stageTicket(book, 'deluxe-burger', 0.72);
    stageTicket(book, 'sunrise-plate', 0.45);
    stageTicket(book, 'cheesy-fries', 0.88);
    kitchen.plate = ['bun', 'pattyCooked', 'cheese'];
    kitchen.passPlate = ['friesDone', 'cheese'];
    kitchen.burners[0].item = 'patty';
    kitchen.burners[0].phase = 'cooking';
    kitchen.burners[0].progress = 0.55;
    kitchen.board.item = 'tomato';
    kitchen.board.progress = 0.45;
    chef.carrying = 'lettuce';
    chef.x = 800; // floor-relative: in front of the assembly counter
    chef.targetX = 800;
  }

  if (name === 'chop') {
    stageTicket(book, 'garden-salad', 0.8);
    stageTicket(book, 'classic-burger', 0.55);
    kitchen.board.item = 'tomato';
    kitchen.board.progress = 0.55;
    kitchen.plate = ['lettuceShreds'];
    kitchen.burners[1].item = 'eggFried';
    kitchen.burners[1].phase = 'done';
    kitchen.burners[1].progress = 0.2;
    chef.x = 150; // floor-relative: at the chopping board
    chef.targetX = 150;
  }

  // The rush scene: the whole game in one frame — a full board of four
  // tickets at four patience levels (a Classic Burger ready at the pass,
  // its ticket highlighted; a Deluxe Burger — the one half-stacked on the
  // assembly plate — in the gold hurry band; a Garden Salad running low;
  // and a Sunrise Plate critical in red), a patty mid-cook with its ring
  // half gone, a fried egg resting done on the other burner, a potato
  // mid-chop, and the chef carrying the next cheese slice while the combo
  // sits at x2 and the clock shows the rush.
  if (name === 'rush') {
    const ready = stageTicket(book, 'classic-burger', 0.62);
    stageTicket(book, 'deluxe-burger', 0.44);
    stageTicket(book, 'garden-salad', 0.28);
    stageTicket(book, 'sunrise-plate', 0.14);
    kitchen.passPlate = ['bun', 'pattyCooked', 'cheese'];
    kitchen.plate = ['bun', 'pattyCooked'];
    kitchen.burners[0].item = 'patty';
    kitchen.burners[0].phase = 'cooking';
    kitchen.burners[0].progress = 0.55;
    kitchen.burners[1].item = 'eggFried';
    kitchen.burners[1].phase = 'done';
    kitchen.burners[1].progress = 0.2;
    kitchen.board.item = 'potato';
    kitchen.board.progress = 0.5;
    chef.carrying = 'cheese';
    chef.x = 800; // floor-relative: in front of the assembly counter
    chef.targetX = 800;
    ctx.matchTicketId = ready.id;
  }

  // The results scene: the day is over and the summary screen (shown by
  // main.js for this shot) counts a strong service — a full till, a long
  // served list and a x3 best combo, with one heart lost along the way.
  if (name === 'results') {
    score.elapsed = 180;
    score.points = 1240;
    score.coins = 412;
    score.served = 19;
    score.combo = 4;
    score.bestCombo = 4;
    score.hearts = 2;
    score.lost = 1;
  }

  if (name === 'serve') {
    const ticket = stageTicket(book, 'classic-burger', 0.66);
    stageTicket(book, 'deluxe-burger', 0.38);
    stageTicket(book, 'sunrise-plate', 0.81);
    kitchen.passPlate = ['bun', 'pattyCooked', 'cheese'];
    kitchen.plate = ['friesDone'];
    kitchen.burners[0].item = 'pattyCooked';
    kitchen.burners[0].phase = 'done';
    kitchen.burners[0].progress = 0.1;
    chef.x = 290; // floor-relative: at the serving pass
    chef.targetX = 290;
    ctx.matchTicketId = ticket.id;
  }
}
