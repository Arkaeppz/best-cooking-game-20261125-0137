[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Arkaeppz/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Arkaeppz/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

# Sizzle & Serve — Kitchen Rush

An entry for the make.fun bounty
[Make the best cooking game](https://make.fun/bounty/best-cooking-game-20261125-0137).

A three-minute kitchen rush in the browser. Tickets land on the order board
with a patience bar; you walk the chef between the counter, the chopping
board, the two stove burners, the assembly plate and the serving pass. Six
dishes share prepped ingredients in different combinations — chop tomato,
lettuce and potato, cook patties, eggs and cut potato (grab them before they
burn), stack the plate to match a ticket and serve it before the customer
walks. Combos pay for speed; three lost orders end the service.

## Play

```sh
node serve.ts          # serves game/ on http://localhost:8080
```

Open the page in a desktop browser. Mouse: click bins and stations. Keys:
`1–7` counter bins, `B` board, `S` stove, `A` assembly, `P` pass, `T` bin.
No build step, no network: every file the game loads lives under `game/`,
and every sound is synthesized in code.

## Layout

- `main.ts` — the entry program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored library.
- `game/index.html`, `game/styles.css` — the page and the kitchen's look
  (all food is drawn with CSS shapes).
- `game/js/recipes.js` — ingredients, prep routes and the six-dish menu.
- `game/js/orders.js` — the order board: spawning and patience.
- `game/js/stations.js` — chopping board, burners, plate and pass.
- `game/js/chef.js` — the chef's walk and one-item carrying.
- `game/js/score.js` — score, tips, combos, hearts and the service clock.
- `game/js/sound.js` — a small WebAudio synth (no audio files).
- `game/js/shots.js` — staged scenes behind `?shot=`, used for the screenshots.
- `game/js/main.js` — boots the game and conducts the service.
- `screenshots/` — four real renders of the game, taken with `?shot=`.
