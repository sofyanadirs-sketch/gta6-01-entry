// Suara sintetis WebAudio — tanpa file audio sama sekali.
// Efek: blip, koin, pukulan, klakson, sirene, jingle misi, ledakan.
// Musik: bassline senja sederhana yang dijadwalkan tiap ketukan.

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let bassStep = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    } catch {
      return false;
    }
    return true;
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure() || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const g = ctx.createGain();
    g.gain.value = vol || 0.25;
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t0);
  }

  const api = {
    unlock,
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
      if (m) api.stopEngine();
    },
    isMuted() { return muted; },
    blip() { tone(660, 0.09, 'square', 0.12); },
    coin() { tone(880, 0.08, 'sine', 0.18); setTimeout(() => tone(1320, 0.14, 'sine', 0.18), 70); },
    punch() { noise(0.12, 0.3, 900); tone(140, 0.1, 'sine', 0.25, 60); },
    hurt() { tone(220, 0.18, 'sawtooth', 0.16, 110); },
    horn() { tone(370, 0.22, 'square', 0.1); tone(466, 0.22, 'square', 0.08); },
    crash() { noise(0.35, 0.4, 700); tone(90, 0.3, 'sine', 0.3, 40); },
    explode() { noise(0.7, 0.5, 500); tone(70, 0.6, 'sine', 0.35, 30); },
    pickup() { tone(520, 0.1, 'triangle', 0.2); setTimeout(() => tone(780, 0.16, 'triangle', 0.2), 90); },
    jingle() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.2), i * 110));
    },
    fail() {
      const notes = [392, 330, 262];
      notes.forEach((f, i) => setTimeout(() => tone(f, 0.25, 'sawtooth', 0.12), i * 140));
    },
    startEngine(speed01) {
      if (!ensure() || muted) return;
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 60;
        engineGain.gain.value = 0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      engineOsc.frequency.value = 55 + speed01 * 130;
      engineGain.gain.value = 0.05 + speed01 * 0.05;
    },
    stopEngine() {
      if (engineGain) engineGain.gain.value = 0;
    },
    siren(on) {
      if (!ensure()) return;
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 700;
        sirenGain.gain.value = muted ? 0 : 0.045;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 1.6;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        lfo.start();
        api._sirenLfo = lfo;
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); } catch { /* sudah berhenti */ }
        try { api._sirenLfo.stop(); } catch { /* sudah berhenti */ }
        sirenOsc = null;
        sirenGain = null;
      }
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      // Bassline senja: Am – F – C – G, satu not per 0,42 detik.
      const bass = [110, 87.31, 130.81, 98];
      musicTimer = setInterval(() => {
        if (muted || !ctx || ctx.state !== 'running') return;
        const f = bass[bassStep % bass.length];
        bassStep += 1;
        tone(f, 0.38, 'triangle', 0.07);
        if (bassStep % 4 === 0) tone(f * 2, 0.2, 'sine', 0.04);
      }, 420);
    },
    stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    },
  };
  return api;
}
