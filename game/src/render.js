// Menggambar dunia Kota Senja dari atas: tanah, jalan + marka, taman,
// gedung (bayangan + jendela menyala), kendaraan, pejalan kaki, pemain,
// partikel, jejak ban, dan marker misi. Kamera mengikuti pemain.

import { TILE, WORLD, WORLD_TILES, ROAD_LINES, ROAD_W, PALETTE } from './config.js';
import { roadCenter, isRoadTile } from './world.js';
import { currentObjective, sideObjective } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const VIEW_W = 1280;
const VIEW_H = 800;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { w: VIEW_W, h: VIEW_H, scale: 1, ox: 0, oy: 0 };

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.round(window.innerWidth * ratio);
    const h = Math.round(window.innerHeight * ratio);
    canvas.width = w;
    canvas.height = h;
    view.scale = Math.max(w / VIEW_W, h / VIEW_H);
    view.ox = (w - VIEW_W * view.scale) / 2;
    view.oy = (h - VIEW_H * view.scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function drawGround(G, cam) {
    // Rumput dasar + variasi petak.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(cam.x - 40, cam.y - 40, VIEW_W + 80, VIEW_H + 80);
    const t0 = Math.max(0, Math.floor(cam.x / TILE));
    const t1 = Math.min(WORLD_TILES, Math.ceil((cam.x + VIEW_W) / TILE));
    const u0 = Math.max(0, Math.floor(cam.y / TILE));
    const u1 = Math.min(WORLD_TILES, Math.ceil((cam.y + VIEW_H) / TILE));
    for (let tx = t0; tx < t1; tx++) {
      for (let ty = u0; ty < u1; ty++) {
        const x = tx * TILE;
        const y = ty * TILE;
        if ((tx + ty) % 2 === 0) {
          ctx.fillStyle = PALETTE.grassDark;
          ctx.fillRect(x, y, TILE, TILE);
        }
      }
    }
    // Taman.
    for (const park of G.world.parks) {
      if (!inView(park, cam)) continue;
      ctx.fillStyle = park.plaza ? '#9a8a72' : PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      if (park.plaza) {
        ctx.strokeStyle = '#e8d44d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(park.x + park.w / 2, park.y + park.h / 2, Math.min(park.w, park.h) / 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // Jalan: aspal + tepi + marka tengah.
    ctx.fillStyle = PALETTE.road;
    for (const l of ROAD_LINES) {
      const c = roadCenter(l);
      ctx.fillRect(0, c - ROAD_W / 2, WORLD, ROAD_W);
      ctx.fillRect(c - ROAD_W / 2, 0, ROAD_W, WORLD);
    }
    ctx.fillStyle = PALETTE.lane;
    for (const l of ROAD_LINES) {
      const c = roadCenter(l);
      for (let d = 0; d < WORLD; d += 64) {
        ctx.fillRect(d, c - 2, 30, 4);
        ctx.fillRect(c - 2, d, 4, 30);
      }
    }
    // Trotoar di tepi jalan.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const l of ROAD_LINES) {
      const c = roadCenter(l);
      ctx.fillRect(0, c - ROAD_W / 2 - 12, WORLD, 10);
      ctx.fillRect(0, c + ROAD_W / 2 + 2, WORLD, 10);
      ctx.fillRect(c - ROAD_W / 2 - 12, 0, 10, WORLD);
      ctx.fillRect(c + ROAD_W / 2 + 2, 0, 10, WORLD);
    }
    // Pohon.
    for (const t of G.world.trees) {
      if (t.x < cam.x - 30 || t.x > cam.x + VIEW_W + 30 || t.y < cam.y - 30 || t.y > cam.y + VIEW_H + 30) continue;
      ctx.fillStyle = PALETTE.treeDark;
      ctx.beginPath();
      ctx.arc(t.x + 3, t.y + 4, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function inView(r, cam) {
    return r.x + r.w > cam.x - 20 && r.x < cam.x + VIEW_W + 20 && r.y + r.h > cam.y - 20 && r.y < cam.y + VIEW_H + 20;
  }

  function drawBuildings(G, cam) {
    for (const b of G.world.buildings) {
      if (!inView(b, cam)) continue;
      // Bayangan miring (matahari senja dari barat).
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(b.x + 8 + b.height * 4, b.y + 10 + b.height * 4, b.w, b.h);
      // Dinding + atap.
      ctx.fillStyle = PALETTE.buildingWall;
      ctx.fillRect(b.x + 3, b.y + 3, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      // Jendela menyala (pola dari seed gedung).
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 24));
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const lit = ((b.seed + i * 7 + j * 13) % 5) < (b.lit ? 3 : 1);
          ctx.fillStyle = lit ? PALETTE.windowLit : PALETTE.windowDark;
          ctx.fillRect(b.x + 7 + i * 26, b.y + 7 + j * 24, 12, 10);
        }
      }
      // Garis atap.
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    }
  }

  function drawCarShape(c, isPlayer, t) {
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.angle);
    // Bayangan.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(-23, -11, 46, 26, 7);
    ctx.fill();
    // Bodi.
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.roundRect(-24, -13, 48, 26, 7);
    ctx.fill();
    // Kaca depan + atap.
    ctx.fillStyle = 'rgba(20,30,50,0.85)';
    ctx.beginPath();
    ctx.roundRect(6, -10, 12, 20, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.roundRect(-12, -10, 12, 20, 3);
    ctx.fill();
    // Lampu.
    ctx.fillStyle = '#fff8c8';
    ctx.fillRect(22, -11, 3, 5);
    ctx.fillRect(22, 6, 3, 5);
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(-25, -11, 3, 5);
    ctx.fillRect(-25, 6, 3, 5);
    // Tanda khusus.
    if (c.kind === 'police') {
      ctx.fillStyle = '#fff';
      ctx.font = '700 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('POLISI', 0, 3);
      const blink = Math.floor(t * 3.6) % 2 === 0;
      ctx.fillStyle = blink ? '#ff3a3a' : '#3a7aff';
      ctx.beginPath();
      ctx.arc(-6, -13, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = blink ? '#3a7aff' : '#ff3a3a';
      ctx.beginPath();
      ctx.arc(6, -13, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    if (c.taxi) {
      ctx.fillStyle = '#222';
      ctx.font = '700 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('TAKSI', 0, 3);
    }
    if (isPlayer) {
      ctx.strokeStyle = '#ffd76a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-27, -16, 54, 32, 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, walking, phase, down) {
    ctx.save();
    ctx.translate(x, y);
    if (down > 0) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    ctx.rotate(angle);
    const bob = walking ? Math.sin(phase) * 2 : 0;
    // Bayangan.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Badan + kepala.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-8, -8 + bob, 18, 15, 6);
    ctx.fill();
    ctx.fillStyle = '#f2c89a';
    ctx.beginPath();
    ctx.arc(11, 0 + bob, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Topi ojek Budi.
    ctx.fillStyle = '#2a7a3a';
    ctx.beginPath();
    ctx.arc(11, -2 + bob, 6.5, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawMarker(x, y, color, label, t) {
    const bob = Math.sin(t * 3.3) * 4;
    ctx.save();
    ctx.translate(x, y + bob - 26);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(-11, -8);
    ctx.lineTo(11, -8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(0, -8, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Lingkaran target di tanah.
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 34 + Math.sin(t * 3.3) * 4, 0, Math.PI * 2);
    ctx.stroke();
    if (label) {
      ctx.font = '700 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 4;
      ctx.strokeText(label, x, y - 44 + bob);
      ctx.fillText(label, x, y - 44 + bob);
    }
  }

  function drawWorld(G, cam) {
    drawGround(G, cam);
    // Jejak ban.
    for (const s of G.skids) {
      ctx.strokeStyle = `rgba(20,20,26,${Math.min(0.55, s.life / 2.2)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
      ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
      ctx.stroke();
    }
    drawBuildings(G, cam);
    // Marker misi (di bawah kendaraan supaya terlihat).
    const obj = currentObjective(G);
    if (obj.x !== null && G.screen === 'play') {
      const lm = G.world.landmarks;
      const key = Object.keys(lm).find((k) => Math.hypot(lm[k].x - obj.x, lm[k].y - obj.y) < 2);
      drawMarker(obj.x, obj.y, '#ffd76a', key ? lm[key].label : null, G.time);
    }
    const side = sideObjective(G);
    if (side && side.x !== null && G.screen === 'play') drawMarker(side.x, side.y, '#4ad8e8', null, G.time);
    // Koin misi sampingan.
    if (G.missions.side && G.missions.side.coins) {
      for (const c of G.missions.side.coins) {
        if (c.taken) continue;
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.arc(c.x, c.y + Math.sin(G.time * 3.3 + c.x) * 3, 11, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#a87a1a';
        ctx.font = '700 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Rp', c.x, c.y + 4);
      }
    }
    // Penumpang menunggu.
    if (G.missions.passenger) {
      const ps = G.missions.passenger;
      drawPerson(ps.x, ps.y, -Math.PI / 2, ps.color, false, 0, 0);
      ctx.font = '700 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.fillText('Bu Sari', ps.x, ps.y - 22);
    }
    // Pejalan kaki.
    for (const ped of G.peds) {
      if (ped.x < cam.x - 40 || ped.x > cam.x + VIEW_W + 40 || ped.y < cam.y - 40 || ped.y > cam.y + VIEW_H + 40) continue;
      drawPerson(ped.x, ped.y, ped.angle, ped.color, true, ped.walkPhase, ped.down);
    }
    // Preman.
    for (const t of G.thugs) {
      if (t.x < cam.x - 40 || t.x > cam.x + VIEW_W + 40 || t.y < cam.y - 40 || t.y > cam.y + VIEW_H + 40) continue;
      if (t.state === 'down') {
        drawPerson(t.x, t.y, t.angle, '#5a4a6a', false, 0, 1);
        continue;
      }
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.angle);
      ctx.fillStyle = t.flash > 0 ? '#ff8a8a' : '#3a3a4a';
      ctx.beginPath();
      ctx.roundRect(-10, -10, 22, 19, 6);
      ctx.fill();
      ctx.fillStyle = '#f2c89a';
      ctx.beginPath();
      ctx.arc(12, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(12, -2, 7, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      // HP bar preman.
      if (t.hp < 36) {
        ctx.fillStyle = '#222';
        ctx.fillRect(t.x - 14, t.y - 26, 28, 5);
        ctx.fillStyle = '#e84a4a';
        ctx.fillRect(t.x - 14, t.y - 26, 28 * (t.hp / 36), 5);
      }
    }
    // Kendaraan (parkir di bawah, lalu jalan).
    for (const c of G.cars) {
      if (c.kind !== 'parked' && (c.x < cam.x - 60 || c.x > cam.x + VIEW_W + 60 || c.y < cam.y - 60 || c.y > cam.y + VIEW_H + 60)) continue;
      drawCarShape(c, c.kind === 'player', G.time);
    }
    // Pemain jalan kaki.
    const p = G.player;
    if (!p.inCar) {
      if (p.invuln <= 0 || Math.floor(p.invuln * 12) % 2 === 0) {
        drawPerson(p.x, p.y, p.angle, '#ff5a3a', p.walking, G.time * 10, 0);
      }
    }
    // Partikel.
    for (const pt of G.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Panah arah misi di tepi layar kalau target di luar kamera.
    if (obj.x !== null && G.screen === 'play') {
      const dx = obj.x - (cam.x + VIEW_W / 2);
      const dy = obj.y - (cam.y + VIEW_H / 2);
      if (Math.abs(dx) > VIEW_W / 2 - 60 || Math.abs(dy) > VIEW_H / 2 - 60) {
        const ang = Math.atan2(dy, dx);
        const ex = cam.x + VIEW_W / 2 + Math.cos(ang) * (VIEW_W / 2 - 70);
        const ey = cam.y + VIEW_H / 2 + Math.sin(ang) * (VIEW_H / 2 - 70);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(ang);
        ctx.fillStyle = '#ffd76a';
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -11);
        ctx.lineTo(-10, 11);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function draw(G, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a1226';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cam = {
      x: Math.max(0, Math.min(WORLD - VIEW_W, G.player.x - VIEW_W / 2 + (G.shake ? (G.rng() - 0.5) * G.shake : 0))),
      y: Math.max(0, Math.min(WORLD - VIEW_H, G.player.y - VIEW_H / 2 + (G.shake ? (G.rng() - 0.5) * G.shake : 0))),
    };
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox - cam.x * view.scale, view.oy - cam.y * view.scale);
    drawWorld(G, cam);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
    return { cam, view };
  }

  return { draw, ctx, view, VIEW_W, VIEW_H };
}
