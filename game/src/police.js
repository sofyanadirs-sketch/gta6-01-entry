// Polisi Kota Senja: jumlah mobil patroli mengikuti bintang wanted,
// mengejar pemain, menabrak, dan menangkap (busted) kalau pemain jalan
// kaki terlalu lama di dekat mereka. Wanted turun kalau pemain menghilang.

import { PALETTE, ROAD_LINES, WORLD, WANTED } from './config.js';
import { clamp, angleDiff, pick } from './random.js';
import { roadCenter, hitsBuilding } from './world.js';
import { hurtPlayer, spawnParticles } from './player.js';
import { makeCar } from './vehicles.js';

export function desiredPoliceCount(wanted) {
  if (wanted <= 0) return 0;
  return Math.min(wanted + 1, 5);
}

export function spawnPoliceCar(G) {
  const p = G.player;
  // Spawn di jalan, 650-950 px dari pemain, di luar layar.
  for (let tries = 0; tries < 12; tries++) {
    const line = pick(G.rng, ROAD_LINES);
    const vertical = G.rng() < 0.5;
    const along = (G.rng() * (WORLD - 200)) + 100;
    const x = vertical ? roadCenter(line) : along;
    const y = vertical ? along : roadCenter(line);
    const d = Math.hypot(x - p.x, y - p.y);
    if (d > 600 && d < 1100) {
      const c = makeCar(x, y, vertical ? Math.PI / 2 : 0, PALETTE.police, 'police');
      c.siren = true;
      c.speed = 200;
      G.police.push(c);
      G.cars.push(c);
      return c;
    }
  }
  return null;
}

export function updatePolice(G, dt) {
  // Jaga jumlah patroli sesuai wanted.
  const want = desiredPoliceCount(G.wanted);
  while (G.police.length < want) {
    if (!spawnPoliceCar(G)) break;
  }
  while (G.police.length > want) {
    const c = G.police.pop();
    const i = G.cars.indexOf(c);
    if (i >= 0) G.cars.splice(i, 1);
  }

  const p = G.player;
  let nearestCop = Infinity;
  for (const c of G.police) {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < nearestCop) nearestCop = d;
    // Kejar pemain: belok ke arah pemain, gas pol.
    const targetAngle = Math.atan2(p.y - c.y, p.x - c.x);
    const diff = angleDiff(c.angle, targetAngle);
    const maxSpeed = 300 + G.wanted * 32;
    c.angle += clamp(diff, -2.4 * dt, 2.4 * dt);
    c.speed = Math.min(maxSpeed, c.speed + 260 * dt);
    // Kalau nabrak gedung, putar balik pelan.
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    if (hitsBuilding(G.world, nx, ny, 18)) {
      c.angle += Math.PI * 0.7;
      c.speed *= 0.4;
    } else {
      c.x = nx;
      c.y = ny;
    }
    // Terlalu jauh: teleport lebih dekat (tetap di jalan, di luar layar).
    if (d > 1500) {
      const spot = spawnPoliceCar(G);
      if (spot) {
        const i = G.cars.indexOf(c);
        if (i >= 0) G.cars.splice(i, 1);
        G.police.splice(G.police.indexOf(c), 1);
      }
    }
    // Tabrak pemain yang naik mobil.
    if (p.inCar) {
      const cd = Math.hypot(p.x - c.x, p.y - c.y);
      if (cd < 42) {
        c.speed *= 0.55;
        p.inCar.speed *= 0.82;
        hurtPlayer(G, 3, 'Polisi menabrak mobilmu!');
        spawnParticles(G, p.x, p.y, '#8ab8ff', 8, 160);
      }
    }
  }

  // Wanted turun kalau tidak ada polisi dekat untuk sementara waktu.
  if (G.wanted > 0) {
    if (nearestCop > 520) {
      G.wantedTimer -= dt;
      if (G.wantedTimer <= 0) {
        G.wanted -= 1;
        G.wantedTimer = WANTED.decaySeconds;
        if (G.wanted === 0) G.toast('Polisi kehilangan jejakmu.', '#a8e8a8');
        else G.toast(`Wanted turun jadi ${G.wanted} bintang.`, '#a8e8a8');
      }
    } else {
      G.wantedTimer = WANTED.decaySeconds;
    }
  }

  // Busted: pemain jalan kaki, polisi nempel lama.
  if (G.wanted > 0 && !p.inCar) {
    if (nearestCop < WANTED.bustDistance) {
      G.bustTimer += dt;
      if (G.bustTimer > WANTED.bustSeconds) G.gameOver('busted');
    } else {
      G.bustTimer = 0;
    }
  } else {
    G.bustTimer = 0;
  }

  // Sirene nyala kalau ada polisi aktif.
  G.audio.siren(G.police.length > 0);
}
