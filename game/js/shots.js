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
