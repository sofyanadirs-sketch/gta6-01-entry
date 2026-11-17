// Boot + loop utama Ojek GTA: Raja Jalanan Kota Senja.
// ?seed=N menetapkan dunia. ?shot=start|play|chase|fight|end (+seed)
// memanggungkan satu adegan deterministik lalu menandai window.__shotReady.

import { STEP, advanceWorld } from './loop.js';
import { makeRng } from './random.js';
import { buildWorld } from './world.js';
import { createPlayer, createThug } from './player.js';
import { spawnTraffic, spawnParked, spawnPeds } from './vehicles.js';
import { createMissionState, startStoryStep } from './missions.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render.js';
import { drawHud, drawTitle, drawPaused, drawGameOver } from './hud.js';
import { saveGame, loadSave, applySave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

export function createGame(seedValue) {
  const world = buildWorld(seedValue);
  const start = world.landmarks.start;
  const G = {
    seed: seedValue,
    rng: makeRng(seedValue * 7919 + 13),
    world,
    time: 0,
    clockMinutes: 0,
    screen: 'title',
    overReason: null,
    player: createPlayer(start.x, start.y),
    cars: [],
    peds: [],
    police: [],
    thugs: [],
    particles: [],
    skids: [],
    toasts: [],
    missions: createMissionState(),
    wanted: 0,
    wantedTimer: 0,
    bustTimer: 0,
    shake: 0,
    stats: { steals: 0, kos: 0, deliveries: 0 },
    saveTimer: 0,
    hasSave: false,
    mouse: { x: 0, y: 0, clicked: false },
    audio,
  };
  G.toast = (text, color) => {
    G.toasts.push({ text, color: color || '#e8e8e8', until: G.time + 3.4 });
    if (G.toasts.length > 4) G.toasts.shift();
  };
  G.saveGame = () => saveGame(G);
  G.gameOver = (reason) => {
    if (G.screen !== 'play') return;
    G.overReason = reason;
    G.screen = 'over';
    audio.fail();
    audio.stopEngine();
    audio.siren(false);
    G.saveGame();
    statusEl.textContent = reason === 'wasted' ? 'Game over: wasted.' : 'Game over: busted.';
  };
  // Isi dunia: lalu lintas, mobil parkir, pejalan kaki, preman.
  spawnTraffic(G, 26);
  spawnParked(G);
  spawnPeds(G, 26);
  const plaza = world.landmarks.plaza;
  const gang = world.landmarks.gang;
  G.thugs.push(createThug(plaza.x + 90, plaza.y - 40, G.rng));
  G.thugs.push(createThug(gang.x - 60, gang.y + 50, G.rng));
  G.thugs.push(createThug(world.landmarks.pasar.x + 40, world.landmarks.pasar.y - 60, G.rng));
  return G;
}

let G = createGame(seed);
const saved = loadSave();
G.hasSave = !!saved;

function announce(msg) {
  statusEl.textContent = msg;
}

function startGame(useSave) {
  G = createGame(seed);
  if (useSave && saved) {
    applySave(G, saved);
    G.hasSave = true;
    G.toast('Save dimuat — lanjutkan perjuangan!', '#a8e8a8');
  }
  G.screen = 'play';
  audio.unlock();
  audio.startMusic();
  startStoryStep(G);
  announce('Main. Antar penumpang pertama di Taman Senja.');
}

function respawnAfterOver() {
  const money = Math.floor(G.player.money * 0.9);
  const storyIndex = G.missions.storyIndex;
  const stepIndex = G.missions.stepIndex;
  const completed = G.missions.completed.slice();
  const sideDone = G.missions.sideDone;
  const stats = { ...G.stats };
  G = createGame(seed);
  G.player.money = money;
  G.missions.storyIndex = storyIndex;
  G.missions.stepIndex = stepIndex;
  G.missions.completed = completed;
  G.missions.sideDone = sideDone;
  G.stats = stats;
  G.screen = 'play';
  G.cars = G.cars.filter((c) => c.kind !== 'rival');
  startStoryStep(G);
  G.toast('Budi bangkit lagi — denda 10% uang.', '#ffd76a');
  announce('Main lagi.');
}

function runShot(name) {
  const scene = stageShot(name, G);
  const { view } = renderer.draw(G, scene.screen);
  if (scene.screen === SCREEN_TITLE) drawTitle(renderer.ctx, G, view);
  else drawHud(renderer.ctx, G, view);
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();
  let titleButton = null;

  function handlePresses() {
    const presses = input.takePresses();
    const mouse = input.mouse();
    G.mouse.x = mouse.x;
    G.mouse.y = mouse.y;
    if (mouse.clicked) {
      audio.unlock();
      G.mouse.clicked = true;
      if (G.screen === 'title' && titleButton) {
        const b = titleButton;
        if (mouse.x >= b.x && mouse.x <= b.x + b.w && mouse.y >= b.y && mouse.y <= b.y + b.h) {
          startGame(true);
          return;
        }
      }
      if (G.screen === 'over') {
        respawnAfterOver();
        return;
      }
    } else {
      G.mouse.clicked = false;
    }
    for (const code of presses) {
      if (code === 'KeyM') {
        audio.setMuted(!audio.isMuted());
        G.toast(audio.isMuted() ? 'Suara mati' : 'Suara nyala', '#e8e8e8');
      }
      if (G.screen === 'title' && (code === 'Space' || code === 'Enter')) {
        startGame(true);
        return;
      }
      if (G.screen === 'over' && (code === 'Space' || code === 'Enter')) {
        respawnAfterOver();
        return;
      }
      if (code === 'KeyP' || code === 'Escape') {
        if (G.screen === 'play') {
          G.screen = 'paused';
          audio.stopEngine();
          announce('Pause.');
        } else if (G.screen === 'paused') {
          G.screen = 'play';
          announce('Main.');
        }
      }
    }
    return presses;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const presses = handlePresses() || [];
    const pressSet = {
      e: presses.includes('KeyE'),
      f: presses.includes('KeyF'),
      q: presses.includes('KeyQ'),
      space: input.held('Space'),
    };
    const mv = input.moveVector();
    mv.shift = input.held('ShiftLeft') || input.held('ShiftRight');
    if (G.screen === 'title') {
      // Latar hidup: lalu lintas jalan, misi belum mulai.
      while (accumulator >= STEP) {
        advanceWorld(G, STEP, { x: 0, y: 0, shift: false }, {});
        accumulator -= STEP;
      }
    } else if (G.screen === 'play') {
      while (accumulator >= STEP && G.screen === 'play') {
        advanceWorld(G, STEP, mv, pressSet);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const { view } = renderer.draw(G, G.screen);
    if (G.screen === SCREEN_TITLE) {
      titleButton = drawTitle(renderer.ctx, G, view);
    } else if (G.screen === SCREEN_PLAY) {
      drawHud(renderer.ctx, G, view);
    } else if (G.screen === SCREEN_PAUSED) {
      drawHud(renderer.ctx, G, view);
      drawPaused(renderer.ctx, G, view);
    } else if (G.screen === SCREEN_OVER) {
      drawGameOver(renderer.ctx, G, view);
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.screen === 'play') {
      G.screen = 'paused';
      audio.stopEngine();
      announce('Pause.');
    }
  });

  announce('Ojek GTA: Raja Jalanan Kota Senja. Tekan Spasi atau klik MULAI.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
