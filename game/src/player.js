// Budi jalan kaki: gerak WASD, lari Shift, pukul F, tabrakan gedung.
// Combat: pukulan busur ke depan; preman (thug) punya HP dan melawan balik.

import { PLAYER, WANTED } from './config.js';
import { clamp, dist2, angleDiff } from './random.js';
import { hitsBuilding, insideWorld } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, hp: PLAYER.hpMax,
    punchTimer: 0, invuln: 0, walking: false, moving: false,
    money: 0, inCar: null,
  };
}

// Preman: nongkrong di titik, kejar pemain kalau dekat, mukul balik.
export function createThug(x, y, rng) {
  return {
    x, y, homeX: x, homeY: y, angle: rng() * Math.PI * 2,
    hp: 36, punchTimer: 0, speed: 120, state: 'idle', flash: 0,
  };
}

export function spawnParticles(G, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = G.rng() * Math.PI * 2;
    const s = (0.3 + G.rng() * 0.7) * (speed || 160);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + G.rng() * 0.3, max: 0.8, color, size: 2 + G.rng() * 3 });
  }
}

export function updatePlayerOnFoot(G, dt, mv, presses) {
  const p = G.player;
  if (p.inCar) return;
  const running = presses.shift;
  const speed = (running ? PLAYER.runSpeed : PLAYER.walkSpeed);
  let dx = mv.x;
  let dy = mv.y;
  const len = Math.hypot(dx, dy);
  p.moving = len > 0;
  if (len > 0) {
    dx /= len;
    dy /= len;
    p.angle = Math.atan2(dy, dx);
    const nx = p.x + dx * speed * dt;
    const ny = p.y + dy * speed * dt;
    if (!hitsBuilding(G.world, nx, p.y, PLAYER.radius) && insideWorld(nx, p.y, 20)) p.x = nx;
    if (!hitsBuilding(G.world, p.x, ny, PLAYER.radius) && insideWorld(p.x, ny, 20)) p.y = ny;
  }
  if (p.punchTimer > 0) p.punchTimer -= dt;
  if (p.invuln > 0) p.invuln -= dt;
  p.walking = p.moving;
}

export function playerPunch(G) {
  const p = G.player;
  if (p.inCar || p.punchTimer > 0) return;
  p.punchTimer = PLAYER.punchCooldown;
  G.audio.punch();
  const px = p.x + Math.cos(p.angle) * 22;
  const py = p.y + Math.sin(p.angle) * 22;
  spawnParticles(G, px, py, '#ffd76a', 6, 120);
  // Kena preman dalam busur depan?
  for (const t of G.thugs) {
    if (t.hp <= 0) continue;
    const d = Math.hypot(t.x - p.x, t.y - p.y);
    if (d < PLAYER.punchRange + 14) {
      const ang = Math.atan2(t.y - p.y, t.x - p.x);
      if (Math.abs(angleDiff(p.angle, ang)) < PLAYER.punchArc) {
        hurtThug(G, t, PLAYER.punchDamage);
      }
    }
  }
  // Kena polisi jalan kaki? (polisi di game ini naik mobil; pukul mobil polisi = kejahatan)
  for (const c of G.police) {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    if (d < PLAYER.punchRange + 18) {
      addWanted(G, WANTED.punchCopCrime, 'Kamu mukul polisi!');
      G.audio.crash();
      spawnParticles(G, c.x, c.y, '#ff5a5a', 10, 200);
    }
  }
}

export function hurtThug(G, t, dmg) {
  t.hp -= dmg;
  t.flash = 0.15;
  spawnParticles(G, t.x, t.y, '#ff8a5a', 8, 150);
  if (t.hp <= 0) {
    t.state = 'down';
    t.downTimer = 6;
    const bonus = 25000;
    G.player.money += bonus;
    G.stats.kos += 1;
    G.audio.coin();
    G.toast(`Preman KO! +Rp25.000`, '#ffd76a');
    spawnParticles(G, t.x, t.y, '#ffd76a', 16, 220);
  }
}

export function updateThugs(G, dt) {
  const p = G.player;
  for (const t of G.thugs) {
    if (t.flash > 0) t.flash -= dt;
    if (t.state === 'down') {
      t.downTimer -= dt;
      if (t.downTimer <= 0) {
        // Bangkit lagi di rumahnya, HP pulih.
        t.hp = 36;
        t.x = t.homeX;
        t.y = t.homeY;
        t.state = 'idle';
      }
      continue;
    }
    if (t.punchTimer > 0) t.punchTimer -= dt;
    const d = Math.hypot(p.x - t.x, p.y - t.y);
    const target = d < 170 && !p.inCar ? p : null;
    if (target) {
      t.state = 'chase';
      const ang = Math.atan2(p.y - t.y, p.x - t.x);
      t.angle = ang;
      t.x += Math.cos(ang) * t.speed * dt;
      t.y += Math.sin(ang) * t.speed * dt;
      if (d < 30 && t.punchTimer <= 0 && p.invuln <= 0) {
        t.punchTimer = 1.0;
        hurtPlayer(G, 7, 'Preman mukul kamu!');
      }
    } else {
      t.state = 'idle';
      // Jalan mondar-mandir di sekitar rumah.
      t.wander = (t.wander || 0) - dt;
      if (t.wander <= 0) {
        t.wander = 1 + G.rng() * 2;
        t.wanderAngle = G.rng() * Math.PI * 2;
      }
      const nx = t.x + Math.cos(t.wanderAngle || 0) * 40 * dt;
      const ny = t.y + Math.sin(t.wanderAngle || 0) * 40 * dt;
      if (!hitsBuilding(G.world, nx, ny, 12) && Math.hypot(nx - t.homeX, ny - t.homeY) < 130) {
        t.x = nx;
        t.y = ny;
        t.angle = t.wanderAngle || 0;
      }
    }
  }
}

export function hurtPlayer(G, dmg, reason) {
  const p = G.player;
  if (p.invuln > 0 || G.screen !== 'play') return;
  p.hp = Math.max(0, p.hp - dmg);
  p.invuln = 0.7;
  G.audio.hurt();
  G.shake = Math.min(10, G.shake + 5);
  if (reason) G.toast(reason, '#ff8a8a');
  if (p.hp <= 0) G.gameOver('wasted');
}

export function addWanted(G, n, reason) {
  const before = G.wanted;
  G.wanted = clamp(G.wanted + n, 0, WANTED.max);
  if (G.wanted > before && reason) G.toast(reason, '#ff9a5a');
  if (G.wanted > 0) G.wantedTimer = WANTED.decaySeconds;
}
