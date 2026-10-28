import './case-reveal';
// Кейс MedX: фрагменты макетов шире базовой ширины не перестраиваются, а уменьшаются целиком.
document.querySelectorAll<HTMLElement>('.sc-scale').forEach((box) => {
  const inner = box.firstElementChild as HTMLElement | null;
  if (!inner) return;
  const fit = () => {
    const base = parseFloat(getComputedStyle(box).getPropertyValue('--base'));
    const k = Math.min(1, box.clientWidth / base);
    box.classList.toggle('is-scaled', k < 1);
    box.style.setProperty('--k', String(k));
    box.style.height = k < 1 ? `${inner.offsetHeight * k}px` : '';
  };
  const ro = new ResizeObserver(fit);
  ro.observe(box); ro.observe(inner);
  fit();
});

// Текст макетов набран кривыми (integrations/curves.mjs); меняющиеся подписи берём из готового набора
const curves: Record<string, Record<string, string>> = JSON.parse(document.getElementById('cv-dyn')?.textContent || '{}');
const put = (el: HTMLElement, key: string, text: string) => {
  const html = curves[key]?.[text];
  if (html) el.innerHTML = html; else el.textContent = text;
};

// Лонгрид в действии: страница прокручивается, содержание подсвечивает текущий раздел и считает прочитанное,
// курсор переходит по пунктам содержания. Работает, только пока окно на экране.
const act = document.querySelector<HTMLElement>('.mx-act');
if (act && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const view = act.querySelector<HTMLElement>('.mx-act__view')!;
  const cursor = act.querySelector<HTMLElement>('.mx-cursor')!;
  const counter = act.querySelector<HTMLElement>('[data-dyn="mx-read"]')!;
  const bar = act.querySelector<HTMLElement>('.mx-act__bar')!;
  const toc = [...act.querySelectorAll<HTMLElement>('.toc-sec, .toc-it')];
  const heads = [...act.querySelectorAll<HTMLElement>('article h2.h1, article h3.h2')];
  // Разделы с подпунктами («Кого вакцинировать?», «Как вакцинировать?») в счёт не идут
  const leaf = toc.map((t) => !t.nextElementSibling?.querySelector(':scope > .toc-it'));
  const total = leaf.filter(Boolean).length;
  const scale = () => act.getBoundingClientRect().width / act.offsetWidth;
  const top = (h: HTMLElement) => h.getBoundingClientRect().top / scale() - view.getBoundingClientRect().top / scale() + view.scrollTop - 40;
  const max = () => view.scrollHeight - view.clientHeight;

  let read = -1, on = -1;
  const spy = () => {
    const y = view.scrollTop;
    let cur = -1;
    heads.forEach((h, i) => { if (leaf[i] && top(h) <= y + view.clientHeight * .3) cur = i; });
    if (cur !== on) { toc.forEach((t, i) => t.classList.toggle('is-on', i === cur)); on = cur; }
    const r = y >= max() - 2 ? total : Math.max(0, leaf.slice(0, cur + 1).filter(Boolean).length - 1);
    if (r !== read) { read = r; put(counter, 'mx-read', `Прочитано ${r} из ${total}`); bar.style.width = `${(r / total) * 100}%`; }
  };
  view.addEventListener('scroll', spy, { passive: true });

  let visible = false, wake: (() => void) | null = null;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && wake) { wake(); wake = null; } }, { threshold: .35 }).observe(act);
  const gate = () => (visible ? Promise.resolve() : new Promise<void>((r) => { wake = r; }));
  const wait = async (ms: number) => { await gate(); await new Promise((r) => setTimeout(r, ms)); await gate(); };
  const ease = (t: number) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const scrollTo = async (to: number, ms: number) => {
    await gate();
    const from = view.scrollTop, d = Math.min(max(), Math.max(0, to)) - from, t0 = performance.now();
    await new Promise<void>((done) => {
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        view.scrollTop = from + d * ease(t);
        if (t < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
  };
  const at = (el: HTMLElement, dx = .35, dy = .5) => {
    const k = scale(), a = act.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [(r.left - a.left + r.width * dx) / k, (r.top - a.top + r.height * dy) / k];
  };
  const move = async (x: number, y: number) => { cursor.style.transform = `translate(${x}px, ${y}px)`; await wait(950); };
  // Пункты содержания в кривых, текста в них нет: берём по порядку, он совпадает с заголовками статьи
  const go = async (i: number) => {
    const el = toc[i];
    await move(...(at(el) as [number, number]));
    el.classList.add('is-hover'); await wait(350);
    cursor.classList.remove('is-click'); void cursor.offsetWidth; cursor.classList.add('is-click');
    await wait(250); el.classList.remove('is-hover');
    await scrollTo(top(heads[i]), 1500);
  };

  (async () => {
    for (;;) {
      view.scrollTop = 0; spy();
      cursor.style.transition = 'none'; cursor.style.opacity = '0'; cursor.style.transform = 'translate(1100px, 760px)';
      void cursor.offsetWidth; cursor.style.transition = '';
      act.classList.remove('is-fade');
      await wait(1400);
      await scrollTo(top(heads[1]), 3400);          // читает вступление
      await wait(900);
      await scrollTo(top(heads[3]), 2600);          // «Особые условия»
      await wait(1100);
      cursor.style.opacity = '1';
      await go(7);                                  // «Противоопухолевая терапия»
      await wait(900);
      await move(980, 620);
      await scrollTo(view.scrollTop + 620, 2200);
      await wait(700);
      await go(9);                                  // «Подведем итоги»
      await wait(900);
      await scrollTo(max(), 1600);
      await wait(2600);
      cursor.style.opacity = '0';
      act.classList.add('is-fade');
      await wait(700);
    }
  })();
}

// Схемы по две в ряд: фрейм более низкой схемы тянется до высоты соседней, сама схема остаётся прижатой кверху
const pairUp = () => document.querySelectorAll<HTMLElement>('.mx-figs').forEach((grid) => {
  const figs = [...grid.querySelectorAll<HTMLElement>('.mx-art > figure')];
  const two = getComputedStyle(grid).gridTemplateColumns.split(' ').length > 1;
  figs.forEach((f) => { f.style.minHeight = ''; });
  if (!two) return;
  for (let i = 0; i + 1 < figs.length; i += 2) {
    const h = Math.max(figs[i].offsetHeight, figs[i + 1].offsetHeight);
    figs[i].style.minHeight = figs[i + 1].style.minHeight = `${h}px`;
  }
});
pairUp();
addEventListener("load", pairUp);
addEventListener('resize', pairUp);

// Шапка: сцена 600×480 масштабируется под колонку; содержание дочитывается, гены подсвечиваются по очереди
const hero = document.querySelector<HTMLElement>('.mx-hero');
if (hero) {
  const scene = hero.querySelector<HTMLElement>('.mx-hero__scene')!;
  new ResizeObserver(() => scene.style.setProperty('--k', String(hero.clientWidth / 600))).observe(hero);
  const counter = hero.querySelector<HTMLElement>('[data-dyn="mh-read"]')!;
  const bar = hero.querySelector<HTMLElement>('.mh-bar i')!;
  const items = [...hero.querySelectorAll<HTMLElement>('.mh-toc li')];
  const genes = [...hero.querySelectorAll<HTMLElement>('.mh-genes span')];
  let k = 3, g = 0;
  const set = () => {
    put(counter, 'mh-read', `Прочитано ${k} из 8`);
    bar.style.width = `${(k / 8) * 100}%`;
    items.forEach((li, i) => li.classList.toggle('is-on', i === Math.min(Math.floor(k / 2), items.length - 1)));
  };
  set();
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    setInterval(() => { k = k >= 8 ? 1 : k + 1; set(); }, 1100);
    setInterval(() => { genes.forEach((e, i) => e.classList.toggle('is-on', i === g)); g = (g + 1) % genes.length; }, 900);
  }
}
