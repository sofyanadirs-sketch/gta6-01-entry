// HUD layar: uang Rp, HP, bintang wanted, jam, objektif misi, toast,
// minimap, dan semua layar menu (start, pause, game over) — digambar di
// canvas yang sama dengan dunia, jadi screenshot menangkap semuanya.

import { WORLD, ROAD_LINES, TILE, PALETTE, rp, clockText } from './config.js';
import { roadCenter } from './world.js';
import { currentObjective, sideObjective, storyMission } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function drawHud(ctx, G, view) {
  const W = view.w;
  const H = view.h;
  const p = G.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';

  // --- Bar atas: uang + HP (kiri), bintang wanted (tengah), jam (kanan).
  panel(ctx, 12, 12, 250, 64, 'rgba(12,10,22,0.72)');
  ctx.font = `700 26px ${FONT}`;
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'left';
  ctx.fillText(rp(p.money), 26, 40);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#c8c8d8';
  ctx.fillText('BUDI • Ojek Kota Senja', 26, 62);
  // HP bar
  ctx.fillStyle = '#3a2a2a';
  ctx.fillRect(26, 68, 180, 10);
  ctx.fillStyle = p.hp > 40 ? '#5ad86a' : '#e84a4a';
  ctx.fillRect(26, 68, 180 * Math.max(0, p.hp / 100), 10);
  ctx.font = `600 12px ${FONT}`;
  ctx.fillStyle = '#e8e8e8';
  ctx.fillText(`HP ${Math.ceil(p.hp)}`, 212, 77);

  // Wanted stars
  const cx = W / 2;
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'center';
  let stars = '';
  for (let i = 0; i < 5; i++) stars += i < G.wanted ? '★' : '☆';
  ctx.fillStyle = G.wanted > 0 ? '#ffd24a' : '#8a8a9a';
  ctx.fillText(stars, cx, 44);
  if (G.wanted > 0) {
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = '#ff9a5a';
    ctx.fillText(G.wanted >= 3 ? 'POLISI MENGEJAR!' : 'WANTED', cx, 64);
  }

  // Jam + hari
  panel(ctx, W - 132, 12, 120, 64, 'rgba(12,10,22,0.72)');
  ctx.font = `700 24px ${FONT}`;
  ctx.fillStyle = '#e8e8e8';
  ctx.textAlign = 'right';
  ctx.fillText(clockText(G.clockMinutes), W - 26, 40);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#c8c8d8';
  ctx.fillText('SENJA • HARI 1', W - 26, 62);

  // --- Objektif misi (tengah atas).
  const obj = currentObjective(G);
  const side = sideObjective(G);
  const lines = [obj.label];
  if (side) lines.push('▶ ' + side.label);
  const ow = 520;
  panel(ctx, cx - ow / 2, 84, ow, 24 + lines.length * 20, 'rgba(20,14,34,0.66)');
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = '#ffd76a';
  ctx.textAlign = 'center';
  lines.forEach((ln, i) => ctx.fillText(ln, cx, 106 + i * 20));

  // --- Toast (tengah bawah).
  const now = G.time;
  G.toasts = G.toasts.filter((t) => now < t.until);
  G.toasts.forEach((t, i) => {
    ctx.font = `600 16px ${FONT}`;
    const tw = ctx.measureText(t.text).width + 28;
    panel(ctx, cx - tw / 2, H - 150 - i * 34, tw, 26, 'rgba(12,10,22,0.75)');
    ctx.fillStyle = t.color || '#e8e8e8';
    ctx.fillText(t.text, cx, H - 131 - i * 34);
  });

  // --- Banner misi selesai (tengah layar).
  const b = G.missions.banner;
  if (b && now < b.until) {
    const bw = 620;
    panel(ctx, cx - bw / 2, H / 2 - 160, bw, 96, 'rgba(20,16,8,0.88)');
    ctx.font = `800 30px ${FONT}`;
    ctx.fillStyle = '#ffd76a';
    ctx.fillText(b.text, cx, H / 2 - 118);
    ctx.font = `600 17px ${FONT}`;
    ctx.fillStyle = '#e8e8e8';
    ctx.fillText(b.sub, cx, H / 2 - 86);
  }

  // --- Busted meter (dekat polisi saat jalan kaki).
  if (G.wanted > 0 && !p.inCar && G.bustTimer > 0) {
    const bw = 220;
    panel(ctx, cx - bw / 2, H - 210, bw, 30, 'rgba(40,10,10,0.8)');
    ctx.fillStyle = '#e84a4a';
    ctx.fillRect(cx - bw / 2 + 8, H - 202, (bw - 16) * Math.min(1, G.bustTimer / 1.6), 14);
    ctx.font = `700 13px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText('POLISI MENANGKAPMU!', cx, H - 190);
  }

  // --- Minimap (kanan bawah) + kompas arah misi.
  drawMinimap(ctx, G, W - 196, H - 196, 184);

  // --- Hint kontrol (kiri bawah).
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = 'rgba(232,232,232,0.85)';
  ctx.textAlign = 'left';
  const hint = p.inCar
    ? 'W/S gas & rem • A/D belok • Spasi rem tangan • E turun • P pause • M suara'
    : 'WASD jalan • Shift lari • E curi mobil • F pukul • Q misi sampingan • P pause • M suara';
  ctx.fillText(hint, 16, H - 16);

  // --- Indikator mobil rusak.
  if (p.inCar && p.inCar.hp < 50) {
    ctx.font = `700 15px ${FONT}`;
    ctx.fillStyle = '#ff8a5a';
    ctx.textAlign = 'center';
    ctx.fillText(`MOBIL RUSAK ${Math.ceil(p.inCar.hp)}% — cari mobil lain!`, cx, H - 44);
  }
  ctx.restore();
}

function panel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
}

export function drawMinimap(ctx, G, x, y, size) {
  const scale = size / WORLD;
  ctx.save();
  panel(ctx, x - 6, y - 6, size + 12, size + 12, 'rgba(12,10,22,0.78)');
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  // Latar rumput + jalan.
  ctx.fillStyle = '#2e5a38';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#3a3a44';
  for (const l of ROAD_LINES) {
    const c = roadCenter(l) * scale;
    ctx.fillRect(x, y + c - 3, size, 6);
    ctx.fillRect(x + c - 3, y, 6, size);
  }
  // Gedung (titik-titik kecil).
  ctx.fillStyle = 'rgba(200,120,80,0.8)';
  for (const b of G.world.buildings) {
    ctx.fillRect(x + b.x * scale, y + b.y * scale, Math.max(1.5, b.w * scale), Math.max(1.5, b.h * scale));
  }
  // Target misi (kuning berdenyut) + sampingan (cyan).
  const obj = currentObjective(G);
  if (obj.x !== null) {
    const pulse = 5 + Math.sin(G.time * 5) * 2;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(x + obj.x * scale, y + obj.y * scale, pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  const side = sideObjective(G);
  if (side && side.x !== null) {
    ctx.fillStyle = '#4ad8e8';
    ctx.beginPath();
    ctx.arc(x + side.x * scale, y + side.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Polisi (biru) + pemain (putih/oranye).
  ctx.fillStyle = '#5a8aff';
  for (const c of G.police) {
    ctx.beginPath();
    ctx.arc(x + c.x * scale, y + c.y * scale, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff5a3a';
  ctx.beginPath();
  ctx.arc(x + G.player.x * scale, y + G.player.y * scale, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + G.player.x * scale, y + G.player.y * scale, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  // Label minimap.
  ctx.font = `700 12px ${FONT}`;
  ctx.fillStyle = '#e8e8e8';
  ctx.textAlign = 'left';
  ctx.fillText('KOTA SENJA', x, y - 10);
}

// --- Layar menu (digambar di atas dunia yang diam) ---
export function drawTitle(ctx, G, view) {
  const W = view.w;
  const H = view.h;
  const cx = W / 2;
  ctx.save();
  // Gradasi senja.
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(58,18,64,0.88)');
  grad.addColorStop(0.55, 'rgba(178,74,42,0.82)');
  grad.addColorStop(1, 'rgba(20,10,30,0.9)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = `800 64px ${FONT}`;
  ctx.fillText('OJEK GTA', cx, 150);
  ctx.fillStyle = '#fff';
  ctx.font = `800 34px ${FONT}`;
  ctx.fillText('RAJA JALANAN KOTA SENJA', cx, 196);
  ctx.font = `600 18px ${FONT}`;
  ctx.fillStyle = '#ffd9a8';
  ctx.fillText('Budi, driver ojek. Dari antar penumpang sampai jadi legenda jalanan.', cx, 232);
  const lines = [
    'WASD / panah — jalan & nyetir      •      E — curi / naik mobil',
    'F — pukul      •      Q — misi sampingan      •      Spasi — rem tangan',
    'P — pause      •      M — suara      •      5 misi cerita + misi sampingan',
    '',
    'Curi mobil, kabur dari polisi, antar penumpang — dan jangan sampai ketangkep!',
  ];
  ctx.font = `600 17px ${FONT}`;
  ctx.fillStyle = '#e8e8e8';
  lines.forEach((ln, i) => ctx.fillText(ln, cx, 300 + i * 28));
  // Tombol mulai.
  const bw = 320;
  const bh = 62;
  const bx = cx - bw / 2;
  const by = H - 210;
  const hover = G.mouse.x >= bx && G.mouse.x <= bx + bw && G.mouse.y >= by && G.mouse.y <= by + bh;
  ctx.fillStyle = hover ? '#ffd76a' : '#ff9a3a';
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 12);
  ctx.fill();
  ctx.fillStyle = '#241a10';
  ctx.font = `800 26px ${FONT}`;
  ctx.fillText(G.hasSave ? '▶  LANJUTKAN (SAVE ADA)' : '▶  MULAI MAIN', cx, by + 41);
  ctx.font = `600 15px ${FONT}`;
  ctx.fillStyle = '#c8c8d8';
  ctx.fillText('Klik tombol / tekan Spasi — progress tersimpan otomatis', cx, by + 92);
  ctx.font = `600 13px ${FONT}`;
  ctx.fillStyle = '#8a8a9a';
  ctx.fillText('Game orisinil — kota, nama & cerita fiktif. Dibuat untuk make.fun “Make GTA 6”.', cx, H - 24);
  ctx.restore();
  return { x: bx, y: by, w: bw, h: bh };
}

export function drawPaused(ctx, G, view) {
  const W = view.w;
  const H = view.h;
  ctx.save();
  ctx.fillStyle = 'rgba(10,8,20,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd76a';
  ctx.font = `800 48px ${FONT}`;
  ctx.fillText('PAUSE', W / 2, H / 2 - 60);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `600 18px ${FONT}`;
  const m = storyMission(G);
  ctx.fillText(m ? `Misi: ${m.title} — ${rp(G.player.money)} di kantong` : `Uang: ${rp(G.player.money)}`, W / 2, H / 2 - 10);
  ctx.fillText('P / Esc — lanjut main      •      M — suara', W / 2, H / 2 + 30);
  ctx.restore();
}

export function drawGameOver(ctx, G, view) {
  const W = view.w;
  const H = view.h;
  ctx.save();
  ctx.fillStyle = 'rgba(30,4,8,0.82)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  const wasted = G.overReason === 'wasted';
  ctx.fillStyle = '#ff5a5a';
  ctx.font = `800 56px ${FONT}`;
  ctx.fillText(wasted ? 'WASTED' : 'BUSTED!', W / 2, H / 2 - 70);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = `600 19px ${FONT}`;
  ctx.fillText(
    wasted ? 'Budi KO. Kota Senja masih menunggumu bangkit.' : 'Polisi menangkap Budi. Jangan sampai ketangkep lagi!',
    W / 2, H / 2 - 20,
  );
  ctx.fillText(`Uang: ${rp(G.player.money)}  •  Misi selesai: ${G.missions.completed.length}/5  •  Mobil dicuri: ${G.stats.steals}`, W / 2, H / 2 + 20);
  ctx.fillStyle = '#ffd76a';
  ctx.font = `800 24px ${FONT}`;
  ctx.fillText('Tekan Spasi / klik untuk main lagi', W / 2, H / 2 + 80);
  ctx.restore();
}
