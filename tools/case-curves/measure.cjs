// Шаг 1: открывает собранную страницу кейса со шрифтами макетов и меряет каждое слово,
// набранное ими: позиции букв, ширину, базовую линию. Текст в SVG (<text>) меряется по буквам целиком.
// Плюс тексты, которые меняет анимация.
// node measure.cjs <page path, напр. /cases/my-school/> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [route, out] = process.argv.slice(2);
const SITE = path.resolve(__dirname, '../../site');
const ORIGIN = 'http://127.0.0.1:4399';
const { FAMILIES, PAGES } = require('./fonts.json');
const fams = PAGES[route.split('/').filter(Boolean).pop()];
if (!fams) throw new Error('нет страницы ' + route + ' в fonts.json');

// Шрифты подключаем сами: в исходниках страницы их больше нет
const fontCss = fams.flatMap((f) => FAMILIES[f].faces.flatMap((w) => ['latin', 'cyrillic'].map((s) =>
  fs.readFileSync(path.join(SITE, 'node_modules/@fontsource', FAMILIES[f].pkg, `${s}-${w}.css`), 'utf8')
    .replace(/url\(\.\/files\//g, `url(/__font/${FAMILIES[f].pkg}/`)))).join('\n');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.route('**/__font/**', (r) => { const [, , pkg, file] = new URL(r.request().url()).pathname.split('/');
    r.fulfill({ body: fs.readFileSync(path.join(SITE, 'node_modules/@fontsource', pkg, 'files', file)), contentType: 'font/woff2' }); });
  await p.goto(ORIGIN + route, { waitUntil: 'domcontentloaded' }); 
  await p.evaluate((css) => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }, fontCss);
  const faces = fams.flatMap((f) => FAMILIES[f].faces.map((w) => `${w} 16px "${f}"`));
  await p.evaluate((faces) => Promise.all(faces.map((f) => document.fonts.load(f, 'Аа'))).then(() => document.fonts.ready), faces);

  const res = await p.evaluate((fams) => {
    const NWS = /[^ \t\n\r\f]/;
    const famOf = (cs) => fams.find((f) => cs.fontFamily.replace(/["']/g, '').split(',')[0].trim() === f);
    const geo = (cs) => !!famOf(cs);
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:pre;contain:layout';
    document.body.append(box);
    const PROPS = ['fontFamily', 'fontWeight', 'fontSize', 'fontStyle', 'fontStretch', 'letterSpacing', 'wordSpacing', 'textTransform', 'fontFeatureSettings', 'fontVariantNumeric', 'fontKerning', 'lineHeight'];
    const styleOf = (cs) => {
      PROPS.forEach((k) => { box.style[k] = cs[k]; });
      box.innerHTML = '<span>Ж</span><i style="display:inline-block;width:0;height:0"></i>';
      const sr = box.firstChild.getBoundingClientRect(), base = box.lastChild.getBoundingClientRect().top;
      return { f: famOf(cs), it: cs.fontStyle !== 'normal', w: +cs.fontWeight, fs: parseFloat(cs.fontSize), asc: base - sr.top, ch: sr.height, lh: box.getBoundingClientRect().height, tt: cs.textTransform, fvn: cs.fontVariantNumeric };
    };
    const word = (s, tt) => {
      box.innerHTML = '<span></span>'; const sp = box.firstChild; sp.textContent = s;
      const r0 = sp.getBoundingClientRect(); const t = sp.firstChild; const x = [];
      for (let i = 0; i < s.length; i++) { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); x.push(r.getBoundingClientRect().left - r0.left); }
      const up = tt === 'uppercase' ? s.toUpperCase() : tt === 'lowercase' ? s.toLowerCase() : s;
      return { s: up, x, adv: r0.width };
    };
    const tokens = (text, st) => text.split(/([ \t\n\r\f]+)/).filter(Boolean).map((t) => NWS.test(t) ? word(t, st.tt) : { ws: t });
    const visibleToAT = (el) => !el.closest('[aria-hidden="true"],[role="img"]');

    const nodes = []; let total = 0;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) {
      if (n.parentElement === box || box.contains(n)) continue;
      const P = n.parentElement;
      if (P.closest('script,style,template,noscript')) continue;
      if (!NWS.test(n.data)) continue;
      const i = total++;
      const cs = getComputedStyle(P);
      if (!geo(cs)) continue;
      if (P instanceof SVGTextElement) {
        // Текст схемы: позиции букв в координатах самого <text>
        if (P.children.length) throw new Error('<tspan> в схеме не поддерживается: ' + n.data);
        const ch = [];
        for (let c = 0; c < P.getNumberOfChars(); c++) { const q = P.getStartPositionOfChar(c); ch.push([q.x, q.y]); }
        const s = cs.textTransform === 'uppercase' ? n.data.toUpperCase() : n.data;
        nodes.push({ i, t: n.data, svg: { s, ch, f: famOf(cs), w: +cs.fontWeight, it: cs.fontStyle !== 'normal', fs: parseFloat(cs.fontSize), fill: cs.fill, tr: P.getAttribute('transform') } });
        continue;
      }
      if (P.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
      const st = styleOf(cs);
      nodes.push({ i, t: n.data, sr: visibleToAT(P), st, toks: tokens(n.data, st) });
    }

    // Тексты, которые подставляет school-case.ts
    const dyn = {};
    const add = (key, el, values) => {
      if (!el) return;
      const cs = getComputedStyle(el); if (!geo(cs)) return;
      const st = styleOf(cs);
      dyn[key] = { st, v: Object.fromEntries(values.map((v) => [v, tokens(v, st)])) };
    };
    const lms = document.querySelector('.sc-lms');
    if (lms) {
      const d = (k) => lms.querySelector(`[data-d="${k}"]`);
      const tocN = lms.querySelectorAll('[data-d="toc"]').length;
      const range = (a, z, f) => Array.from({ length: z - a + 1 }, (_, k) => f(a + k));
      add('read-pct', d('read-pct'), range(30, 100, (v) => `${v}%`));
      add('toc-count', d('toc-count'), range(1, tocN, (k) => `Изучено ${k} из ${tocN} разделов`));
      add('sl-count', d('sl-count'), ['1 / 3', '2 / 3', '3 / 3']);
      add('pct', d('pct'), ['30%', '100%']);
      add('left', d('left'), ['Осталось 7 мин', 'Урок пройден']);
      add('btn', d('btn'), ['Продолжить', 'Следующий урок']);
      add('cont-cap', d('cont-cap'), ['Продолжить · Курс для педагогов']);
      add('cont-title', d('cont-title'), ['С чего начать работу в Цифровой платформе']);
      add('course-pct', d('course-pct'), ['6%', '11%']);
      add('course-done', d('course-done'), ['1 из 18 уроков', '2 из 18 уроков']);
      add('stat', d('stat'), ['1 из 18', '2 из 18']);
      add('hello', d('hello'), ['Вы прошли 1 из 18 уроков курса для педагогов', 'Вы прошли 2 из 18 уроков курса для педагогов']);
    }
    document.querySelectorAll('[data-slider]').forEach((root) => {
      const n = root.querySelector('[data-sl-track]')?.children.length ?? 0;
      add('slider', root.querySelector('[data-sl-count]'), Array.from({ length: n }, (_, k) => `${k + 1} / ${n}`));
    });
    // Подписи, которые меняет скрипт страницы: data-dyn="ключ", варианты в data-dyn-values через «|»
    document.querySelectorAll('[data-dyn][data-dyn-values]').forEach((el) => add(el.dataset.dyn, el, el.dataset.dynValues.split('|')));
    const counts = [...document.querySelectorAll('[data-count]')].filter((el) => geo(getComputedStyle(el))).length;
    box.remove();
    return { total, nodes, dyn, counts };
  }, fams);
  if (res.counts) throw new Error(`${res.counts} счётчиков data-count набраны шрифтом макетов — их надо обработать отдельно`);
  fs.writeFileSync(out, JSON.stringify(res));
  console.log(`text nodes ${res.total}, mockup ${res.nodes.length}, svg ${res.nodes.filter((n) => n.svg).length}, words ${res.nodes.reduce((a, n) => a + (n.toks || []).filter((t) => t.s).length, 0)}, dyn ${Object.keys(res.dyn).join(',')}`);
  await b.close();
})();
