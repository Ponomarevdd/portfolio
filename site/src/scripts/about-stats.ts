import { gsap } from 'gsap';
import { gradientAscii } from './motion-settings';

// Карточки «Немного в цифрах»: при наведении из-под курсора проступает сетка мерцающих точек
// в цветах градиента главной, рядом с курсором точки ярче и крупнее
const [orange, , yellow, peach] = gradientAscii.colors;
const pixel = {
  colors: [orange, peach, yellow],
  gap: 5,          // шаг сетки, px
  size: 2,         // диаметр точки, px
  reveal: 800,     // за сколько мс волна доходит до дальнего угла
  crest: 260,      // сколько мс точка вспыхивает, когда до неё дошла волна
  fade: 700,       // за сколько мс точки гаснут после ухода курсора
  opacity: .35,    // яркость точек вдали от курсора
  spotlight: .5,   // насколько ярче точки у курсора
  spot: 120,       // радиус, в котором точки реагируют на курсор, px
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
    for (const d of dots) {
      const since = t - d.delay;
      if (since <= 0) continue;
      const grow = Math.min(1, since / 220);
      // Гребень волны: точки, до которых она только что дошла, вспыхивают и крупнее
      const crest = since < pixel.crest ? 1 - since / pixel.crest : 0;
      const shimmer = .65 + .35 * Math.sin(d.phase + now * d.speed);
      const near = Math.max(0, 1 - Math.hypot(d.x - px, d.y - py) / pixel.spot);
      ctx.globalAlpha = Math.min(1, (pixel.opacity + pixel.spotlight * near + .65 * crest) * out * grow);
      ctx.fillStyle = d.color;
      ctx.beginPath(); ctx.arc(d.x, d.y, pixel.size / 2 * shimmer * (1 + near * .5 + crest * 1.2), 0, Math.PI * 2); ctx.fill();
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
    // Обводка: яркое пятно на рамке у курсора (--mx/--my), гаснет после ухода
    const edge = { edge: 0 };
    const paint = () => surface.style.setProperty('--edge', `${edge.edge}`);
    const spot = (event: PointerEvent) => {
      const r = surface.getBoundingClientRect();
      surface.style.setProperty('--mx', `${event.clientX - r.left}px`); surface.style.setProperty('--my', `${event.clientY - r.top}px`);
    };
    const enter = (event: PointerEvent) => {
      spot(event);
      gsap.to(edge, { edge: 1, duration: .3, ease: 'power1.out', onUpdate: paint, overwrite: 'auto' });
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
      ['--edge', '--mx', '--my'].forEach((name) => surface.style.removeProperty(name));
    };
  });
  return () => cleanups.forEach((cleanup) => cleanup());
});
if (import.meta.hot) import.meta.hot.dispose(() => media.revert());
