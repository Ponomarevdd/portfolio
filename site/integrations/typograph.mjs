// Типограф для собранных страниц: привязывает короткие предлоги, союзы и числа
// к следующему слову неразрывным пробелом, чтобы они не висели в конце строки.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NBSP = ' ';
// Любое слово из 1–2 букв плюс частые трёхбуквенные предлоги и союзы.
const SHORT = '[А-Яа-яЁё]{1,2}|для|без|под|над|при|про|или|что|как|чем|все|всё|его|её|их';
const BEFORE = '(?<=^|[\\s\\u00A0(«„"—–])';
const shortWord = new RegExp(`${BEFORE}(${SHORT}) +(?=\\S)`, 'gu');
const number = new RegExp(`${BEFORE}(\\d[\\d\\u00A0,.:]*[+%]?) +(?=[А-Яа-яЁёA-Za-z])`, 'gu');
const dash = / +(?=[—–] )/g;

export const typograph = (text) => text
  .replace(shortWord, `$1${NBSP}`)
  .replace(number, `$1${NBSP}`)
  .replace(dash, NBSP)
  .replace(/т\. (д|п)\./g, `т.${NBSP}$1.`);

// Меняем только текст между тегами; скрипты, стили и поля ввода не трогаем.
const SKIP = /^<(script|style|textarea|pre)\b/i;
const TOKENS = /(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<textarea\b[\s\S]*?<\/textarea>|<pre\b[\s\S]*?<\/pre>|<!--[\s\S]*?-->|<[^>]+>)/i;

export const typographHtml = (html) => html.split(TOKENS).map((part, i) => {
  if (i % 2 === 1 || SKIP.test(part)) return part;
  return typograph(part);
}).join('');

async function* htmlFiles(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* htmlFiles(path);
    else if (entry.name.endsWith('.html')) yield path;
  }
}

export default function typographIntegration() {
  return {
    name: 'typograph',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        for await (const file of htmlFiles(fileURLToPath(dir))) {
          const html = await readFile(file, 'utf8');
          const out = typographHtml(html);
          if (out !== html) await writeFile(file, out);
        }
      },
    },
  };
}
