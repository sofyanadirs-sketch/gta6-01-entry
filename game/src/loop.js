// Satu langkah dunia (1/60 detik): dipakai loop game DAN adegan screenshot,
// supaya frame screenshot adalah hasil nyata dari aturan yang sama.

import { updatePlayerOnFoot, playerPunch, updateThugs } from './player.js';
import { updateTraffic, updatePeds, updatePlayerCar, nearestStealableCar, enterCar, exitCar } from './vehicles.js';
import { updatePolice } from './police.js';
import { updateMissions, takeSideMission } from './missions.js';

export const STEP = 1 / 60;

export function advanceWorld(G, dt, mv, presses) {
  G.time += dt;
  G.clockMinutes += dt * 0.5;

  // Tombol sekali-tekan.
  if (presses.e) {
    const p = G.player;
    if (p.inCar) exitCar(G);
    else {
      const car = nearestStealableCar(G, 72);
      if (car) enterCar(G, car);
    }
  }
  if (presses.f) playerPunch(G);
  if (presses.q) takeSideMission(G);

  if (G.player.inCar) updatePlayerCar(G, dt, mv, presses);
  else updatePlayerOnFoot(G, dt, mv, presses);

  updateTraffic(G, dt);
  updatePeds(G, dt);
  updateThugs(G, dt);
  updatePolice(G, dt);
  updateMissions(G, dt);

  // Partikel + jejak ban memudar.
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const pt = G.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.96;
    pt.vy *= 0.96;
    if (pt.life <= 0) G.particles.splice(i, 1);
  }
  for (let i = G.skids.length - 1; i >= 0; i--) {
    G.skids[i].life -= dt;
    if (G.skids[i].life <= 0) G.skids.splice(i, 1);
  }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 26);

  // Autosave tiap 30 detik.
  G.saveTimer += dt;
  if (G.saveTimer > 30) {
    G.saveTimer = 0;
    G.saveGame();
  }
}
