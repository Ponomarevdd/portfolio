// Ленивые обложки: после сборки разметка страницы обложки (covers/<slug>/, уже в кривых) вкладывается
// в главную и «Мои работы» как <template> рядом с [data-lazy-cover]. Шаблон инертен: стили, картинки
// и шрифты не грузятся, пока scripts/lazy-covers.ts не вставит обложку у экрана. Так обложка не зависит
// от fetch (в артефакте он не работает). Запускается после curves.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOSTS = ['index.html', 'work/index.html'];
const LINK = /<a class="lazy-cover__src" href="[^"]*?\/covers\/([\w-]+)\/"[^>]*><\/a>/g;

export default function lazyCoversIntegration() {
  return {
    name: 'lazy-covers',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        const root = fileURLToPath(dir);
        const cache = new Map();
        const fragment = async (slug) => {
          if (!cache.has(slug)) {
            const html = await readFile(join(root, `covers/${slug}/index.html`), 'utf8');
            const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
            const body = html.slice(html.indexOf('>', html.indexOf('<body')) + 1, html.lastIndexOf('</body>'));
            const keep = head.match(/<link rel="stylesheet"[^>]*>|<style\b[\s\S]*?<\/style>/g) ?? [];
            cache.set(slug, keep.join('') + body.replace(/<script\b[\s\S]*?<\/script>/g, ''));
          }
          return cache.get(slug);
        };
        for (const page of HOSTS) {
          const file = join(root, page);
          let html = await readFile(file, 'utf8');
          for (const [m, slug] of [...html.matchAll(LINK)]) {
            html = html.replace(m, `${m}<template class="lazy-cover__tpl" data-slug="${slug}">${await fragment(slug)}</template>`);
          }
          await writeFile(file, html);
        }
      },
    },
  };
}
