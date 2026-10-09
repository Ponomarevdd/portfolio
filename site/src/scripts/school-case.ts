// Кейс «Цифровая платформа для школ»: анимации запускаются только у блоков в зоне видимости.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const format = (value: number, decimals: number) => value.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

function countUp(el: HTMLElement) {
  if (el.dataset.counted) return;
  el.dataset.counted = '1';
  const to = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals ?? 0);
  const prefix = el.dataset.prefix ?? '';
  const suffix = el.dataset.suffix ?? '';
  const render = (v: number) => { el.textContent = `${prefix}${format(v, decimals)}${suffix}`; };
  if (reduced) return render(to);
  const start = performance.now();
  const duration = 1400;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / duration);
    render(to * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const el = entry.target as HTMLElement;
    if (el.hasAttribute('data-count')) {
      if (entry.isIntersecting) { countUp(el); observer.unobserve(el); }
      continue;
    }
    if (el.dataset.anim === 'once') { if (entry.isIntersecting) { el.classList.add('is-in'); observer.unobserve(el); } continue; }
    el.classList.toggle('is-in', entry.isIntersecting);
  }
}, { threshold: .25 });

document.querySelectorAll<HTMLElement>('.sc [data-anim], .sc [data-count]').forEach((el) => observer.observe(el));

