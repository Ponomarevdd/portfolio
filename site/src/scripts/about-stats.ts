import { gsap } from 'gsap';
import { gradientAscii } from './motion-settings';

// Карточки «Немного в цифрах»: при наведении из-под курсора проступает сетка мерцающих точек
// в цветах градиента главной, рядом с курсором точки ярче и под ними мягкое свечение
const [orange, , yellow, peach] = gradientAscii.colors;
const pixel = {
  colors: [orange, peach, yellow],
  glow: peach,
  gap: 5,          // шаг сетки, px
  size: 2,         // диаметр точки, px
  reveal: 600,     // за сколько мс волна доходит до дальнего угла
  fade: 700,       // за сколько мс точки гаснут после ухода курсора
  opacity: .35,    // яркость точек вдали от курсора
  spotlight: .5,   // насколько ярче точки у курсора
  spot: 180,       // радиус пятна у курсора, px
  glowAlpha: .5,
};

type Dot = { x: number; y: number; color: string; delay: number; phase: number; speed: number };

function pixels(card: HTMLElement) {
  const surface = card.querySelector<HTMLElement>('.stat-surface')!;
  const canvas = document.createElement('canvas');
  canvas.className = 'stat-pixels';
  canvas.setAttribute('aria-hidden', 'true');
  surface.prepend(canvas);
  const ctx = canvas.getContext('2d')!;
  let dots: Dot[] = [];
  let w = 0, h = 0, frame = 0, start = 0, leftAt = 0, inside = false;
  let px = 0, py = 0;

  const layout = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = surface.clientWidth; h = surface.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const step = pixel.gap + pixel.size;
    dots = [];
    for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) {
      dots.push({ x, y, color: pixel.colors[Math.floor(Math.random() * pixel.colors.length)], delay: 0, phase: Math.random() * Math.PI * 2, speed: .004 + Math.random() * .004 });
    }
  };
  // Волна идёт от точки входа курсора
  const origin = (x: number, y: number) => {
    const far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y)) || 1;
    dots.forEach((d) => { d.delay = Math.hypot(d.x - x, d.y - y) / far * pixel.reveal; });
  };

  const draw = (now: number) => {
    const t = now - start;
    const out = inside ? 1 : Math.max(0, 1 - (now - leftAt) / pixel.fade);
    ctx.clearRect(0, 0, w, h);
    if (out <= 0) { frame = 0; return; }
    const glow = ctx.createRadialGradient(px, py, 0, px, py, pixel.spot);
    glow.addColorStop(0, `${pixel.glow}${Math.round(pixel.glowAlpha * 0x40 * out).toString(16).padStart(2, '0')}`);
    glow.addColorStop(1, `${pixel.glow}00`);
    ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
    for (const d of dots) {
      const grow = Math.min(1, Math.max(0, (t - d.delay) / 220));
      if (!grow) continue;
      const shimmer = .65 + .35 * Math.sin(d.phase + now * d.speed);
      const near = Math.max(0, 1 - Math.hypot(d.x - px, d.y - py) / pixel.spot);
      ctx.globalAlpha = Math.min(1, (pixel.opacity + pixel.spotlight * near) * out * grow);
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(d.x, d.y, pixel.size / 2 * shimmer * (1 + near * .6), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    frame = requestAnimationFrame(draw);
  };
  const local = (event: PointerEvent) => { const r = surface.getBoundingClientRect(); px = event.clientX - r.left; py = event.clientY - r.top; };
  const enter = (event: PointerEvent) => {
    local(event);
    if (!inside && !frame) { start = performance.now(); origin(px, py); }
    inside = true;
    if (!frame) frame = requestAnimationFrame(draw);
  };
  const move = (event: PointerEvent) => local(event);
  const leave = () => { inside = false; leftAt = performance.now(); };

  const resize = new ResizeObserver(layout);
  resize.observe(surface);
  card.addEventListener('pointerenter', enter);
  card.addEventListener('pointermove', move);
  card.addEventListener('pointerleave', leave);
  return () => {
    resize.disconnect(); cancelAnimationFrame(frame); canvas.remove();
    card.removeEventListener('pointerenter', enter); card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave);
  };
}

const media = gsap.matchMedia();
media.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
  const cleanups = [...document.querySelectorAll<HTMLElement>('.stat-card')].map((card) => {
    const surface = card.querySelector<HTMLElement>('.stat-surface')!;
    const stopPixels = pixels(card);
    // Обводка: волна от точки входа (--ox/--oy, --wave), яркое пятно у курсора (--mx/--my)
    const edge = { wave: 0, edge: 0 };
    const paint = () => { surface.style.setProperty('--wave', `${edge.wave}px`); surface.style.setProperty('--edge', `${edge.edge}`); };
    const point = (event: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      return [event.clientX - r.left, event.clientY - r.top, r.width, r.height];
    };
    const spot = (event: PointerEvent) => { const [x, y] = point(event); surface.style.setProperty('--mx', `${x}px`); surface.style.setProperty('--my', `${y}px`); };
    const enter = (event: PointerEvent) => {
      const [x, y, w, h] = point(event);
      spot(event);
      if (edge.edge < .05) {
        surface.style.setProperty('--ox', `${x}px`); surface.style.setProperty('--oy', `${y}px`);
        edge.wave = 0;
        const far = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y));
        gsap.to(edge, { wave: far * 1.5, duration: .6, ease: 'power2.out', onUpdate: paint, overwrite: 'auto' });
      }
      gsap.to(edge, { edge: 1, duration: .25, ease: 'power1.out', onUpdate: paint, overwrite: 'auto' });
    };
    const move = (event: PointerEvent) => {
      spot(event);
      const rect = card.getBoundingClientRect();
      gsap.to(surface, { rotationY: ((event.clientX - rect.left) / rect.width - .5) * 10, rotationX: -((event.clientY - rect.top) / rect.height - .5) * 8, y: -4, duration: .45, overwrite: true, ease: 'power2.out' });
    };
    const leave = () => {
      gsap.to(surface, { rotationX: 0, rotationY: 0, y: 0, duration: .7, overwrite: true, ease: 'elastic.out(1,.6)' });
      gsap.to(edge, { edge: 0, duration: .7, ease: 'power1.out', onUpdate: paint, overwrite: 'auto' });
    };
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
    return () => {
      stopPixels(); gsap.killTweensOf(edge);
      card.removeEventListener('pointerenter', enter); card.removeEventListener('pointermove', move); card.removeEventListener('pointerleave', leave);
      gsap.killTweensOf(surface); gsap.set(surface, { clearProps: 'transform' });
      ['--wave', '--edge', '--ox', '--oy', '--mx', '--my'].forEach((name) => surface.style.removeProperty(name));
    };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
});
if (import.meta.hot) import.meta.hot.dispose(() => media.revert());
