// Ojek GTA: Raja Jalanan Kota Senja — program penyerahan entri (Node 22,
// stdlib saja). Game-nya file statis di folder game/ (index.html + modul ES,
// tanpa library, tanpa network); program ini menyalin game/ dan screenshots/
// dari samping file ini ke /output lalu menulis /output/dossier.json —
// ringkasan yang dibaca juri — memakai library make.fun yang di-vendor-kan.
//
// Mainkan lokal dengan `node serve.ts`, lalu buka http://localhost:8080.
// Di luar container grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Batas gate yang sama dengan scorer: dossier ditulis dari game/ dan
// screenshots/ yang sudah disalin, jadi isinya persis yang dinilai.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
