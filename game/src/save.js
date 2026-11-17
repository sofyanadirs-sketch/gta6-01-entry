// Save / load localStorage — progress Budi (uang, HP, misi, posisi, jam)
// tersimpan otomatis tiap misi selesai dan tiap 30 detik saat main.

export const SAVE_KEY = 'ojek-gta-kota-senja-v1';

export function saveGame(G) {
  try {
    const p = G.player;
    const data = {
      v: 1,
      money: Math.round(p.money),
      hp: Math.round(p.hp),
      x: Math.round(p.x),
      y: Math.round(p.y),
      storyIndex: G.missions.storyIndex,
      stepIndex: G.missions.stepIndex,
      completed: G.missions.completed,
      sideDone: G.missions.sideDone,
      clockMinutes: Math.round(G.clockMinutes),
      stats: G.stats,
      savedAt: G.time,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== 1) return null;
    return data;
  } catch {
    return null;
  }
}

export function applySave(G, data) {
  const p = G.player;
  p.money = data.money || 0;
  p.hp = data.hp || 100;
  p.x = data.x || p.x;
  p.y = data.y || p.y;
  G.missions.storyIndex = data.storyIndex || 0;
  G.missions.stepIndex = data.stepIndex || 0;
  G.missions.completed = data.completed || [];
  G.missions.sideDone = data.sideDone || 0;
  G.clockMinutes = data.clockMinutes || 0;
  if (data.stats) G.stats = { ...G.stats, ...data.stats };
}
