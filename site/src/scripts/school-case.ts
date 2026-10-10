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


// LMS: курсор открывает урок, «читает» лонгрид, возвращается на главную и видит обновлённый прогресс.
const lms = document.querySelector<HTMLElement>('.sc-lms');
if (lms && !reduced) {
  const $ = (k: string) => lms.querySelector<HTMLElement>(`[data-d="${k}"]`)!;
  const $$ = (k: string) => [...lms.querySelectorAll<HTMLElement>(`[data-d="${k}"]`)];
  const cursor = lms.querySelector<HTMLElement>('.lms-cursor')!;
  const read = $('read'), scroll = $('scroll'), tocBox = read.querySelector<HTMLElement>('.lr-toc')!;
  const toc = [...read.querySelectorAll<HTMLElement>('[data-d="toc"]')];
  const secs = [...read.querySelectorAll<HTMLElement>('[data-d="sec"]')];
  const tocCount = read.querySelector<HTMLElement>('[data-d="toc-count"]')!;
  const tocRail = read.querySelector<HTMLElement>('[data-d="toc-rail"]')!;
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
  const instant = (els: HTMLElement[], fn: () => void) => {
    els.forEach((e) => { e.style.transition = 'none'; });
    fn(); void lms.offsetWidth;
    els.forEach((e) => { e.style.transition = ''; });
  };
  const reading = (k: number) => {
    toc.forEach((t, i) => { t.classList.toggle('is-done', i < k); t.classList.toggle('is-now', i === k); });
    tocCount.textContent = `Изучено ${k + 1} из ${toc.length} разделов`;
    tocRail.style.setProperty('--rail', `${Math.round(k / (toc.length - 1) * 100)}%`);
  };
  const reset = () => {
    lms.querySelectorAll('.is-hover').forEach((e) => e.classList.remove('is-hover'));
    read.classList.remove('is-open');
    instant([scroll, tocBox, $('read-fill')], () => { scroll.style.transform = ''; tocBox.style.transform = ''; $('read-fill').style.setProperty('--v', '.3'); });
    set('read-pct', '30%'); reading(0);
    $('fill').style.setProperty('--v', '.3'); set('pct', '30%'); set('left', 'Осталось 7 мин');
    set('btn', 'Продолжить'); set('cont-cap', 'Продолжить · Курс для педагогов'); set('cont-title', 'С чего начать работу в Цифровой платформе');
    $('course-fill').style.setProperty('--v', '.06'); set('course-pct', '6%'); set('course-done', '1 из 18 уроков');
    set('stat', '1 из 18'); set('hello', 'Вы прошли 1 из 18 уроков курса для педагогов');
    const rows = $$('lesson'); rows.forEach((r, i) => r.classList.toggle('lms-lesson--now', i === 0)); rows[0].classList.remove('lms-lesson--done');
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
      // Открываем урок
      await moveTo($('continue'), .35, .55); await click($('continue'));
      $('continue').classList.remove('is-hover');
      read.classList.add('is-open');
      await sleep(700);
      const view = scroll.parentElement!;
      await moveTo(view, .62, .55);
      // Одна плавная прокрутка до конца урока, содержание отмечает разделы по ходу
      const base = scroll.getBoundingClientRect().top;
      const at = (el: HTMLElement) => el.getBoundingClientRect().top - base;
      // Финальный блок урока доезжает до верха окна, чтобы его было видно и на невысоком экране
      const end = Math.max(0, at(secs[secs.length - 1]) - 24);
      const tocTop = tocBox.getBoundingClientRect().top - base;
      const dur = 5200;
      [scroll, tocBox].forEach((e) => { e.style.transition = `transform ${dur}ms cubic-bezier(.45,0,.35,1)`; });
      scroll.style.transform = `translateY(${-end}px)`;
      tocBox.style.transform = `translateY(${Math.max(0, end - tocTop + 8)}px)`;
      $('read-fill').style.transition = `transform ${dur}ms cubic-bezier(.45,0,.35,1)`;
      $('read-fill').style.setProperty('--v', '1');
      const marks = secs.map((sec) => Math.min(1, Math.max(0, (at(sec) - view.clientHeight * .5) / Math.max(1, end))));
      const t0 = performance.now();
      let shown = -1;
      while (performance.now() - t0 < dur) {
        const p = (performance.now() - t0) / dur;
        const k = marks.filter((m) => p >= m).length - 1;
        const idx = k === secs.length - 1 ? toc.length - 1 : Math.max(0, k);
        if (idx !== shown) { shown = idx; reading(idx); }
        set('read-pct', `${Math.round((.3 + .7 * p) * 100)}%`);
        await sleep(120);
      }
      reading(toc.length - 1); set('read-pct', '100%');
      [scroll, tocBox, $('read-fill')].forEach((e) => { e.style.transition = ''; });
      await sleep(500);
      // Завершаем урок и возвращаемся на главную
      await moveTo($('finish'), .4, .55); await click($('finish'));
      read.classList.remove('is-open'); $('finish').classList.remove('is-hover');
      await sleep(600);
      $('fill').style.setProperty('--v', '1'); set('pct', '100%'); set('left', 'Урок пройден');
      await sleep(1100);
      const rows = $$('lesson');
      rows[0].classList.remove('lms-lesson--now'); rows[0].classList.add('lms-lesson--done'); rows[1].classList.add('lms-lesson--now');
      set('stat', '2 из 18'); set('hello', 'Вы прошли 2 из 18 уроков курса для педагогов');
      $('course-fill').style.setProperty('--v', '.11'); set('course-pct', '11%'); set('course-done', '2 из 18 уроков');
      set('btn', 'Следующий урок');
      await moveTo($('continue'), .4, .55);
      await sleep(2600);
      $('continue').classList.remove('is-hover'); cursor.style.opacity = '0';
      await sleep(1800);
    }
  };
  run();
}
