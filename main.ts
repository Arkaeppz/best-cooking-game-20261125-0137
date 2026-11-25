// Entry for make.fun's "Make the best cooking game" bounty
// (best-cooking-game-20261125-0137). The game is Sizzle & Serve, a kitchen-rush
// game in this directory's game/ folder: plain static files a desktop browser
// loads offline (game/index.html and its ES modules, no library, no network).
//
// This program hands the game in: it copies game/ and screenshots/ from beside
// this file to /output and writes /output/dossier.json, the summary the judge
// reads, with buildDossier from the vendored make.fun library
// (vendor/makefun-game.ts, the kit's copy, unchanged). It runs twice and both
// runs write the same bytes.
//
// Play it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate's own caps, passed to the dossier builder so an entry the scorer
// would refuse is refused here first: at most 4 screenshots of 256 KiB each,
// at most 993 files and 48 MiB under game/, no game path over 1000 bytes.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
