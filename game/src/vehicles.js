// Kendaraan: lalu lintas NPC di jalan, mobil parkir yang bisa dicuri,
// dan mobil yang dikendarai pemain. Fisika arcade sederhana: gas, rem,
// belok, selip, tabrakan gedung/mobil/pejalan kaki.

import { CAR, PALETTE, ROAD_LINES, WORLD } from './config.js';
import { clamp, dist2, pick, range, rangeInt, angleDiff } from './random.js';
import { hitsBuilding, insideWorld, roadCenter, isRoadAt } from './world.js';
import { addWanted, hurtPlayer, spawnParticles } from './player.js';

export function makeCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0, color: color || '#e84a4a',
    kind: kind || 'traffic', // traffic | parked | player | police | rival
    hp: 100, steer: 0, width: 44, length: 24,
    roadLine: null, vertical: true, dir: 1, lane: 24,
    cruise: 150, stuck: 0, honkTimer: 0, siren: false,
  };
}

export function spawnTraffic(G, count) {
  for (let i = 0; i < count; i++) {
    const line = pick(G.rng, ROAD_LINES);
    const vertical = G.rng() < 0.5;
    const dir = G.rng() < 0.5 ? 1 : -1;
    const along = range(G.rng, 100, WORLD - 100);
    const lane = (G.rng() < 0.5 ? -24 : 24) * dir;
    const c = makeCar(
      vertical ? roadCenter(line) + lane : along,
      vertical ? along : roadCenter(line) + lane,
      vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      pick(G.rng, PALETTE.carColors),
      'traffic',
    );
    c.roadLine = line;
    c.vertical = vertical;
    c.dir = dir;
    c.lane = lane;
    c.cruise = range(G.rng, 110, 190);
    c.speed = c.cruise;
    G.cars.push(c);
  }
}

export function spawnParked(G) {
  for (const spot of G.world.parkedSpots) {
    const c = makeCar(spot.x, spot.y, spot.angle, pick(G.rng, PALETTE.carColors), 'parked');
    G.cars.push(c);
  }
  // Satu taksi kuning di pangkalan ojek — parkir DI jalan (bukan di blok).
  const s = G.world.landmarks.start;
  const taxi = makeCar(s.x + 60, roadCenter(30), 0, PALETTE.taxi, 'parked');
  taxi.taxi = true;
  G.cars.push(taxi);
}

// Mobil di depan (searah jalan) — dipakai traffic untuk mengerem.
function carAhead(G, car, dist) {
  let best = null;
  let bestD = dist;
  for (const o of G.cars) {
    if (o === car || o.kind === 'parked') continue;
    const dx = o.x - car.x;
    const dy = o.y - car.y;
    const forward = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    const side = Math.abs(-Math.sin(car.angle) * dx + Math.cos(car.angle) * dy);
    if (forward > 0 && forward < bestD && side < 26) { bestD = forward; best = o; }
  }
  return best;
}

export function updateTraffic(G, dt) {
  for (const c of G.cars) {
    if (c.kind !== 'traffic' && c.kind !== 'rival') continue;
    // Lalu lintas lurus di jalurnya; belok tidak dipakai supaya mobil tidak
    // pernah memotong blok gedung.
    const ahead = carAhead(G, c, 90);
    const target = ahead ? 0 : c.cruise;
    c.speed += clamp(target - c.speed, -260 * dt, 180 * dt);
    const nx = c.x + Math.cos(c.angle) * c.speed * dt;
    const ny = c.y + Math.sin(c.angle) * c.speed * dt;
    // Tetap di jalurnya (koreksi pelan ke garis lajur).
    if (c.vertical) {
      const wantX = roadCenter(c.roadLine) + c.lane;
      c.x = nx + clamp(wantX - nx, -40 * dt, 40 * dt);
      c.y = ny;
    } else {
      const wantY = roadCenter(c.roadLine) + c.lane;
      c.y = ny + clamp(wantY - ny, -40 * dt, 40 * dt);
      c.x = nx;
    }
    // Ujung dunia: putar balik ke ujung seberang.
    if (c.x < 40 || c.x > WORLD - 40 || c.y < 40 || c.y > WORLD - 40) {
      c.dir *= -1;
      c.lane *= -1;
      c.angle += Math.PI;
      if (c.vertical) c.y = c.dir > 0 ? 60 : WORLD - 60;
      else c.x = c.dir > 0 ? 60 : WORLD - 60;
    }
  }
}

