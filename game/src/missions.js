// Misi Kota Senja: 5 misi cerita berurutan + 3 misi sampingan yang bisa
// diulang. Tiap misi adalah state machine langkah (goto / deliver / chase /
// race / escape / collect). Misi aktif selalu punya marker di dunia dan di
// minimap, plus teks objektif di HUD.

import { STORY_MISSIONS, SIDE_MISSIONS, ROAD_LINES } from './config.js';
import { rp } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';
import { roadCenter, nearestRoadPoint } from './world.js';
import { makeCar } from './vehicles.js';
import { addWanted, spawnParticles } from './player.js';

export function createMissionState() {
  return {
    storyIndex: 0,        // misi cerita aktif (0..4), 5 = semua selesai
    stepIndex: 0,
    step: null,           // state langkah aktif (timer, hits, checkpoints...)
    side: null,           // misi sampingan aktif
    sideDone: 0,
    passenger: null,      // NPC yang sedang diantar
    rival: null,          // kendaraan rival (misi kejar / balapan)
    racePoints: [],
    coins: [],
    completed: [],        // id misi cerita yang sudah selesai
    banner: null,         // {text, sub, until} banner tengah layar
  };
}

function landmark(G, key) {
  return G.world.landmarks[key];
}

function showBanner(G, text, sub) {
  G.missions.banner = { text, sub: sub || '', until: G.time + 3.2 };
  G.audio.jingle();
}

export function storyMission(G) {
  if (G.missions.storyIndex >= STORY_MISSIONS.length) return null;
  return STORY_MISSIONS[G.missions.storyIndex];
}

export function currentObjective(G) {
  const m = storyMission(G);
  if (!m) return { label: 'Semua misi selesai — Raja Jalanan!', x: null, y: null };
  const step = m.steps[G.missions.stepIndex];
  if (!step) return { label: m.title, x: null, y: null };
  const st = G.missions.step;
  if (step.type === 'goto' || step.type === 'deliver') {
    const lm = landmark(G, step.at);
    return { label: step.label, x: lm.x, y: lm.y };
  }
  if (step.type === 'chase' && G.missions.rival) {
    return { label: `${step.label} (${st.hits}/${step.hits})`, x: G.missions.rival.x, y: G.missions.rival.y };
  }
  if (step.type === 'race' && st) {
    const cp = st.points[st.next];
    return { label: `${step.label} — ${st.next}/${step.checkpoints} • ${Math.ceil(st.timeLeft)} dtk`, x: cp ? cp.x : null, y: cp ? cp.y : null };
  }
  if (step.type === 'escape') {
    const lm = landmark(G, step.at);
    return { label: step.label, x: lm.x, y: lm.y };
  }
  return { label: step.label, x: null, y: null };
}

export function startStoryStep(G) {
  const m = storyMission(G);
  if (!m) return;
  const step = m.steps[G.missions.stepIndex];
  const st = { t: 0 };
  G.missions.step = st;
  if (step.wantedOnStart) addWanted(G, step.wantedOnStart, 'Razia! Wanted naik!');
  if (step.type === 'chase') {
    // Rival naik motor: spawn di jalan depan pemain, lalu kabur.
    const p = G.player;
    const spot = nearestRoadPoint(p.x + 300, p.y);
    const rival = makeCar(spot.x, spot.y, 0, '#ff8a3a', 'rival');
    rival.cruise = 250;
    rival.speed = 250;
    rival.vertical = spot.vertical;
    rival.roadLine = ROAD_LINES[2];
    rival.dir = 1;
    rival.lane = 24;
    G.missions.rival = rival;
    G.cars.push(rival);
    st.hits = 0;
    st.hitCooldown = 0;
    G.toast('Si Jago kabur naik motor! Kejar!', '#ff9a5a');
  }
  if (step.type === 'race') {
    // 5 checkpoint di persimpangan jalan, berurutan.
    const pts = [];
    const rng = makeRng(G.seed + 77 + G.missions.storyIndex);
    const lines = ROAD_LINES.slice();
    for (let i = 0; i < step.checkpoints; i++) {
      const a = lines[rangeInt(rng, 0, lines.length - 1)];
      const b = lines[rangeInt(rng, 0, lines.length - 1)];
      pts.push({ x: roadCenter(a), y: roadCenter(b) });
    }
    st.points = pts;
    st.next = 0;
    st.timeLeft = step.timeLimit;
    // Dua rival balap ikut di garis start.
    for (let k = 0; k < 2; k++) {
      const r = makeCar(G.player.x + 60 + k * 50, G.player.y + 40, 0, k ? '#4a90e8' : '#e84a4a', 'rival');
      r.cruise = 300;
      r.speed = 200;
      r.raceIndex = 0;
      G.cars.push(r);
      (st.rivals = st.rivals || []).push(r);
    }
    G.toast('Balapan mulai! Ikuti checkpoint kuning!', '#ffd76a');
  }
  if (step.type === 'escape') {
    G.toast('Kabur ke Markas Rahasia! Jangan ketangkep!', '#ff9a5a');
  }
  if (step.type === 'goto' && G.missions.stepIndex === 0 && m.id === 'm1') {
    // Bu Sari menunggu di taman.
    G.missions.passenger = { x: landmark(G, 'taman').x, y: landmark(G, 'taman').y, name: 'Bu Sari', color: '#e8a8d8' };
  }
}

