// main.js — boots Sizzle & Serve and conducts the whole service: it owns the
// game state, wires the counter bins and stations to the chef's walk, runs the
// frame loop (clock, orders, stations, chef), renders everything, and stages
// the frozen scenes the screenshots are taken from
// (?shot=cover|rush|serve|results|menu).

import { INGREDIENTS, RECIPES, STATE_NAMES, plateMatchesRecipe, prepStationFor, recipeById } from './recipes.js';
import { createOrderBook, patienceFraction, updateOrders } from './orders.js';
import { createKitchen, startChopping, startCooking, updateStations, takeFromBoard, takeFromBurner, addToPlate, movePlateToPass, clearPass } from './stations.js';
import { createChef, sendChefTo, updateChef, pickUp, putDown, handsFree } from './chef.js';
import { createScore, payForDish, loseOrder, isDayOver, secondsLeft, formatClock, SERVICE_SECONDS } from './score.js';
import { sound } from './sound.js';
import { stageShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');

// A small seeded RNG so a service (and a screenshot) is reproducible.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
let rng = mulberry32(Number(params.get('seed') ?? (Date.now() % 100000)));

let mode = 'title'; // title | playing | over | shot
let book = createOrderBook();
let kitchen = createKitchen();
let chef = createChef();
let score = createScore();
let pendingAction = null;
let matchTicketId = null;
let chopSoundTimer = 0;

// ---------- geometry: where things stand on the stage ----------

function stageX(el) {
  const stageRect = stage.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const scale = stageRect.width / 1280;
  return (rect.left + rect.width / 2 - stageRect.left) / scale;
}

function fitStage() {
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 800);
  stage.style.transform = `scale(${scale})`;
  stage.style.marginTop = `${Math.max(0, (window.innerHeight - 800 * scale) / 2)}px`;
}

// ---------- small feedback helpers ----------

