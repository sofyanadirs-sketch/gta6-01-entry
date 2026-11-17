// Keyboard + mouse. Tombol yang ditahan dibaca tiap frame; tombol sekali
// tekan (E curi mobil, F pukul, Q misi sampingan, P pause, M mute) diantre
// sebagai event supaya tidak hilang di antara frame.

export const KEY_UP = 'KeyW';
export const KEY_DOWN = 'KeyS';
export const KEY_LEFT = 'KeyA';
export const KEY_RIGHT = 'KeyD';

export function createInput(canvas) {
  const held = new Set();
  const queue = [];
  let mouseX = 0;
  let mouseY = 0;
  let mouseClicked = false;

  const PRESS_KEYS = new Set(['KeyE', 'KeyF', 'KeyQ', 'KeyP', 'KeyM', 'Escape', 'Space', 'Enter', 'ShiftLeft', 'ShiftRight']);

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    if (PRESS_KEYS.has(e.code)) queue.push(e.code);
  }
  function onKeyUp(e) {
    held.delete(e.code);
  }
  function onBlur() {
    held.clear();
  }
  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  }
  function onMouseDown(e) {
    onMouseMove(e);
    mouseClicked = true;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  return {
    // Arah gerak: {x: -1..1, y: -1..1} dari WASD / panah.
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      return { x, y };
    },
    held(code) { return held.has(code); },
    // Ambil dan kosongkan semua tombol sekali-tekan sejak frame lalu.
    takePresses() {
      const out = queue.splice(0, queue.length);
      return out;
    },
    mouse() {
      const c = mouseClicked;
      mouseClicked = false;
      return { x: mouseX, y: mouseY, clicked: c };
    },
  };
}