export function completeStoryStep(G) {
  const m = storyMission(G);
  if (!m) return;
  G.missions.stepIndex += 1;
  if (G.missions.stepIndex >= m.steps.length) {
    // Misi selesai: hadiah + lanjut ke misi berikut.
    G.player.money += m.reward;
    G.missions.completed.push(m.id);
    G.stats.deliveries += 1;
    showBanner(G, `MISI SELESAI: ${m.title}`, `+${rp(m.reward)} — ${G.missions.storyIndex + 1 < STORY_MISSIONS.length ? 'Misi berikut: ' + STORY_MISSIONS[G.missions.storyIndex + 1].title : 'Kamu Raja Jalanan!'}`);
    G.missions.storyIndex += 1;
    G.missions.stepIndex = 0;
    G.missions.rival = null;
    G.missions.passenger = null;
    G.saveGame();
    if (G.missions.storyIndex < STORY_MISSIONS.length) startStoryStep(G);
  } else {
    startStoryStep(G);
  }
}

export function updateMissions(G, dt) {
  const m = storyMission(G);
  const ms = G.missions;
  if (ms.banner && G.time > ms.banner.until) ms.banner = null;
  if (!m) { updateSide(G, dt); return; }
  const step = m.steps[ms.stepIndex];
  const st = ms.step;
  const p = G.player;
  if (step.type === 'goto' || step.type === 'deliver') {
    const lm = landmark(G, step.at);
    const d = Math.hypot(p.x - lm.x, p.y - lm.y);
    if (d < 80) {
      if (step.type === 'goto' && m.id === 'm1' && ms.stepIndex === 0) {
        G.toast('Bu Sari naik! Antar ke Stasiun Kota.', '#a8e8a8');
        G.audio.pickup();
      }
      if (step.type === 'deliver') {
        G.audio.coin();
        spawnParticles(G, lm.x, lm.y, '#ffd76a', 14, 200);
      }
      completeStoryStep(G);
    }
  } else if (step.type === 'chase' && ms.rival) {
    const r = ms.rival;
    // Rival kabur di jalan: belok acak di persimpangan, jaga jarak dari pemain.
    if (st.hitCooldown > 0) st.hitCooldown -= dt;
    const d = Math.hypot(p.x - r.x, p.y - r.y);
    if (d < 46 && st.hitCooldown <= 0) {
      st.hits += 1;
      st.hitCooldown = 1.2;
      G.audio.crash();
      spawnParticles(G, r.x, r.y, '#ffd76a', 10, 180);
      G.shake = Math.min(10, G.shake + 4);
      if (st.hits >= step.hits) {
        G.cars.splice(G.cars.indexOf(r), 1);
        G.toast('Si Jago nyerah! Orderan kembali!', '#a8e8a8');
        completeStoryStep(G);
        return;
      }
      G.toast(`Senggolan ${st.hits}/${step.hits}! Terus kejar!`, '#ffd76a');
    }
    // AI rival: lari menjauh dari pemain di sepanjang jalan.
    const away = Math.atan2(r.y - p.y, r.x - p.x);
    r.angle += ((away - r.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * dt * 1.6;
    r.speed = Math.min(300, r.speed + 200 * dt);
    r.x += Math.cos(r.angle) * r.speed * dt;
    r.y += Math.sin(r.angle) * r.speed * dt;
    if (r.x < 60 || r.x > 3012 || r.y < 60 || r.y > 3012) {
      r.angle += Math.PI;
      r.x = Math.max(80, Math.min(2992, r.x));
      r.y = Math.max(80, Math.min(2992, r.y));
    }
  } else if (step.type === 'race' && st) {
    st.timeLeft -= dt;
    const cp = st.points[st.next];
    if (cp && Math.hypot(p.x - cp.x, p.y - cp.y) < 90) {
      st.next += 1;
      G.audio.coin();
      spawnParticles(G, cp.x, cp.y, '#ffd76a', 16, 220);
      if (st.next >= step.checkpoints) {
        completeStoryStep(G);
        return;
      }
      G.toast(`Checkpoint ${st.next}/${step.checkpoints}!`, '#ffd76a');
    }
    // Rival balap: bergerak menuju checkpoint mereka sendiri.
    for (const r of st.rivals || []) {
      const rp2 = st.points[Math.min(r.raceIndex, st.points.length - 1)];
      const ang = Math.atan2(rp2.y - r.y, rp2.x - r.x);
      r.angle += ((ang - r.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI) * dt * 2;
      r.speed = Math.min(r.cruise, r.speed + 240 * dt);
      r.x += Math.cos(r.angle) * r.speed * dt;
      r.y += Math.sin(r.angle) * r.speed * dt;
      if (Math.hypot(r.x - rp2.x, r.y - rp2.y) < 90) r.raceIndex += 1;
    }
    if (st.timeLeft <= 0) {
      G.audio.fail();
      showBanner(G, 'BALAPAN GAGAL', 'Waktu habis — coba lagi!');
      // Ulang langkah balapan dari awal.
      for (const r of st.rivals || []) {
        const i = G.cars.indexOf(r);
        if (i >= 0) G.cars.splice(i, 1);
      }
      startStoryStep(G);
    }
  } else if (step.type === 'escape') {
    const lm = landmark(G, step.at);
    if (Math.hypot(p.x - lm.x, p.y - lm.y) < 90) {
      completeStoryStep(G);
    }
  }
  updateSide(G, dt);
}

// --- Misi sampingan (Q untuk ambil, bisa diulang) ---
export function takeSideMission(G) {
  if (G.missions.side) {
    G.toast('Selesaikan dulu misi sampingan ini.', '#e8e8e8');
    return;
  }
  const def = SIDE_MISSIONS[G.missions.sideDone % SIDE_MISSIONS.length];
  const side = { def, t: 0, stage: 0, coinsLeft: def.count || 0 };
  if (def.type === 'collect') {
    const rng = makeRng(G.seed + 500 + G.missions.sideDone);
    side.coins = [];
    for (let i = 0; i < def.count; i++) {
      const a = ROAD_LINES[rangeInt(rng, 0, ROAD_LINES.length - 1)];
      const b = ROAD_LINES[rangeInt(rng, 0, ROAD_LINES.length - 1)];
      side.coins.push({ x: roadCenter(a) + range(rng, -60, 60), y: roadCenter(b) + range(rng, -60, 60), taken: false });
    }
  }
  G.missions.side = side;
  G.toast(`Misi sampingan: ${def.title} — ${def.brief}`, '#ffd76a');
  G.audio.pickup();
}

export function updateSide(G, dt) {
  const side = G.missions.side;
  if (!side) return;
  const p = G.player;
  side.t += dt;
  const def = side.def;
  if (def.type === 'timedDeliver') {
    const lm = landmark(G, 'plaza');
    if (Math.hypot(p.x - lm.x, p.y - lm.y) < 90) {
      finishSide(G, true);
      return;
    }
    if (side.t > def.timeLimit) {
      G.audio.fail();
      G.toast('Baksonya keburu dingin! Misi gagal.', '#ff8a8a');
      G.missions.side = null;
    }
  } else if (def.type === 'taxi') {
    const target = side.stage === 0 ? landmark(G, 'halte') : landmark(G, 'pasar');
    if (Math.hypot(p.x - target.x, p.y - target.y) < 80) {
      if (side.stage === 0) {
        side.stage = 1;
        G.toast('Penumpang naik! Antar ke Pasar Senja.', '#a8e8a8');
        G.audio.pickup();
      } else {
        finishSide(G, true);
      }
    }
  } else if (def.type === 'collect') {
    for (const c of side.coins) {
      if (!c.taken && Math.hypot(p.x - c.x, p.y - c.y) < 44) {
        c.taken = true;
        side.coinsLeft -= 1;
        G.audio.coin();
        spawnParticles(G, c.x, c.y, '#ffd76a', 10, 160);
        if (side.coinsLeft <= 0) finishSide(G, true);
      }
    }
  }
}

function finishSide(G, ok) {
  const side = G.missions.side;
  if (!ok || !side) return;
  G.player.money += side.def.reward;
  G.missions.sideDone += 1;
  G.stats.deliveries += 1;
  showBanner(G, `MISI SAMPINGAN: ${side.def.title}`, `+${rp(side.def.reward)}`);
  G.missions.side = null;
  G.saveGame();
}

export function sideObjective(G) {
  const side = G.missions.side;
  if (!side) return null;
  const def = side.def;
  if (def.type === 'timedDeliver') {
    const lm = landmark(G, 'plaza');
    return { label: `${def.title} — ${Math.max(0, Math.ceil(def.timeLimit - side.t))} dtk`, x: lm.x, y: lm.y };
  }
  if (def.type === 'taxi') {
    const lm = landmark(G, side.stage === 0 ? 'halte' : 'pasar');
    return { label: side.stage === 0 ? 'Jemput penumpang di Halte' : 'Antar ke Pasar Senja', x: lm.x, y: lm.y };
  }
  if (def.type === 'collect') {
    let next = null;
    for (const c of side.coins) if (!c.taken) { next = c; break; }
    return { label: `${def.title} — ${side.coinsLeft} koin lagi`, x: next ? next.x : null, y: next ? next.y : null };
  }
  return null;
}
