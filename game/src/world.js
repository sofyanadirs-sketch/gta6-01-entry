// Kota Senja: generator kota deterministik dari seed tetap.
// Jalan grid 7x7, blok berisi gedung / taman / plaza, plus landmark misi.
// Semua posisi landmark dihitung dari grid yang sama, jadi misi, minimap,
// dan screenshot selalu menunjuk tempat yang sama.

import { TILE, WORLD, WORLD_TILES, ROAD_LINES, ROAD_W, PALETTE } from './config.js';
import { makeRng, range, rangeInt, pick, shuffle } from './random.js';

export function roadCenter(line) {
  return line * TILE + ROAD_W / 2;
}

export function isRoadTile(tx, ty) {
  for (const l of ROAD_LINES) {
    if (tx >= l && tx < l + 2) return true;
    if (ty >= l && ty < l + 2) return true;
  }
  return false;
}

export function isRoadAt(x, y) {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= WORLD_TILES || ty >= WORLD_TILES) return false;
  return isRoadTile(tx, ty);
}

// Titik tengah jalan terdekat dari (x,y) — dipakai traffic & spawn kendaraan.
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const l of ROAD_LINES) {
    const c = roadCenter(l);
    const dV = Math.abs(x - c);
    if (dV < bestD) { bestD = dV; best = { x: c, y, vertical: true }; }
    const dH = Math.abs(y - c);
    if (dH < bestD) { bestD = dH; best = { x, y: c, vertical: false }; }
  }
  return best;
}

export function buildWorld(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const trees = [];
  const parks = [];

  // Blok = petak di antara jalan. Tiap blok: gedung, taman, atau plaza.
  const lines = ROAD_LINES;
  for (let bx = 0; bx < lines.length - 1; bx++) {
    for (let by = 0; by < lines.length - 1; by++) {
      const x0 = (lines[bx] + 2) * TILE + 10;
      const y0 = (lines[by] + 2) * TILE + 10;
      const x1 = lines[bx + 1] * TILE - 10;
      const y1 = lines[by + 1] * TILE - 10;
      const w = x1 - x0;
      const h = y1 - y0;
      const roll = rng();
      if (roll < 0.16) {
        // Taman: pohon-pohon + jalan setapak.
        const park = { x: x0, y: y0, w, h };
        parks.push(park);
        const n = rangeInt(rng, 6, 10);
        for (let i = 0; i < n; i++) {
          trees.push({ x: range(rng, x0 + 14, x1 - 14), y: range(rng, y0 + 14, y1 - 14), r: range(rng, 9, 15) });
        }
      } else if (roll < 0.22) {
        // Plaza kosong (lapangan) — tempat kumpul & balapan.
        parks.push({ x: x0, y: y0, w, h, plaza: true });
      } else {
        // Gedung: 1-4 bangunan per blok, ukuran acak.
        const n = rangeInt(rng, 1, 3);
        const cells = [];
        for (let i = 0; i < n; i++) {
          const bw = range(rng, 70, Math.min(190, w - 20));
          const bh = range(rng, 60, Math.min(170, h - 20));
          const bx0 = range(rng, x0, Math.max(x0 + 1, x1 - bw));
          const by0 = range(rng, y0, Math.max(y0 + 1, y1 - bh));
          cells.push({ x: bx0, y: by0, w: bw, h: bh });
        }
        // Buang yang tumpang tindih berat.
        for (const c of cells) {
          let ok = true;
          for (const b of buildings) {
            if (c.x < b.x + b.w + 8 && c.x + c.w + 8 > b.x && c.y < b.y + b.h + 8 && c.y + c.h + 8 > b.y) { ok = false; break; }
          }
          if (ok) {
            buildings.push({
              ...c,
              roof: pick(rng, PALETTE.buildingRoof),
              height: rangeInt(rng, 1, 3),
              lit: rng() < 0.75,
              seed: rangeInt(rng, 0, 9999),
            });
          }
        }
      }
    }
  }

  // Landmark misi — posisi di jalan/trotoar, selalu sama untuk seed yang sama.
  const rc = roadCenter;
  const landmarks = {
    taman: { x: rc(22), y: rc(22) + 120, label: 'Taman Senja' },
    stasiun: { x: rc(46), y: rc(14) - 60, label: 'Stasiun Kota' },
    warung: { x: rc(14) + 130, y: rc(38), label: 'Warung Mbak Yuni' },
    gang: { x: rc(38), y: rc(46) + 120, label: 'Gang Mawar' },
    markas: { x: rc(54) - 130, y: rc(54), label: 'Markas Rahasia' },
    plaza: { x: rc(30), y: rc(30), label: 'Plaza Senja' },
    halte: { x: rc(22) - 60, y: rc(30), label: 'Halte' },
    pasar: { x: rc(46) + 60, y: rc(38), label: 'Pasar Senja' },
    start: { x: rc(30), y: rc(30) + 170, label: 'Pangkalan Ojek' },
  };

  // Tempat parkir kendaraan curian: di pinggir jalan, acak tapi deterministik.
  const parkedSpots = [];
  const shuffledLines = shuffle(rng, lines.slice());
  for (let i = 0; i < 26; i++) {
    const line = shuffledLines[i % shuffledLines.length];
    const along = range(rng, 2, WORLD_TILES - 3) * TILE;
    const vertical = rng() < 0.5;
    const cx = vertical ? roadCenter(line) + (rng() < 0.5 ? -26 : 26) : along;
    const cy = vertical ? along : roadCenter(line) + (rng() < 0.5 ? -26 : 26);
    parkedSpots.push({ x: cx, y: cy, angle: vertical ? Math.PI / 2 : 0 });
  }

  // Titik spawn pejalan kaki: trotoar di sepanjang jalan.
  const pedSpawns = [];
  for (let i = 0; i < 40; i++) {
    const line = pick(rng, lines);
    const along = range(rng, 2, WORLD_TILES - 3) * TILE;
    if (rng() < 0.5) pedSpawns.push({ x: roadCenter(line) + (rng() < 0.5 ? -58 : 58), y: along });
    else pedSpawns.push({ x: along, y: roadCenter(line) + (rng() < 0.5 ? -58 : 58) });
  }

  return { seed, buildings, trees, parks, landmarks, parkedSpots, pedSpawns };
}

// Tabrakan lingkaran vs gedung (dipakai pemain, kendaraan, NPC).
export function hitsBuilding(world, x, y, r) {
  for (const b of world.buildings) {
    const nx = Math.max(b.x, Math.min(x, b.x + b.w));
    const ny = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

export function insideWorld(x, y, margin) {
  const m = margin || 0;
  return x > m && y > m && x < WORLD - m && y < WORLD - m;
}
