// Обложка «Совета ректоров» (components/RectorsCover.astro): старая главная сменяется новой, курсор листает
// слайдер, открывает подменю «Совет ректоров», страница прокручивается к новостям и обратно, затем снова старая.
import { at, cursorOf, firstSlide, gate, nextSlide, press, reduced } from './rectors-live';

export function initRectorsCover(tile: HTMLElement) {
  // Сцена 1312 в ширину плитки, высота сцены повторяет пропорции плитки
  const stage = tile.querySelector<HTMLElement>('.rcv-stage')!;
  const fitStage = () => {
    const k = tile.clientWidth / 1312;
    stage.style.setProperty('--s', String(k));
    stage.style.height = `${tile.clientHeight / k}px`;
  };
  new ResizeObserver(fitStage).observe(tile);
  fitStage();
  if (reduced()) { tile.classList.add('is-new'); return; }

  const space = tile.querySelector<HTMLElement>('.rcv-fit')!;
  const desk = tile.querySelector<HTMLElement>('.ra-desk')!;
  const nav = [...desk.querySelectorAll<HTMLElement>('.ra-nav li')];
  const sub = [...desk.querySelectorAll<HTMLElement>('.ra-sub li')];
  const next = desk.querySelector<HTMLElement>('[data-next]')!;
  const more = [...desk.querySelectorAll<HTMLElement>('.ra-more')];
  const wait = gate(tile);
  const c = cursorOf(tile.querySelector<HTMLElement>('.ra-cursor')!, wait);
  const off: [number, number] = [1160, 760];
  (async () => {
    for (;;) {
      c.hide(...off);
      await wait(1400);
      tile.classList.add('is-wipe', 'is-new');
      await wait(1700);
      tile.classList.remove('is-wipe');
      await wait(300);
      c.show();
      await c.move(at(space, next));
      c.click(); await press(next, wait); nextSlide(desk);
      await wait(1300);
      await c.move(at(space, nav[2]), 800);
      nav[2].classList.add('is-on'); tile.classList.add('is-sub');
      await wait(700);
      await c.move(at(space, sub[1], .3), 700);
      sub[1].classList.add('is-on'); await wait(500);
      c.click(); await wait(700);
      sub[1].classList.remove('is-on'); nav[2].classList.remove('is-on'); tile.classList.remove('is-sub');
      await c.move([900, 560], 700);
      tile.classList.add('is-down');
      await wait(1500);
      const target = more[0] ?? nav[0];
      await c.move(at(space, target, .3), 800);
      target.classList.add('is-on'); await wait(900);
      c.click(); await wait(500);
      target.classList.remove('is-on');
      tile.classList.remove('is-down');
      await c.move(off, 900);
      c.fade();
      await wait(600);
      tile.classList.add('is-wipe');
      tile.classList.remove('is-new');
      await wait(1700);
      tile.classList.remove('is-wipe');
      firstSlide(desk);
      await wait(600);
    }
  })();
}
