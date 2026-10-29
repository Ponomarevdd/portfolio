// Обложка кейса «Совет ректоров» (components/RectorsLive.astro): сцены вписываются в плитки,
// на десктопе курсор листает слайдер и открывает подменю, на телефоне слайдер листается касанием и открывается меню.
import { at, cursorOf, firstSlide, gate, nextSlide, phoneMenu, press, reduced, tap } from './rectors-live';

export function initRectorsCover(root: HTMLElement) {
  root.querySelectorAll<HTMLElement>('.rcl-stage').forEach((stage) => {
    const box = stage.parentElement!;
    const fit = () => stage.style.setProperty('--s', String(Math.min(box.clientWidth / Number(stage.dataset.w), box.clientHeight / Number(stage.dataset.h))));
    new ResizeObserver(fit).observe(box);
    fit();
  });
  if (reduced()) return;

  const tile = root.querySelector<HTMLElement>('.rcl-tile--d')!;
  const space = tile.querySelector<HTMLElement>('.rcl-fit')!;
  const desk = space.querySelector<HTMLElement>('.ra-desk')!;
  const nav = [...desk.querySelectorAll<HTMLElement>('.ra-nav li')];
  const sub = [...desk.querySelectorAll<HTMLElement>('.ra-sub li')];
  const next = desk.querySelector<HTMLElement>('[data-next]')!;
  const waitD = gate(tile);
  const c = cursorOf(space.querySelector<HTMLElement>('.ra-cursor')!, waitD);
  (async () => {
    for (;;) {
      c.hide(1100, 820);
      await waitD(700);
      c.show();
      await c.move(at(space, next));
      c.click(); await press(next, waitD); nextSlide(desk);
      await waitD(1400);
      c.click(); await press(next, waitD); nextSlide(desk);
      await waitD(1200);
      await c.move(at(space, nav[2]));
      nav[2].classList.add('is-on'); tile.classList.add('is-sub');
      await waitD(800);
      await c.move(at(space, sub[1], .3), 800);
      sub[1].classList.add('is-on'); await waitD(400);
      c.click(); await waitD(1100);
      sub[1].classList.remove('is-on');
      await c.move([1100, 820], 900);
      nav[2].classList.remove('is-on'); tile.classList.remove('is-sub');
      c.fade();
      firstSlide(desk);
      await waitD(1400);
    }
  })();

  const mtile = root.querySelector<HTMLElement>('.rcl-tile--m')!;
  const phone = mtile.querySelector<HTMLElement>('.ra-phone')!;
  const screen = mtile.querySelector<HTMLElement>('.rcl-screen')!;
  const mark = screen.querySelector<HTMLElement>('.ra-tap')!;
  const waitP = gate(mtile);
  (async () => {
    await waitP(1500);
    for (;;) {
      const img = () => phone.querySelector('.ra-mslide.is-on img')!;
      await tap(screen, mark, img(), waitP); nextSlide(phone); await waitP(1500);
      await tap(screen, mark, img(), waitP); nextSlide(phone); await waitP(1500);
      await phoneMenu(phone, screen, mark, waitP);
      firstSlide(phone);
      await waitP(1200);
    }
  })();
}
