// Текст макетов в кривых: после сборки заменяет текст, набранный шрифтами макетов, на SVG-слова
// из заранее сгенерированного файла (tools/case-curves). Сам шрифт страница не грузит.
// Если текст на странице поменялся, сборка падает: кривые надо перегенерировать.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PAGES = {
  'cases/my-school/index.html': '../src/data/curves/my-school.json',
  'cases/medx/index.html': '../src/data/curves/medx.json',
  // Живая обложка medx.pro на главной и в «Моих работах»
  'index.html': '../src/data/curves/home.json',
  'work/index.html': '../src/data/curves/work.json',
};

const TOKENS = /(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<textarea\b[\s\S]*?<\/textarea>|<template\b[\s\S]*?<\/template>|<noscript\b[\s\S]*?<\/noscript>|<!--[\s\S]*?-->|<[^>]+>)/i;
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (m, e) => e[0] !== '#' ? NAMED[e] ?? m
  : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)));
const NWS = /[^ \t\n\r\f]/;

export function applyCurves(html, data, file) {
  const at = html.search(/<body\b[^>]*>/i);
  const head = html.slice(0, at);
  const parts = html.slice(at).split(TOKENS);
  const byIndex = new Map(data.nodes.map((n) => [n.i, n]));
  let ord = 0;
  let svg = 0;
  for (let k = 0; k < parts.length; k++) {
    const part = parts[k];
    if (k % 2 === 1) {
      if (/^<svg\b/i.test(part) && !part.endsWith('/>')) svg++;
      else if (/^<\/svg>/i.test(part)) svg = Math.max(0, svg - 1);
      continue;
    }
    if (!NWS.test(decode(part))) continue;
    const node = byIndex.get(ord++);
    if (!node) continue;
    if (node.svg && svg && decode(part) === node.t && /^<text\b/i.test(parts[k - 1]) && /^<\/text>/i.test(parts[k + 1])) {
      // Текст схемы: весь элемент <text> заменяется буквами-кривыми
      parts[k - 1] = parts[k + 1] = ''; parts[k] = node.h; continue;
    }
    if (svg || node.svg || decode(part) !== node.t) throw new Error(`curves: текст в ${file} изменился («${decode(part).trim().slice(0, 40)}»), перегенерируйте tools/case-curves/run.sh`);
    parts[k] = node.h;
  }
  if (ord !== data.total) throw new Error(`curves: в ${file} ${ord} текстовых узлов вместо ${data.total}, перегенерируйте tools/case-curves/run.sh`);
  let body = parts.join('');
  body = body.replace(/^<body\b[^>]*>/i, (m) => m + data.defs);
  const dyn = JSON.stringify(data.dyn).replace(/</g, '\\u003c');
  body = body.replace(/<\/body>/i, `<script type="application/json" id="cv-dyn">${dyn}</script></body>`);
  return head.replace(/<\/head>/i, `<style>${data.css}</style></head>`) + body;
}

export default function curvesIntegration() {
  return {
    name: 'curves',
    hooks: {
      'astro:build:done': async ({ dir }) => {
        if (process.env.CURVES_OFF) return; // генератор меряет страницу с живым текстом
        for (const [page, json] of Object.entries(PAGES)) {
          const file = join(fileURLToPath(dir), page);
          const data = JSON.parse(await readFile(new URL(json, import.meta.url), 'utf8'));
          await writeFile(file, applyCurves(await readFile(file, 'utf8'), data, page));
        }
      },
    },
  };
}
