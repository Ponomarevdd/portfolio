// Вписывает схемы MedX во фрейм 1094 px: обрезает пустые поля вокруг рисунка и масштабирует его,
// чтобы отступы до краёв фрейма были одинаковыми. Запускать после medx-extract.py и medx-genera.py:
// node tools/medx-fit.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'site/src/data/medx');
const FONTS = path.join(ROOT, 'site/node_modules/@fontsource/manrope/files');
const INNER = 1094 - 2 * 40; // ширина фрейма минус поля figure
const NORM = ['fig-structure', 'fig-simplot', 'fig-phylo', 'fig-bats', 'fig-spike', 'fig-mutations', 'fig-genera', 'fig-hosts', 'fig-genome', 'fig-lineages'];
const FIT = ['fig-structure', 'fig-simplot', 'fig-phylo', 'fig-hosts'];

const faces = [400, 500, 600, 700].flatMap((w) => ['latin', 'cyrillic'].map((s) =>
  `@font-face{font-family:Manrope;font-weight:${w};src:url("file://${FONTS}/manrope-${s}-${w}-normal.woff2")}`)).join('');

// Границы видимого содержимого элемента в его собственных координатах
function measure(sel) {
  const root = document.querySelector(sel);
  const o = root.getBoundingClientRect();
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (r) => {
    if (!r.width && !r.height) return;
    x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
  };
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
    if (el instanceof SVGGraphicsElement && !(el instanceof SVGSVGElement) && !(el instanceof SVGGElement)) {
      const r = el.getBoundingClientRect();
      const sw = cs.stroke !== 'none' ? (parseFloat(cs.strokeWidth) || 0) / 2 : 0;
      add({ left: r.left - sw, top: r.top - sw, right: r.right + sw, bottom: r.bottom + sw, width: r.width + 1, height: r.height + 1 });
    } else if (el instanceof HTMLElement && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none')) {
      add(el.getBoundingClientRect());
    }
  }
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    if (!n.textContent.trim() || n.parentElement.closest('svg')) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const r of range.getClientRects()) add(r);
  }
  return { x: x0 - o.left, y: y0 - o.top, w: x1 - x0, h: y1 - y0, sw: o.width, sh: o.height };
}

