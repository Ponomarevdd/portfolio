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


// Слайдер типов заданий: листается сам, пока виден; стрелки работают всегда.
document.querySelectorAll<HTMLElement>('.sc [data-slider]').forEach((root) => {
  const track = root.querySelector<HTMLElement>('[data-sl-track]');
  const count = root.querySelector<HTMLElement>('[data-sl-count]');
  if (!track || !count) return;
  const slides = Array.from(track.children) as HTMLElement[];
  let i = 0;
  let timer = 0;
  const go = (n: number) => {
    i = (n + slides.length) % slides.length;
    track.style.transform = `translateX(${-i * 100}%)`;
    slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== i)));
    count.textContent = `${i + 1} / ${slides.length}`;
  };
  const stop = () => { clearInterval(timer); timer = 0; };
  const play = () => { stop(); if (!reduced) timer = window.setInterval(() => go(i + 1), 3600); };
  root.querySelector('[data-sl-prev]')?.addEventListener('click', () => { go(i - 1); play(); });
  root.querySelector('[data-sl-next]')?.addEventListener('click', () => { go(i + 1); play(); });
  root.addEventListener('pointerenter', stop);
  root.addEventListener('pointerleave', () => { if (root.classList.contains('is-in')) play(); });
  new IntersectionObserver(([e]) => (e.isIntersecting ? play() : stop()), { threshold: .4 }).observe(root);
  go(0);
});

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
    $('acc').classList.remove('is-open'); $('sl-track').style.transform = ''; set('sl-count', '1 / 3');
    $$('quiz').forEach((q) => q.classList.remove('is-done')); lms.querySelectorAll('.is-ok').forEach((e) => e.classList.remove('is-ok'));
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
      // Урок читается с остановками: аккордеон, слайдер, самопроверка, финальный блок
      const rel = (el: HTMLElement) => el.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
      const vr = view.getBoundingClientRect();
      // Окно LMS бывает выше экрана, поэтому считаем по тому, что реально видно
      const seen = Math.max(320, Math.min(vr.height, innerHeight - Math.max(0, vr.top)) - 24);
      const last = secs[secs.length - 1];
      const endY = () => Math.max(0, rel(last) + last.offsetHeight + 96 - seen);
      const tocTop = rel(tocBox);
      const fill = $('read-fill');
      const glide = async (target: number, dur: number) => {
        const end = endY();
        const to = Math.min(Math.max(0, target), end);
        const ease = `transform ${dur}ms cubic-bezier(.45,0,.35,1)`;
        [scroll, tocBox, fill].forEach((e) => { e.style.transition = ease; });
        scroll.style.transform = `translateY(${-to}px)`;
        tocBox.style.transform = `translateY(${Math.max(0, to - tocTop + 8)}px)`;
        fill.style.setProperty('--v', String(.3 + .7 * to / Math.max(1, end)));
        const t0 = performance.now();
        let shown = -1;
        for (;;) {
          const done = performance.now() - t0 >= dur;
          const cur = done ? to : -new DOMMatrixReadOnly(getComputedStyle(scroll).transform).m42;
          const k = Math.max(0, secs.filter((sec) => rel(sec) - seen * .55 <= cur).length - 1);
          const idx = Number(secs[k].dataset.toc ?? k);
          if (idx !== shown) { shown = idx; reading(idx); }
          set('read-pct', `${Math.round((.3 + .7 * cur / Math.max(1, end)) * 100)}%`);
          if (done) break;
          await sleep(120);
        }
        [scroll, tocBox, fill].forEach((e) => { e.style.transition = ''; });
      };
      const tap = async (el: HTMLElement, dx = .5, dy = .5) => { await moveTo(el, dx, dy); await click(el); el.classList.remove('is-hover'); };
      // Аккордеон: открыть и закрыть первый пункт
      const acc = $('acc');
      await glide(rel(acc) - 160, 2600);
      await tap($('acc-btn'));
      acc.classList.add('is-open');
      await sleep(1700);
      await tap($('acc-btn'));
      acc.classList.remove('is-open');
      await sleep(700);
      // Слайдер: следующий тип задания
      const track = $('sl-track');
      await glide(rel(track.closest<HTMLElement>('.lr-slider')!) - 40, 3000);
      await tap($('sl-next'));
      track.style.transform = 'translateX(-100%)'; set('sl-count', '2 / 3');
      await sleep(1300);
      // Самопроверка: верные ответы на оба вопроса
      const quiz = $$('quiz');
      await glide(rel(quiz[0]) - 120, 2200);
      for (let q = 0; q < quiz.length; q++) {
        const ok = $(`quiz-ok-${q}`);
        await tap(ok, .3);
        ok.classList.add('is-ok'); quiz[q].classList.add('is-done');
        await sleep(700);
      }
      await sleep(400);
      // Финальный блок
      await glide(endY(), 1600);
      reading(toc.length - 1); set('read-pct', '100%');
      await sleep(400);
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

// «Аккуратная вёрстка»: высота сцены = высота десктопного кадра, чтобы отступ снизу был как по краям
document.querySelectorAll<HTMLElement>('.sc-pr .sc-resp__stage').forEach((stage) => {
  const frame = stage.querySelector<HTMLElement>('.sc-resp__frame');
  if (!frame) return;
  const fit = () => {
    const clone = frame.cloneNode(true) as HTMLElement;
    clone.style.cssText = 'position:absolute;visibility:hidden;animation:none;width:100%;left:0;top:0';
    stage.append(clone);
    stage.style.setProperty('--fh', `${clone.offsetHeight}px`);
    clone.remove();
  };
  fit();
  new ResizeObserver(fit).observe(stage.parentElement ?? stage);
  document.fonts?.ready.then(fit);
});

// Обложка: насколько прокручивать урок, зависит от ширины, поэтому шаги считаются по реальным блокам
document.querySelectorAll<HTMLElement>('.sc-hl').forEach((box) => {
  const track = box.querySelector<HTMLElement>('.sc-hl__track');
  const toc = box.querySelector<HTMLElement>('.sc-hl__toc');
  const quiz = box.querySelector<HTMLElement>('.sc-hl__quiz');
  const done = box.querySelector<HTMLElement>('.sc-hl__done');
  if (!track || !toc || !quiz || !done) return;
  const fit = () => {
    const pad = parseFloat(getComputedStyle(track).paddingTop) + 24; // запас под затухание снизу
    const view = box.clientHeight - track.offsetTop;
    const s1 = Math.max(0, Math.min(toc.offsetTop, quiz.offsetTop) - pad + 24, quiz.offsetTop + quiz.offsetHeight + pad - view);
    const s2 = Math.max(s1, done.offsetTop + done.offsetHeight + pad - view);
    box.style.setProperty('--s1', `${s1}px`);
    box.style.setProperty('--s2', `${s2}px`);
  };
  fit();
  new ResizeObserver(fit).observe(box);
  document.fonts?.ready.then(fit);
});
