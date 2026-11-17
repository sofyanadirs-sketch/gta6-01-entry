# Ojek GTA: Raja Jalanan Kota Senja

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/sofyanadirs-sketch/gta6-01-entry/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/sofyanadirs-sketch/gta6-01-entry/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Game open-world kriminal 2D di kota fiktif **Kota Senja**: kamu Budi, driver ojek yang naik pangkat dari antar penumpang sampai jadi **Raja Jalanan**. Jelajahi kota jalan kaki atau naik mobil/motor curian, kabur dari polisi berbintang, kerjakan 5 misi cerita + misi sampingan, dan pukul preman yang menghalangi jalanmu. Uang Rupiah, wanted level 1–5, HUD + minimap, save otomatis, dan suara sintetis WebAudio — semua orisinil, tanpa aset game komersial apa pun.

## Cara main

- **WASD / panah** — jalan & nyetir, **Shift** lari
- **E** — curi / naik mobil (dekat kendaraan), **E** lagi untuk turun
- **F** — pukul, **Spasi** — rem tangan, **Q** — misi sampingan
- **P / Esc** — pause, **M** — suara nyala/mati

Misi cerita (berurutan): Penumpang Pertama → Kejar Si Jago → Paket Pak RT → Balapan Liar → Kabur dari Razia. Misi sampingan: Antar Bakso, Penumpang Dadakan, Koin Kota.

## Run it

```sh
node serve.ts
# buka http://localhost:8080
```

Game-nya file statis di `game/` (tanpa build step, tanpa network). Entrinya diserahkan oleh `main.ts` (Node 22, stdlib saja):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=h9b99srf&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