// Исходный текст второго ребёнка <figure>: пропускаем заголовок и считаем вложенность тегов
function secondChild(html) {
  const tags = /<(\/?)([a-zA-Z][\w-]*)[^>]*?(\/?)>/g;
  const VOID = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);
  let depth = 0, idx = -1, start = -1;
  tags.lastIndex = html.indexOf('<figure');
  tags.exec(html); // сам <figure>
  for (let t; (t = tags.exec(html));) {
    const [all, close, name, self] = t;
    if (!close && depth === 0) { idx++; if (idx === 1) start = t.index; }
    if (close) depth--; else if (!self && !VOID.has(name.toLowerCase())) depth++;
    if (depth === 0 && idx === 1 && start >= 0) return html.slice(start, t.index + all.length);
  }
  throw new Error('нет сцены');
}

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'medx-fit-')), 'f.html');
  const load = async (html) => {
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>${faces}body{margin:0}</style>${html}`);
    await p.goto('file://' + tmp);
    await p.evaluate(() => document.fonts.ready);
  };
  for (const name of FIT) {
    const file = path.join(DATA, name + '.html');
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('data-fit')) { console.log(name, 'уже вписана'); continue; }
    await load(html);
    // Сцена — второй ребёнок figure (после заголовка)
    await p.evaluate(() => document.querySelector('figure').children[1].setAttribute('data-stage', ''));
    const m = await p.evaluate(measure, '[data-stage]');
    const pad = 1;
    const x = Math.max(0, m.x - pad), y = Math.max(0, m.y - pad);
    const w = Math.min(m.sw, m.x + m.w + pad) - x, h = Math.min(m.sh, m.y + m.h + pad) - y;
    const k = INNER / w;
    const src = secondChild(html);
    html = html.replace(src,
      `<div data-fit style="zoom:${k.toFixed(4)};width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;position:relative">` +
      `<div style="position:absolute;left:${(-x).toFixed(1)}px;top:${(-y).toFixed(1)}px;width:${m.sw.toFixed(1)}px">${src}</div></div>`);
    fs.writeFileSync(file, html);
    console.log(name, `рамка ${w.toFixed(0)}×${h.toFixed(0)}, масштаб ${k.toFixed(3)}`);
  }

  // Геном: у рисунка вириона обрезаем поля, чтобы он центрировался по высоте с легендой
  const gfile = path.join(DATA, 'fig-genome.html');
  let g = fs.readFileSync(gfile, 'utf8');
  const tag = '<svg width="330" height="260" viewBox="0 0 330 260" style="flex: none;">';
  if (g.includes(tag)) {
    await load(g);
    const bb = await p.evaluate(() => {
      const svg = [...document.querySelectorAll('svg')].find((s) => s.getAttribute('width') === '330');
      const o = svg.getBoundingClientRect();
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const el of svg.querySelectorAll('path,circle,rect,text,ellipse,line')) {
        const r = el.getBoundingClientRect();
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
      }
      return { x: x0 - o.left - 2, y: y0 - o.top - 2, w: x1 - x0 + 4, h: y1 - y0 + 4 };
    });
    const f = (v) => v.toFixed(1);
    g = g.replace(tag, `<svg width="${f(bb.w)}" height="${f(bb.h)}" viewBox="${f(bb.x)} ${f(bb.y)} ${f(bb.w)} ${f(bb.h)}" style="flex: none;">`);
    fs.writeFileSync(gfile, g);
    console.log('fig-genome вирион', bb);
  }

  // Единая шкала кеглей во всех схемах (с учётом масштаба рисунка): подписи 14, основной текст 16,
  // крупные узлы 24, примечание под схемой 14. Заголовок схемы (20) не трогаем.
  for (const name of NORM) {
    const file = path.join(DATA, name + '.html');
    const html = fs.readFileSync(file, 'utf8');
    if (html.includes('data-norm')) { console.log(name, 'кегли уже сведены'); continue; }
    await load(`<div style="width:1094px">${html}</div>`);
    const log = await p.evaluate(() => {
      const fig = document.querySelector('figure');
      const w0 = fig.style.width; fig.style.width = '1094px';
      const kids = [...fig.children];
      const last = kids[kids.length - 1];
      // примечание — последний ребёнок из одного текста кеглем 15; заголовок — первый ребёнок кеглем 20
      const foot = kids.length > 2 && !last.children.length && parseFloat(getComputedStyle(last).fontSize) === 15 ? last : null;
      const title = parseFloat(getComputedStyle(kids[0]).fontSize) === 20 && !kids[0].children.length ? kids[0] : null;
      const done = new Set(), out = {};
      const walk = document.createTreeWalker(fig, NodeFilter.SHOW_TEXT);
      const jobs = [];
      for (let n; (n = walk.nextNode());) {
        const el = n.parentElement;
        if (!n.textContent.trim() || done.has(el) || (title && title.contains(el)) || el.closest('[data-keep]')) continue;
        done.add(el);
        const svg = el.closest('svg');
        let k;
        if (svg) { const vb = svg.viewBox.baseVal; k = svg.getBoundingClientRect().width / (vb && vb.width ? vb.width : svg.width.baseVal.value); }
        else { const z = el.closest('[data-fit]'); k = z ? parseFloat(z.style.zoom) : 1; }
        const cs = getComputedStyle(el), o = parseFloat(cs.fontSize);
        const upper = cs.textTransform === 'uppercase' || /^[А-ЯЁA-Z\s]{6,}$/.test(n.textContent.trim());
        const t = (foot && foot.contains(el)) || upper ? 14 : o <= 14 ? 14 : o < 20 ? 16 : 24;
        jobs.push([el, svg, k, o, t, cs.lineHeight]);
        const key = `${(o * k).toFixed(1)}→${t}`; out[key] = (out[key] || 0) + 1;
      }
      for (const [el, svg, k, o, t, lh] of jobs) {
        el.style.fontSize = (t / k).toFixed(2) + 'px';
        if (!svg && lh.endsWith('px')) el.style.lineHeight = (parseFloat(lh) * t / o / k).toFixed(2) + 'px';
      }
      fig.style.width = w0; fig.setAttribute('data-norm', '');
      return { html: fig.outerHTML, out };
    });
    fs.writeFileSync(file, log.html);
    console.log(name, JSON.stringify(log.out));
  }
  await b.close();
})();
