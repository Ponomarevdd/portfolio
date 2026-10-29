// Живые фрагменты сайта Совета ректоров (компоненты RectorsDesk и RectorsPhone): курсор и касания листают слайдер,
// открывают подменю и меню на телефоне. Сценарии идут, только пока блок на экране. Общие для кейса и обложки.
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// Пауза, которая ждёт, пока блок снова не окажется на экране
export function gate(el: HTMLElement, threshold = .3) {
  let visible = false;
  let wake: (() => void) | null = null;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && wake) { wake(); wake = null; } }, { threshold }).observe(el);
  const on = () => (visible ? Promise.resolve() : new Promise<void>((r) => { wake = r; }));
  return async (ms: number) => { await on(); await new Promise((r) => setTimeout(r, ms)); await on(); };
}

// Фрагмент шириной data-fit (1280) уменьшается под окно: масштаб на дочерний .rc-fit
export function fit(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-fit]').forEach((view) => {
    const inner = view.firstElementChild as HTMLElement | null;
    if (!inner) return;
    const base = Number(view.dataset.fit);
    new ResizeObserver(() => inner.style.setProperty('--k', String(view.clientWidth / base))).observe(view);
  });
}

// Координаты элемента в системе масштабированного фрагмента space (до масштаба)
export const at = (space: HTMLElement, el: Element, dx = .5, dy = .5): [number, number] => {
  const s = space.getBoundingClientRect(), r = el.getBoundingClientRect(), k = s.width / space.offsetWidth || 1;
  return [(r.left - s.left + r.width * dx) / k, (r.top - s.top + r.height * dy) / k];
};

export function cursorOf(cursor: HTMLElement, wait: (ms: number) => Promise<void>) {
  return {
    hide(x: number, y: number) {
      cursor.style.transition = 'none'; cursor.style.opacity = '0'; cursor.style.transform = `translate(${x}px, ${y}px)`;
      void cursor.offsetWidth; cursor.style.transition = '';
    },
    show() { cursor.style.opacity = '1'; },
    fade() { cursor.style.opacity = '0'; },
    async move([x, y]: [number, number], ms = 950) { cursor.style.transform = `translate(${x}px, ${y}px)`; await wait(ms); },
    click() { cursor.classList.remove('is-click'); void cursor.offsetWidth; cursor.classList.add('is-click'); },
  };
}

// Слайдер главной: следующий слайд (десктоп — слайды и стрелка, телефон — слайды и точки)
export function nextSlide(root: HTMLElement) {
  const slides = [...root.querySelectorAll<HTMLElement>('.ra-slide, .ra-mslide')];
  const dots = [...root.querySelectorAll<HTMLElement>('.ra-dots i')];
  const cur = slides.findIndex((s) => s.classList.contains('is-on'));
  const n = (cur + 1) % slides.length;
  slides.forEach((s, i) => s.classList.toggle('is-on', i === n));
  dots.forEach((d, i) => d.classList.toggle('is-on', i === n));
}
export function firstSlide(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.ra-slide, .ra-mslide').forEach((s, i) => s.classList.toggle('is-on', i === 0));
  root.querySelectorAll<HTMLElement>('.ra-dots i').forEach((d, i) => d.classList.toggle('is-on', i === 0));
}
export async function press(el: HTMLElement, wait: (ms: number) => Promise<void>) {
  el.classList.add('is-press'); await wait(260); el.classList.remove('is-press');
}

// Касание на телефоне: круг в точке элемента
export async function tap(screen: HTMLElement, mark: HTMLElement, el: Element, wait: (ms: number) => Promise<void>) {
  const [x, y] = at(screen, el);
  mark.style.left = `${x}px`; mark.style.top = `${y}px`;
  mark.classList.remove('is-tap'); void mark.offsetWidth; mark.classList.add('is-tap');
  await wait(320);
}

// Телефон: меню открывается, «Совет ректоров» раскрывается аккордеоном и закрывается
export async function phoneMenu(phone: HTMLElement, screen: HTMLElement, mark: HTMLElement, wait: (ms: number) => Promise<void>) {
  const burger = phone.querySelector<HTMLElement>('[data-burger]')!;
  const acc = phone.querySelector<HTMLElement>('[data-acc]')!;
  const row = acc.querySelector<HTMLElement>('.ra-mmenu__row')!;
  await tap(screen, mark, burger, wait); phone.classList.add('is-menu'); await wait(1000);
  await tap(screen, mark, row, wait); acc.classList.add('is-open'); await wait(2600);
  await tap(screen, mark, row, wait); acc.classList.remove('is-open'); await wait(800);
  await tap(screen, mark, burger, wait); phone.classList.remove('is-menu'); await wait(600);
}
