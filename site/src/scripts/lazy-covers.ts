// Обложки ниже первого экрана подгружаются лениво: карточка с [data-lazy-cover] берёт разметку
// из отдельной страницы обложки, когда подходит к экрану. Стили страницы обложки переносятся в head,
// ссылки и картинки пересчитываются от её адреса, id букв-кривых получают свой префикс,
// чтобы не пересечься с кривыми других обложек на странице.
import { initRectorsCover } from './rectors-cover';

const inits: Record<string, (root: HTMLElement) => void> = { rectors: initRectorsCover };

async function load(gallery: HTMLElement) {
  const src = gallery.querySelector<HTMLAnchorElement>('.lazy-cover__src');
  if (!src) return;
  const url = new URL(src.getAttribute('href')!, location.href);
  const slug = url.pathname.split('/').filter((s) => s && s !== 'index.html').pop()!;
  const res = await fetch(url);
  if (!res.ok) return;
  const html = (await res.text()).replace(/(id="|href="#|url\(#)(c[gw]\d+)/g, `$1${slug}-$2`);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const abs = (v: string) => new URL(v, url).href;
  doc.head.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((l) => {
    const href = abs(l.getAttribute('href')!);
    if (!document.querySelector(`link[href="${href}"]`)) { const n = document.createElement('link'); n.rel = 'stylesheet'; n.href = href; document.head.append(n); }
  });
  doc.head.querySelectorAll('style').forEach((s) => document.head.append(document.adoptNode(s)));
  const body = doc.querySelector<HTMLElement>('[data-cover-body]');
  if (!body) return;
  body.querySelectorAll<HTMLElement>('[src]').forEach((el) => el.setAttribute('src', abs(el.getAttribute('src')!)));
  body.querySelectorAll<HTMLElement>('a[href]').forEach((el) => el.setAttribute('href', abs(el.getAttribute('href')!)));
  const defs = doc.body.querySelector('.cv-defs');
  if (defs) document.body.append(document.adoptNode(defs));
  gallery.replaceChildren(...[...body.children].map((n) => document.adoptNode(n)));
  inits[slug]?.(gallery);
}

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    io.unobserve(e.target);
    load(e.target as HTMLElement).catch(() => {});
  }
}, { rootMargin: '600px 0px' });
document.querySelectorAll<HTMLElement>('[data-lazy-cover]').forEach((g) => io.observe(g));
