// Ojek GTA: Raja Jalanan Kota Senja — konfigurasi dunia, palet, misi.
// Semua angka dan teks di sini orisinil; kota, nama dan cerita fiktif.

export const TILE = 48;
export const WORLD_TILES = 64;
export const WORLD = TILE * WORLD_TILES; // 3072 x 3072 px

// Garis jalan (indeks tile, tiap jalan lebar 2 tile) — grid kota 7 x 7 jalan.
export const ROAD_LINES = [6, 14, 22, 30, 38, 46, 54];
export const ROAD_W = 2 * TILE;

// Palet senja "Kota Senja": oranye-ungu, jalan aspal gelap, neon.
export const PALETTE = {
  grass: '#3f7a4a',
  grassDark: '#356b40',
  park: '#2e6b3a',
  sidewalk: '#8a7f74',
  road: '#2b2b33',
  roadEdge: '#1d1d24',
  lane: '#e8d44d',
  buildingRoof: ['#b5543a', '#4a6b8a', '#7a5a8a', '#3a8a6b', '#a87a3a', '#5a4a7a', '#8a3a4a'],
  buildingWall: '#241f2e',
  windowLit: '#ffd76a',
  windowDark: '#2e2a3a',
  water: '#2a5a8a',
  tree: '#2f7a3d',
  treeDark: '#256b33',
  carColors: ['#e84a4a', '#4a90e8', '#e8c84a', '#7ae84a', '#e84ad8', '#f0f0f0', '#4ad8e8', '#ff8a3a'],
  taxi: '#f2c200',
  police: '#2a4ad8',
  player: '#ff5a3a',
};

export const PLAYER = {
  walkSpeed: 195,
  runSpeed: 260,
  radius: 13,
  hpMax: 100,
  punchDamage: 12,
  punchRange: 34,
  punchArc: 1.1,
  punchCooldown: 0.38,
};

export const CAR = {
  accel: 420,
  brake: 620,
  reverseAccel: 260,
  maxSpeed: 430,
  maxReverse: 150,
  steer: 2.6,
  grip: 0.94,
  radius: 16,
};

export const WANTED = {
  max: 5,
  decaySeconds: 26,
  stealCrime: 1,
  hitPedCrime: 1,
  hitCopCrime: 2,
  punchCopCrime: 2,
  bustDistance: 46,
  bustSeconds: 1.6,
};

// Hadiah misi cerita (Rupiah).
export const STORY_MISSIONS = [
  {
    id: 'm1',
    title: 'Penumpang Pertama',
    giver: 'Pak RT',
    brief: 'Antar Bu Sari dari Taman Senja ke Stasiun Kota. Jangan ngebut di gang!',
    reward: 50000,
    steps: [
      { type: 'goto', label: 'Jemput Bu Sari di Taman Senja', at: 'taman' },
      { type: 'deliver', label: 'Antar Bu Sari ke Stasiun Kota', at: 'stasiun', needsPassenger: true },
    ],
  },
  {
    id: 'm2',
    title: 'Kejar Si Jago',
    giver: 'Budi',
    brief: 'Si Jago ngambil orderanmu! Kejar motornya dan senggol 3 kali sampai dia nyerah.',
    reward: 75000,
    steps: [
      { type: 'chase', label: 'Kejar Si Jago! Senggol motornya 3x', hits: 3 },
    ],
  },
  {
    id: 'm3',
    title: 'Paket Pak RT',
    giver: 'Pak RT',
    brief: 'Ambil paket di Warung Mbak Yuni, antar ke Gang Mawar. Polisi lagi razia — hati-hati!',
    reward: 100000,
    steps: [
      { type: 'goto', label: 'Ambil paket di Warung Mbak Yuni', at: 'warung' },
      { type: 'deliver', label: 'Antar paket ke Gang Mawar (wanted naik!)', at: 'gang', wantedOnStart: 1 },
    ],
  },
  {
    id: 'm4',
    title: 'Balapan Liar',
    giver: 'Rudi Balap',
    brief: 'Balapan liar 5 checkpoint keliling kota. 90 detik. Jangan sampai kalah!',
    reward: 150000,
    steps: [
      { type: 'race', label: 'Balapan! Lewati 5 checkpoint sebelum waktu habis', checkpoints: 5, timeLimit: 90 },
    ],
  },
  {
    id: 'm5',
    title: 'Kabur dari Razia',
    giver: 'Budi',
    brief: 'Razia besar! Bintang 3. Kabur dan sampai ke Markas Rahasia sebelum ketangkep.',
    reward: 250000,
    steps: [
      { type: 'escape', label: 'Kabur! Sampai ke Markas Rahasia', at: 'markas', wantedOnStart: 3 },
    ],
  },
];

export const SIDE_MISSIONS = [
  { id: 's1', title: 'Antar Bakso', brief: 'Antar semangkuk bakso panas ke Plaza — 45 detik!', reward: 30000, timeLimit: 45, type: 'timedDeliver' },
  { id: 's2', title: 'Penumpang Dadakan', brief: 'Ada penumpang nunggu di Halte. Antar ke Pasar Senja.', reward: 40000, type: 'taxi' },
  { id: 's3', title: 'Koin Kota', brief: 'Kumpulkan 5 koin emas yang tersebar di kota.', reward: 20000, type: 'collect', count: 5 },
];

// Format Rupiah: 50000 -> "Rp50.000"
export function rp(n) {
  const v = Math.max(0, Math.round(n));
  return 'Rp' + String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// Format jam game: menit sejak 17:00 -> "17:42"
export function clockText(minutes) {
  const total = 17 * 60 + minutes;
  const h = Math.floor(total / 60) % 24;
  const m = Math.floor(total % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
