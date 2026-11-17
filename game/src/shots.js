// Adegan screenshot ?shot=start|play|chase|fight|end (dengan &seed=N).
// Tiap adegan menjalankan aturan asli maju sejumlah langkah tetap dengan
// input skrip, jadi frame-nya adalah permainan nyata — dan seed yang sama
// selalu memberi frame yang sama.

import { STEP, advanceWorld } from './loop.js';
import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';
import { addWanted } from './player.js';
import { enterCar } from './vehicles.js';
import { startStoryStep } from './missions.js';

function driveForward(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    advanceWorld(G, STEP, { x: 0, y: -1, shift: false }, {});
  }
}

function walkForward(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    advanceWorld(G, STEP, { x: 0, y: -1, shift: false }, {});
  }
}

export function stageShot(name, G) {
  if (name === 'play') {
    // Budi nyetir taksi di jalan ramai, misi 1 aktif (jemput Bu Sari).
    G.screen = 'play';
    const taxi = G.cars.find((c) => c.taxi);
    if (taxi) enterCar(G, taxi);
    G.player.money = 125000;
    G.wanted = 0; // taksi pangkalan bukan curian di adegan ini
    G.wantedTimer = 0;
    // Hadap barat (ke tengah kota), jalan pelan supaya tetap di jalan.
    G.player.inCar.angle = Math.PI;
    driveForward(G, 2.2);
    for (let i = 0; i < Math.round(0.8 / STEP); i++) {
      advanceWorld(G, STEP, { x: 0.4, y: -1, shift: false }, {});
    }
    driveForward(G, 0.8);
    // Frame akhir yang bersih: taksi sempat nabrak pejalan kaki di tengah
    // jalan skrip — wanted & polisi dari insiden itu dibersihkan supaya
    // cover menunjukkan kota + misi, bukan kejar-kejaran.
    G.wanted = 0;
    G.wantedTimer = 0;
    for (const c of G.police) {
      const i = G.cars.indexOf(c);
      if (i >= 0) G.cars.splice(i, 1);
    }
    G.police = [];
    G.toasts = [];
    G.audio.siren(false);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Kejar-kejaran: wanted 3, 3 mobil polisi mengejar Budi.
    G.screen = 'play';
    const taxi = G.cars.find((c) => c.taxi);
    if (taxi) enterCar(G, taxi);
    G.player.money = 340000;
    G.wanted = 0;
    addWanted(G, 3, '');
    driveForward(G, 4);
    for (let i = 0; i < Math.round(3 / STEP); i++) {
      advanceWorld(G, STEP, { x: -0.4, y: -1, shift: false }, { space: i % 90 < 20 });
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'fight') {
    // Jalan kaki di plaza: preman mengejar, Bu Sari menunggu, misi aktif.
    G.screen = 'play';
    G.player.money = 87500;
    G.player.x = G.world.landmarks.plaza.x - 40;
    G.player.y = G.world.landmarks.plaza.y + 60;
    // Pancing satu preman sampai nempel — adegan pukul-pukulan terbaca.
    const t = G.thugs[0];
    t.x = G.player.x + 44;
    t.y = G.player.y - 12;
    walkForward(G, 2.5);
    // Budi mukul sekali; frame diambil selagi partikel masih ada.
    advanceWorld(G, STEP, { x: 0, y: 0, shift: false }, { f: true });
    walkForward(G, 0.15);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    // Misi selesai: banner + uang, di depan Stasiun Kota.
    G.screen = 'play';
    G.player.money = 500000;
    G.player.x = G.world.landmarks.stasiun.x;
    G.player.y = G.world.landmarks.stasiun.y + 40;
    G.missions.banner = { text: 'MISI SELESAI: Penumpang Pertama', sub: '+Rp50.000 — Misi berikut: Kejar Si Jago', until: G.time + 30 };
    G.missions.storyIndex = 1;
    G.missions.stepIndex = 0;
    startStoryStep(G);
    walkForward(G, 1);
    return { screen: SCREEN_PLAY };
  }
  // Default: start — dunia hidup 5 detik di balik layar judul.
  G.screen = 'title';
  for (let i = 0; i < Math.round(5 / STEP); i++) {
    advanceWorld(G, STEP, { x: 0, y: 0, shift: false }, {});
  }
  return { screen: SCREEN_TITLE };
}
