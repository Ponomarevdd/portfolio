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
}, { rootMargin: '-12% 0px -12% 0px' });

document.querySelectorAll<HTMLElement>('.sc [data-anim], .sc [data-count]').forEach((el) => observer.observe(el));


// LMS: курсор проходит сценарий «продолжить урок → записаться на вебинар», пока блок на экране.
const lms = document.querySelector<HTMLElement>('.sc-lms');
if (lms && !reduced) {
  const $ = (k: string) => lms.querySelector<HTMLElement>(`[data-d="${k}"]`)!;
  const $$ = (k: string) => [...lms.querySelectorAll<HTMLElement>(`[data-d="${k}"]`)];
  const cursor = lms.querySelector<HTMLElement>('.lms-cursor')!;
  let visible = false;
  let wake: (() => void) | null = null;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake?.(); }, { rootMargin: '-15% 0px -15% 0px' }).observe(lms);
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const ready = () => visible ? Promise.resolve() : new Promise<void>((r) => { wake = () => { wake = null; r(); }; });
  const pos = (el: HTMLElement, dx = .5, dy = .5) => {
    const a = lms.getBoundingClientRect(), b = el.getBoundingClientRect();
    return [b.left - a.left + b.width * dx, b.top - a.top + b.height * dy];
  };
  const moveTo = async (el: HTMLElement, dx?: number, dy?: number) => {
    const [x, y] = pos(el, dx, dy);
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    await sleep(950);
    el.classList.add('is-hover');
  };
  const click = async (el: HTMLElement) => {
    cursor.classList.remove('is-click'); void cursor.offsetWidth; cursor.classList.add('is-click');
    el.classList.add('is-press'); await sleep(160); el.classList.remove('is-press');
  };
  const set = (k: string, v: string) => { $(k).textContent = v; };
  const reset = () => {
    lms.querySelectorAll('.is-hover').forEach((e) => e.classList.remove('is-hover'));
    $('fill').style.setProperty('--v', '.3'); set('pct', '30%'); set('left', 'Осталось 7 мин');
    $('course-fill').style.setProperty('--v', '.06'); set('course-pct', '6%'); set('course-done', '1 из 18 уроков');
    set('stat', '1 из 18'); set('hello', 'Вы прошли 1 из 18 уроков курса для педагогов');
    const rows = $$('lesson'); rows.forEach((r, i) => r.classList.toggle('lms-lesson--now', i === 0)); rows[0].classList.remove('lms-lesson--done');
    $('web').classList.remove('is-done'); $('toast').classList.remove('is-on');
  };
  const run = async () => {
    for (;;) {
      await ready();
      if (lms.clientWidth < 700) { await sleep(2000); continue; }
      reset();
      const start = pos($('help'), .9, 1.1);
      cursor.style.transition = 'none'; cursor.style.transform = `translate(${start[0]}px, ${start[1]}px)`;
      void cursor.offsetWidth; cursor.style.transition = ''; cursor.style.opacity = '1';
      await sleep(600);
      await moveTo($('continue'), .35, .55); await click($('continue'));
      $('fill').style.setProperty('--v', '1'); set('pct', '100%'); set('left', 'Урок пройден');
      await sleep(1300);
      $('continue').classList.remove('is-hover');
      const rows = $$('lesson');
      rows[0].classList.remove('lms-lesson--now'); rows[0].classList.add('lms-lesson--done'); rows[1].classList.add('lms-lesson--now');
      set('stat', '2 из 18'); set('hello', 'Вы прошли 2 из 18 уроков курса для педагогов');
      await moveTo($('course'), .6, .45);
      $('course-fill').style.setProperty('--v', '.11'); set('course-pct', '11%'); set('course-done', '2 из 18 уроков');
      await sleep(1300); $('course').classList.remove('is-hover');
      await moveTo($('web'), .4, .5); await click($('web'));
      $('web').classList.add('is-done'); $('toast').classList.add('is-on');
      await sleep(2400);
      $('toast').classList.remove('is-on'); cursor.style.opacity = '0';
      await sleep(2200);
    }
  };
  run();
}
