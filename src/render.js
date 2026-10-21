import { VIEW_W, VIEW_H } from './config.js';

// Adapte le canvas à l'écran : on garde le format 360 × 640, on l'agrandit
// au maximum sans le déformer (bandes noires sur les côtés si besoin, c'est
// le « letterbox »), et on dessine avec assez de pixels pour un écran Retina.
export function createScreen(canvas) {
  const ctx = canvas.getContext('2d');
  const screen = { canvas, ctx, scale: 1, left: 0, top: 0 };

  function fit() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scale = Math.min(w / VIEW_W, h / VIEW_H);
    const cssW = Math.floor(VIEW_W * scale);
    const cssH = Math.floor(VIEW_H * scale);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    screen.scale = scale;
    screen.left = Math.floor((w - cssW) / 2);
    screen.top = Math.floor((h - cssH) / 2);

    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.style.left = `${screen.left}px`;
    canvas.style.top = `${screen.top}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);

    // Après ça, on dessine en coordonnées 360 × 640 et le canvas s'occupe du reste.
    ctx.setTransform(canvas.width / VIEW_W, 0, 0, canvas.height / VIEW_H, 0, 0);
  }

  fit();
  window.addEventListener('resize', fit);
  return screen;
}

export function drawFrame(ctx, world) {
  ctx.fillStyle = '#060a1f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.fillStyle = '#3cf';
  ctx.fillRect(world.x - 10, world.y - 10, 20, 20);
}
