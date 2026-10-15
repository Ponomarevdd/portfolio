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

// Последнюю строку абзаца (от четырёх слов) не оставляем с одним словом: последнее слово всегда
// держится за предыдущее, а если оба короткие, к ним прицепляется и третье.
const BLOCK_END = /^<\/(p|li|blockquote|figcaption)>/i;
const lastWords = /(\S+) +(\S+)\s*$/u;
export const noWidows = (text) => (text.trim().split(/\s+/u).length < 4 ? text : text.replace(lastWords, (m, a, b) => `${a}${NBSP}${b}`)
  .replace(/(\S+) +(\S+\u00A0\S+)\s*$/u, (m, a, tail) => (tail.length < 16 ? `${a}${NBSP}${tail}` : m)));

// Слова через дефис («PDF-конспект», «дизайн-ревью») не рвём по дефису. Внутри SVG и <title>
// разметку добавлять нельзя, там оставляем как есть.
const hyphenated = /(?<![\p{L}\d-])[\p{L}\d]+(?:-[\p{L}\d]+)+(?![\p{L}\d-])/gu;
const keepHyphens = (text) => text.replace(hyphenated, (w) => (w.length <= 20 ? `<span style="white-space:nowrap">${w}</span>` : w));
const NO_MARKUP_OPEN = /^<(svg|title)\b/i;
const NO_MARKUP_CLOSE = /^<\/(svg|title)>/i;

export const typographHtml = (html) => {
  const parts = html.split(TOKENS);
  let noMarkup = 0;
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      if (NO_MARKUP_OPEN.test(part) && !part.endsWith('/>')) noMarkup++;
      else if (NO_MARKUP_CLOSE.test(part)) noMarkup = Math.max(0, noMarkup - 1);
      return part;
    }
    if (SKIP.test(part)) return part;
    let text = typograph(part);
    if (BLOCK_END.test(parts[i + 1] ?? '')) text = noWidows(text);
    return noMarkup ? text : keepHyphens(text);
  }).join('');
};

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
