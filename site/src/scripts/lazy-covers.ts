// Обложки ниже первого экрана подгружаются лениво: карточка с [data-lazy-cover] берёт разметку обложки,
// когда подходит к экрану. Разметка лежит в инертном <template> (его вкладывает integrations/lazy-covers.mjs
// при сборке), без него — берётся со страницы обложки. Стили обложки переносятся в head,
// ссылки и картинки пересчитываются от адреса разметки, id букв-кривых получают свой префикс,
// чтобы не пересечься с кривыми других обложек на странице.
import { initRectorsCover } from './rectors-cover';

const inits: Record<string, (root: HTMLElement) => void> = { rectors: initRectorsCover };

async function load(gallery: HTMLElement) {
  const src = gallery.querySelector<HTMLAnchorElement>('.lazy-cover__src');
  if (!src) return;
  const href = src.getAttribute('href')!;
  const slug = href.split('/').filter((s) => s && s !== 'index.html').pop()!;
  const tpl = gallery.querySelector<HTMLTemplateElement>('.lazy-cover__tpl');
  const url = tpl ? null : new URL(href, document.baseURI);
  let raw = tpl?.innerHTML;
  if (raw == null) {
    const res = await fetch(url!);
    if (!res.ok) return;
    raw = await res.text();
  }
  const html = raw.replace(/(id="|href="#|url\(#)(c[gw]\d+)/g, `$1${slug}-$2`);
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Ссылки в шаблоне уже относительно этой страницы (в артефакте страница может открываться из srcdoc,
  // поэтому их не пересчитываем), в загруженной странице — от её адреса
  const abs = (v: string) => (url ? new URL(v, url).href : v);
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
