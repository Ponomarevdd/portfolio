import './case-reveal';
import { at, cursorOf, firstSlide, fit, gate, nextSlide, phoneMenu, press, reduced } from './rectors-live';

// Кейс «Совет ректоров»: блоки шире базовой ширины не перестраиваются, а уменьшаются целиком.
document.querySelectorAll<HTMLElement>('.sc-scale').forEach((box) => {
  const inner = box.firstElementChild as HTMLElement | null;
  if (!inner) return;
  const update = () => {
    const base = parseFloat(getComputedStyle(box).getPropertyValue('--base'));
    const k = Math.min(1, box.clientWidth / base);
    box.classList.toggle('is-scaled', k < 1);
    box.style.setProperty('--k', String(k));
    box.style.height = k < 1 ? `${inner.offsetHeight * k}px` : '';
  };
  const ro = new ResizeObserver(update);
  ro.observe(box); ro.observe(inner);
  update();
});
fit();

// Шапка: старая главная сменяется новой, курсор листает слайдер и наводит на меню, затем снова старая
const hero = document.querySelector<HTMLElement>('[data-hero]');
if (hero) {
  const space = hero.querySelector<HTMLElement>('.rc-fit')!;
  const desk = hero.querySelector<HTMLElement>('.ra-desk')!;
  const nav = [...desk.querySelectorAll<HTMLElement>('.ra-nav li')];
  const next = desk.querySelector<HTMLElement>('[data-next]')!;
  if (reduced()) hero.classList.add('is-new');
  else {
    const wait = gate(hero);
    const c = cursorOf(hero.querySelector<HTMLElement>('.ra-cursor')!, wait);
    (async () => {
      for (;;) {
        c.hide(1100, 760);
        await wait(1200);
        hero.classList.add('is-wipe', 'is-new');
        await wait(1700);
        hero.classList.remove('is-wipe');
        await wait(500);
        c.show();
        await c.move(at(space, next));
        c.click(); await press(next, wait); nextSlide(desk);
        await wait(1500);
        c.click(); await press(next, wait); nextSlide(desk);
        await wait(1300);
        await c.move(at(space, nav[0]));
        nav[0].classList.add('is-on'); await wait(900);
        nav[0].classList.remove('is-on');
        await c.move(at(space, nav[2]), 700);
        nav[2].classList.add('is-on'); await wait(1100);
        nav[2].classList.remove('is-on');
        await c.move([1100, 760], 800);
        c.fade();
        await wait(600);
        hero.classList.add('is-wipe');
        hero.classList.remove('is-new');
        await wait(1700);
        hero.classList.remove('is-wipe');
        firstSlide(desk);
        await wait(1800);
      }
    })();
  }
}

// Навигация: на десктопе раскрывается подменю «Совет ректоров», на телефоне — меню-аккордеон
const navBlock = document.querySelector<HTMLElement>('[data-nav]');
if (navBlock && !reduced()) {
  const space = navBlock.querySelector<HTMLElement>('.rc-nav__desk .rc-fit')!;
  const nav = [...space.querySelectorAll<HTMLElement>('.ra-nav li')];
  const sub = [...space.querySelectorAll<HTMLElement>('.ra-sub li')];
  const waitD = gate(navBlock);
  const c = cursorOf(space.querySelector<HTMLElement>('.ra-cursor')!, waitD);
  (async () => {
    for (;;) {
      c.hide(1000, 720);
      await waitD(900);
      c.show();
      await c.move(at(space, nav[2]));
      nav[2].classList.add('is-on'); navBlock.classList.add('is-sub');
      await waitD(900);
      await c.move(at(space, sub[1], .3), 800);
      sub[1].classList.add('is-on'); await waitD(500);
      c.click(); await waitD(900);
      sub[1].classList.remove('is-on');
      await c.move(at(space, sub[9] ?? sub[sub.length - 1], .3), 900);
      sub[9]?.classList.add('is-on'); await waitD(1000);
      sub[9]?.classList.remove('is-on');
      await c.move([1000, 720], 900);
      nav[2].classList.remove('is-on'); navBlock.classList.remove('is-sub');
      c.fade();
      await waitD(1600);
    }
  })();

  const phone = navBlock.querySelector<HTMLElement>('.ra-phone')!;
  const screen = navBlock.querySelector<HTMLElement>('.rc-nav__phone .rc-device__screen')!;
  const mark = screen.querySelector<HTMLElement>('.ra-tap')!;
  const waitP = gate(navBlock);
  (async () => {
    await waitP(1800);
    for (;;) { await phoneMenu(phone, screen, mark, waitP); await waitP(1800); }
  })();
}

// Сравнение «было — стало»: ползунок двигает границу, вкладки переключают страницы.
// При первом появлении граница сама проходит туда и обратно, чтобы было видно, что её можно двигать
document.querySelectorAll<HTMLElement>('[data-cmp]').forEach((cmp) => {
  const stage = cmp.querySelector<HTMLElement>('.rc-cmp__stage')!;
  const range = cmp.querySelector<HTMLInputElement>('.rc-cmp__range')!;
  const tabs = [...cmp.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
  const pairs = [...cmp.querySelectorAll<HTMLElement>('.rc-cmp__pair')];
  const set = (v: number) => { stage.style.setProperty('--pos', `${v}%`); range.value = String(v); };
  let touched = false;
  range.addEventListener('input', () => { touched = true; set(Number(range.value)); });
  const select = (i: number) => {
    tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
    pairs.forEach((p, k) => p.classList.toggle('is-on', k === i));
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(i));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = (i + d + tabs.length) % tabs.length; select(n); tabs[n].focus();
    });
  });
  if (reduced()) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    const keys = [[0, 50], [900, 78], [2000, 24], [2900, 50]];
    let t0 = 0;
    const ease = (t: number) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const tick = (now: number) => {
      if (touched) return;
      if (!t0) t0 = now;
      const t = now - t0;
      const k = keys.findIndex(([ms]) => ms > t);
      if (k < 0) { set(50); return; }
      const [a, va] = keys[k - 1], [b, vb] = keys[k];
      set(Math.round((va + (vb - va) * ease((t - a) / (b - a))) * 10) / 10);
      requestAnimationFrame(tick);
    };
    setTimeout(() => requestAnimationFrame(tick), 400);
  }, { threshold: .5 });
  io.observe(stage);
});