let toastTimer = 0;
function toast(text) {
  const el = $('toast');
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

function floater(text, x, y, bad = false) {
  const el = document.createElement('div');
  el.className = `floater${bad ? ' bad' : ''}`;
  el.textContent = text;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  $('floaters').appendChild(el);
  setTimeout(() => el.remove(), 1150);
}

function flash(el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
function deny(el) { el.classList.remove('denied'); void el.offsetWidth; el.classList.add('denied'); }

// ---------- rendering ----------

function foodHTML(state) {
  return `<div class="food food-${state}" title="${STATE_NAMES[state] ?? state}"></div>`;
}

function stackHTML(items) {
  if (!items || items.length === 0) return '';
  const layers = items.map((state) => `<div class="layer layer-${state}" title="${STATE_NAMES[state] ?? state}"></div>`).join('');
  return `<div class="stack">${layers}</div>`;
}

function layerBarsHTML(items) {
  return items.map((state) => {
    const colour = { bun: '#dd9435', pattyCooked: '#5d3a1e', cheese: '#f7a81b', tomatoSlices: '#c22f21', lettuceShreds: '#3e9e57', eggFried: '#f5c542', friesDone: '#e39a1e' }[state] ?? '#999';
    return `<div class="layer" style="background:${colour}">${STATE_NAMES[state] ?? state}</div>`;
  }).join('');
}

let lastTicketKey = '';
function renderTickets() {
  const key = book.tickets.map((t) => t.id).join(',') + '|' + (matchTicketId ?? '');
  if (key !== lastTicketKey) {
    lastTicketKey = key;
    $('tickets').innerHTML = book.tickets.map((ticket) => {
      const recipe = recipeById(ticket.recipeId);
      return `<div class="ticket" id="ticket-${ticket.id}">
        <h3>${recipe.name}<span class="price">$${recipe.price}</span></h3>
        <div class="layers">${layerBarsHTML(recipe.items)}</div>
        <div class="patience"><div class="patience-fill"></div></div>
      </div>`;
    }).join('');
    for (const ticket of book.tickets) {
      const el = $(`ticket-${ticket.id}`);
      if (ticket.id === matchTicketId) el.classList.add('match');
    }
  }
  for (const ticket of book.tickets) {
    const el = $(`ticket-${ticket.id}`);
    if (!el) continue;
    const frac = patienceFraction(ticket);
    el.querySelector('.patience-fill').style.width = `${frac * 100}%`;
    el.classList.toggle('hurry', frac < 0.5 && frac >= 0.25);
    el.classList.toggle('critical', frac < 0.25);
  }
}

let lastPlateKey = '';
function renderKitchen() {
  const plateKey = JSON.stringify([kitchen.plate, kitchen.passPlate, chef.carrying, kitchen.board.item]);
  if (plateKey !== lastPlateKey) {
    lastPlateKey = plateKey;
    $('plate').innerHTML = stackHTML(kitchen.plate);
    $('pass-plate').innerHTML = stackHTML(kitchen.passPlate);
    $('station-pass').classList.toggle('ready', kitchen.passPlate !== null);
    $('pass-hint').textContent = kitchen.passPlate
      ? 'a plate is ready — click the pass to serve it'
      : 'click a finished plate here to serve it';
    $('board-item').innerHTML = kitchen.board.item ? foodHTML(kitchen.board.item) : '';
    $('chef-hands').innerHTML = chef.carrying ? foodHTML(chef.carrying) : '';
  }
  // Board progress bar.
  const boardActive = kitchen.board.item !== null;
  $('board-progress').style.display = boardActive ? 'block' : 'none';
  if (boardActive) $('board-progress-fill').style.width = `${kitchen.board.progress * 100}%`;
  // Burners.
  kitchen.burners.forEach((burner, i) => {
    const el = $(`burner-${i}`);
    el.querySelector('.burner-item').innerHTML = burner.item
      ? foodHTML(burner.phase === 'burnt' ? 'burnt' : burner.item)
      : '';
    const ring = el.querySelector('.ring-fill');
    const shown = burner.phase === 'empty' ? 0 : burner.progress;
    ring.style.strokeDashoffset = String(119.4 * (1 - shown));
    el.classList.toggle('done', burner.phase === 'done' && burner.progress < 0.6);
    el.classList.toggle('burning', burner.phase === 'burnt' || (burner.phase === 'done' && burner.progress >= 0.6));
  });
}

function renderChef() {
  const el = $('chef');
  el.style.left = `${chef.x}px`;
  el.classList.toggle('flip', chef.facing < 0);
}

function renderHud() {
  const left = secondsLeft(score);
  $('clock-text').textContent = formatClock(left);
  $('clock-text').classList.toggle('late', left <= 30 && mode === 'playing');
  $('clock-fill').style.width = `${(left / SERVICE_SECONDS) * 100}%`;
  $('score-text').textContent = String(score.points);
  $('coins-text').textContent = `$${score.coins}`;
  $('combo-text').textContent = `×${Math.min(1 + score.combo * 0.5, 3).toFixed(1).replace('.0', '')}`;
  $('served-text').textContent = String(score.served);
  $('hearts-text').textContent = '♥'.repeat(Math.max(0, score.hearts)) + '♡'.repeat(Math.max(0, 3 - score.hearts));
  const rush = score.elapsed / SERVICE_SECONDS;
  $('rush-fill').style.width = `${rush * 100}%`;
  $('rush-text').textContent = score.elapsed < 30 ? 'doors open…'
    : score.elapsed < 75 ? 'warming up — regulars first'
    : score.elapsed < 120 ? 'the rush is on — tickets stack up'
    : score.elapsed < 160 ? 'full house! keep the pass moving'
    : 'last orders — finish strong';
}

function render() {
  // Which ticket the pass plate would serve (highlighted on the board).
  matchTicketId = null;
  if (kitchen.passPlate) {
    const match = book.tickets.find((t) => plateMatchesRecipe(kitchen.passPlate, recipeById(t.recipeId)));
    if (match) matchTicketId = match.id;
  }
  renderTickets();
  renderKitchen();
  renderChef();
  renderHud();
}

// ---------- player actions (run when the chef arrives) ----------

function goTo(el, action) {
  sendChefTo(chef, stageX(el));
  pendingAction = action;
  if (Math.abs(chef.targetX - chef.x) < 3) {
    pendingAction = null;
    action();
  }
}

function onBin(item) {
  if (!handsFree(chef)) { toast('Hands full — the chef carries one thing at a time'); return; }
  pickUp(chef, item);
  sound.pickup();
}

function onBoard() {
  const el = $('station-board');
  if (!handsFree(chef)) {
    if (startChopping(kitchen, chef.carrying)) { putDown(chef); sound.chop(); flash(el); }
    else if (kitchen.board.item) toast('The board is busy');
    else toast(`${STATE_NAMES[chef.carrying]} doesn't need chopping`);
    return;
  }
  const item = takeFromBoard(kitchen);
  if (item) { pickUp(chef, item); sound.pickup(); }
  else if (kitchen.board.item) toast('Still chopping…');
  else toast('Bring a tomato, lettuce or potato to chop');
}

function onBurner(index) {
  const burner = kitchen.burners[index];
  const el = $(`burner-${index}`);
  if (!handsFree(chef)) {
    if (startCooking(kitchen, chef.carrying)) { putDown(chef); sound.sizzle(); flash($('station-stove')); }
    else if (burner.phase !== 'empty') toast('That burner is busy');
    else toast(`${STATE_NAMES[chef.carrying]} doesn't go on the stove`);
    return;
  }
  const taken = takeFromBurner(kitchen, index);
  if (taken === 'burnt') { toast('Burnt — binned it'); sound.pop(); }
  else if (taken) { pickUp(chef, taken); sound.pickup(); }
  else if (burner.phase === 'cooking') toast(`Still cooking — ${Math.round(burner.progress * 100)}%`);
  else toast('That burner is free');
}

function onStove() {
  if (!handsFree(chef)) { onBurner(kitchen.burners.findIndex((b) => b.phase === 'empty')); return; }
  const doneIndex = kitchen.burners.findIndex((b) => b.phase === 'done');
  if (doneIndex >= 0) { onBurner(doneIndex); return; }
  const burntIndex = kitchen.burners.findIndex((b) => b.phase === 'burnt');
  if (burntIndex >= 0) { onBurner(burntIndex); return; }
  toast('Nothing ready on the stove yet');
}

function servePassPlate() {
  const match = book.tickets.find((t) => plateMatchesRecipe(kitchen.passPlate, recipeById(t.recipeId)));
  if (!match) {
    deny($('station-pass'));
    sound.buzz();
    toast('No ticket matches that plate');
    return;
  }
  const recipe = recipeById(match.recipeId);
  const earned = payForDish(score, recipe, patienceFraction(match));
  book.tickets.splice(book.tickets.indexOf(match), 1);
  book.servedCount += 1;
  clearPass(kitchen);
  lastTicketKey = '';
  sound.bell();
  const rect = $('station-pass').getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const scale = stageRect.width / 1280;
  floater(`+${earned}`, (rect.left - stageRect.left) / scale + 60, (rect.top - stageRect.top) / scale + 10);
  toast(`${recipe.name} served!`);
}

function onPass() {
  if (kitchen.passPlate) { servePassPlate(); return; }
  if (kitchen.plate.length > 0) {
    if (movePlateToPass(kitchen)) {
      sound.plated();
      if (book.tickets.some((t) => plateMatchesRecipe(kitchen.passPlate, recipeById(t.recipeId)))) servePassPlate();
      else toast('Plate is at the pass — bin it or wait for its ticket');
    }
    return;
  }
  toast('Assemble a dish on the plate first');
}

function onAssembly() {
  if (!handsFree(chef)) {
    addToPlate(kitchen, putDown(chef));
    sound.plated();
    flash($('station-assembly'));
    return;
  }
  if (kitchen.plate.length > 0) { onPass(); return; }
  if (kitchen.passPlate) {
    kitchen.plate = clearPass(kitchen);
    toast('Plate back on the counter');
    return;
  }
  toast('Carry an ingredient here to start a dish');
}

function onTrash() {
  if (!handsFree(chef)) { putDown(chef); sound.pop(); toast('Binned'); return; }
  if (kitchen.passPlate) { clearPass(kitchen); sound.pop(); toast('Plate binned'); return; }
  deny($('bin-trash'));
}

// ---------- wiring ----------

document.querySelectorAll('.bin[data-item]').forEach((el) => {
  el.addEventListener('click', () => { if (mode === 'playing') goTo(el, () => onBin(el.dataset.item)); });
});
$('bin-trash').addEventListener('click', () => { if (mode === 'playing') goTo($('bin-trash'), onTrash); });
$('station-board').addEventListener('click', () => { if (mode === 'playing') goTo($('station-board'), onBoard); });
$('station-stove').addEventListener('click', () => { if (mode === 'playing') goTo($('station-stove'), onStove); });
[0, 1].forEach((i) => $(`burner-${i}`).addEventListener('click', (ev) => {
  ev.stopPropagation();
  if (mode === 'playing') goTo($('station-stove'), () => onBurner(i));
}));
$('station-assembly').addEventListener('click', () => { if (mode === 'playing') goTo($('station-assembly'), onAssembly); });
$('station-pass').addEventListener('click', () => { if (mode === 'playing') goTo($('station-pass'), onPass); });

const BIN_KEYS = ['bun', 'patty', 'cheese', 'tomato', 'lettuce', 'egg', 'potato'];
window.addEventListener('keydown', (ev) => {
  if (mode !== 'playing') return;
  const key = ev.key.toLowerCase();
  if (/^[1-7]$/.test(key)) {
    const el = document.querySelector(`.bin[data-item="${BIN_KEYS[Number(key) - 1]}"]`);
    goTo(el, () => onBin(BIN_KEYS[Number(key) - 1]));
  }
  else if (key === 'b') goTo($('station-board'), onBoard);
  else if (key === 's') goTo($('station-stove'), onStove);
  else if (key === 'a') goTo($('station-assembly'), onAssembly);
  else if (key === 'p') goTo($('station-pass'), onPass);
  else if (key === 't') goTo($('bin-trash'), onTrash);
});

// ---------- the service ----------

function resetService() {
  book = createOrderBook();
  kitchen = createKitchen();
  chef = createChef();
  score = createScore();
  pendingAction = null;
  matchTicketId = null;
  lastTicketKey = '';
  lastPlateKey = '';
  rng = mulberry32(Date.now() % 100000);
}

function endService() {
  mode = 'over';
  $('over-title').textContent = score.hearts <= 0 ? 'THE CUSTOMERS WALKED OUT' : 'SERVICE OVER';
  $('over-line').textContent = score.hearts <= 0
    ? 'Three lost orders and the dining room emptied. The kitchen lives to cook another day.'
    : 'The last ticket is done and the pass is clear. Time to count the till.';
  $('over-stats').innerHTML = [
    ['SCORE', score.points],
    ['DISHES SERVED', score.served],
    ['TILL', `$${score.coins}`],
    ['BEST COMBO', `×${Math.min(1 + score.bestCombo * 0.5, 3).toFixed(1).replace('.0', '')}`],
  ].map(([label, value]) => `<div class="stat"><label>${label}</label><strong>${value}</strong></div>`).join('');
  $('screen-title').classList.add('hidden');
  $('screen-over').classList.remove('hidden');
  $('overlay').classList.remove('hidden');
}

function startService() {
  resetService();
  mode = 'playing';
  $('overlay').classList.add('hidden');
  toast('First tickets coming in — good luck, chef!');
}

$('btn-start').addEventListener('click', startService);
$('btn-again').addEventListener('click', startService);

// ---------- frame loop ----------

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  if (mode === 'playing') {
    score.elapsed += dt;
    for (const event of updateOrders(book, dt, score.elapsed, rng)) {
      if (event.type === 'expired') {
        loseOrder(score);
        lastTicketKey = '';
        sound.buzz();
        floater('ticket lost!', 120, 130, true);
      }
    }
    for (const event of updateStations(kitchen, dt)) {
      if (event.type === 'cooked') { sound.sizzle(); toast('One ready on the stove!'); }
      if (event.type === 'burnt') { sound.buzz(); toast('Something burnt on the stove!'); }
      if (event.type === 'chopped') sound.chop();
    }
    if (kitchen.board.item && kitchen.board.progress < 1) {
      chopSoundTimer -= dt;
      if (chopSoundTimer <= 0) { sound.chop(); chopSoundTimer = 0.3; }
    }
    if (updateChef(chef, dt) && pendingAction) {
      const action = pendingAction;
      pendingAction = null;
      action();
    }
    render();
    if (isDayOver(score)) endService();
  }
  requestAnimationFrame(frame);
}

// ---------- boot: menu cards, bin faces, fit, screenshots ----------

function buildMenuCards() {
  $('menu-cards').innerHTML = RECIPES.map((recipe) => `
    <div class="menu-card">
      <h4>${recipe.name}</h4>
      <div class="layers">${recipe.items.map((state) => `<div class="layer layer-${state}"></div>`).join('')}</div>
      <div class="price">$${recipe.price}</div>
    </div>`).join('');
}

document.querySelectorAll('.bin-food[data-food]').forEach((el) => {
  el.classList.add('food', `food-${el.dataset.food}`);
});

buildMenuCards();
fitStage();
window.addEventListener('resize', fitStage);

if (shotName) {
  mode = 'shot';
  const ctx = { book, kitchen, score, chef, matchTicketId: null };
  stageShot(shotName, ctx);
  matchTicketId = ctx.matchTicketId;
  if (shotName === 'results') endService(); // the day-summary screen is the scene
  else if (shotName !== 'menu') $('overlay').classList.add('hidden');
  render();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
} else {
  render();
  requestAnimationFrame(frame);
}
