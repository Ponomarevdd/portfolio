// Обложка «Совета ректоров» (components/RectorsCover.astro): новая страница новости прокручивается до похожих
// новостей, курсор кликает по карточкам, страница возвращается наверх, затем шторка показывает старую страницу
// и снова новую. Координаты курсора — в пикселях окна шириной 1280 (макет в нём 1120 по центру).
import { cursorOf, gate, reduced } from './rectors-live';

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
  if (reduced()) return;

  const page = tile.querySelector<HTMLElement>('.rcv-new')!;
  const wait = gate(tile);
  const c = cursorOf(tile.querySelector<HTMLElement>('.ra-cursor')!, wait);
  const scroll = (y: number) => page.style.setProperty('--y', `${-y}px`);
  const off: [number, number] = [1160, 760];
  (async () => {
    for (;;) {
      c.hide(...off);
      await wait(900);
      c.show();
      await c.move([535, 440]);
      await wait(400);
      scroll(490);
      await c.move([330, 300], 1600);
      scroll(1260);
      await wait(1700);
      await c.move([502, 230], 800);
      c.click(); await wait(700);
      await c.move([777, 230], 700);
      c.click(); await wait(700);
      scroll(0);
      await c.move(off, 1500);
      c.fade();
      tile.classList.add('is-wipe', 'is-old');
      await wait(1700);
      tile.classList.remove('is-wipe');
      await wait(1800);
      tile.classList.add('is-wipe');
      tile.classList.remove('is-old');
      await wait(1700);
      tile.classList.remove('is-wipe');
      await wait(500);
    }
  })();
}