// --- Mobil pemain ---
export function nearestStealableCar(G, maxDist) {
  const p = G.player;
  let best = null;
  let bestD = maxDist;
  for (const c of G.cars) {
    if (c.kind !== 'parked' && c.kind !== 'traffic') continue;
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

export function enterCar(G, car) {
  const p = G.player;
  const stolen = car.kind === 'parked' || car.kind === 'traffic';
  car.kind = 'player';
  car.speed = 0;
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  if (stolen) {
    G.stats.steals += 1;
    addWanted(G, 1, 'Mobil dicuri! Polisi waspada.');
    G.audio.horn();
  } else {
    G.audio.blip();
  }
  G.toast(stolen ? 'Mobil dicuri — kabur!' : 'Naik mobil', '#e8e8e8');
}

export function exitCar(G) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  car.kind = 'parked';
  car.speed = 0;
  const side = car.angle + Math.PI / 2;
  p.x = car.x + Math.cos(side) * 34;
  p.y = car.y + Math.sin(side) * 34;
  p.inCar = null;
  G.audio.blip();
}

export function updatePlayerCar(G, dt, mv, presses) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  const forward = mv.y < 0;
  const back = mv.y > 0;
  const steerInput = mv.x;
  if (forward) car.speed += CAR.accel * dt;
  else if (back) {
    if (car.speed > 10) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.reverseAccel * dt;
  } else {
    car.speed -= Math.sign(car.speed) * 140 * dt;
    if (Math.abs(car.speed) < 8) car.speed = 0;
  }
  car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
  const spd01 = Math.abs(car.speed) / CAR.maxSpeed;
  if (Math.abs(car.speed) > 12) {
    car.angle += steerInput * CAR.steer * dt * Math.sign(car.speed) * (0.55 + 0.45 * (1 - spd01));
  }
  // Rem tangan: selip + jejak ban.
  if (presses.space) {
    car.speed *= Math.pow(0.4, dt * 3);
    if (Math.abs(car.speed) > 140 && G.rng() < 0.6) {
      G.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 2.2 });
    }
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hitB = hitsBuilding(G.world, nx, ny, CAR.radius);
  if (hitB || !insideWorld(nx, ny, 24)) {
    if (Math.abs(car.speed) > 160) {
      car.hp -= 12;
      hurtPlayer(G, 4, 'Kamu nabrak gedung!');
      G.audio.crash();
      G.shake = Math.min(12, G.shake + 6);
      spawnParticles(G, nx, ny, '#ffb35a', 12, 200);
    }
    car.speed *= -0.25;
  } else {
    car.x = nx;
    car.y = ny;
  }
  // Tabrakan dengan mobil lain.
  for (const o of G.cars) {
    if (o === car || o.kind === 'parked') continue;
    const d = Math.hypot(o.x - car.x, o.y - car.y);
    if (d < 40 && d > 0.01) {
      const push = (40 - d) / 2;
      const ux = (car.x - o.x) / d;
      const uy = (car.y - o.y) / d;
      car.x += ux * push;
      car.y += uy * push;
      if (o.kind === 'traffic') { o.x -= ux * push; o.y -= uy * push; o.speed *= 0.4; }
      const impact = Math.abs(car.speed) + Math.abs(o.speed || 0);
      if (impact > 220) {
        car.speed *= 0.5;
        G.audio.crash();
        G.shake = Math.min(10, G.shake + 4);
        spawnParticles(G, car.x, car.y, '#ffd76a', 8, 160);
        if (o.kind === 'police') {
          addWanted(G, 1, 'Kamu nabrak mobil polisi!');
          hurtPlayer(G, 5, 'Tabrakan dengan polisi!');
        }
      }
    }
  }
  // Nabrak pejalan kaki.
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    const d = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (d < 30 && Math.abs(car.speed) > 60) {
      ped.down = 4;
      ped.vx = Math.cos(car.angle) * 260;
      ped.vy = Math.sin(car.angle) * 260;
      car.speed *= 0.7;
      addWanted(G, 1, 'Kamu nabrak pejalan kaki!');
      G.audio.crash();
      spawnParticles(G, ped.x, ped.y, '#ff8a8a', 10, 180);
    }
  }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  if (Math.abs(car.speed) > 20) G.audio.startEngine(spd01);
  else G.audio.stopEngine();
  if (car.hp <= 0) {
    G.audio.explode();
    spawnParticles(G, car.x, car.y, '#ff5a3a', 26, 300);
    spawnParticles(G, car.x, car.y, '#ffd76a', 18, 240);
    G.cars.splice(G.cars.indexOf(car), 1);
    p.inCar = null;
    hurtPlayer(G, 25, 'Mobilmu meledak!');
    G.toast('Mobil meledak!', '#ff5a5a');
  }
}

// Pejalan kaki: jalan di trotoar, menghindar pelan, jatuh kalau ketabrak.
export function spawnPeds(G, count) {
  for (let i = 0; i < count; i++) {
    const s = G.world.pedSpawns[i % G.world.pedSpawns.length];
    G.peds.push({
      x: s.x + range(G.rng, -20, 20), y: s.y + range(G.rng, -20, 20),
      angle: G.rng() * Math.PI * 2, speed: range(G.rng, 34, 62),
      color: pick(G.rng, ['#e8e8e8', '#ffd76a', '#7ae8a8', '#e8a8d8', '#a8c8e8']),
      down: 0, vx: 0, vy: 0, walkPhase: G.rng() * 6,
    });
  }
}

export function updatePeds(G, dt) {
  for (const ped of G.peds) {
    ped.walkPhase += dt * 6;
    if (ped.down > 0) {
      ped.down -= dt;
      ped.x += ped.vx * dt;
      ped.y += ped.vy * dt;
      ped.vx *= 0.9;
      ped.vy *= 0.9;
      continue;
    }
    // Jalan lurus di trotoar; belok kalau mentok gedung / ujung dunia.
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    if (hitsBuilding(G.world, nx, ny, 10) || !insideWorld(nx, ny, 30) || isRoadAt(nx, ny)) {
      ped.angle += (G.rng() < 0.5 ? 1 : -1) * (Math.PI / 2 + G.rng() * 0.6);
    } else {
      ped.x = nx;
      ped.y = ny;
    }
    // Kadang belok sendiri di persimpangan trotoar.
    if (G.rng() < 0.002) ped.angle += (G.rng() < 0.5 ? 1 : -1) * Math.PI / 2;
  }
}
