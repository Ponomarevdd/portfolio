// Шаг 1: открывает собранную страницу кейса со шрифтом Geologica и меряет каждое слово,
// набранное этим шрифтом: позиции букв, ширину, базовую линию. Плюс тексты, которые меняет анимация.
// node measure.cjs <page path, напр. /cases/my-school/> <out.json>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const [route, out] = process.argv.slice(2);
const SITE = path.resolve(__dirname, '../../site');
const GEO = path.join(SITE, 'node_modules/@fontsource/geologica');
const ORIGIN = 'http://127.0.0.1:4399';

// Шрифт подключаем сами: в исходниках страницы его больше нет
const fontCss = ['300', '500', '600'].flatMap((w) => ['latin', 'cyrillic'].map((s) => fs.readFileSync(`${GEO}/${s}-${w}.css`, 'utf8')))
  .join('\n').replace(/url\(\.\/files\//g, 'url(/__geo/');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, javaScriptEnabled: false });
  const p = await ctx.newPage();
  await p.route('**/__geo/*', (r) => r.fulfill({ body: fs.readFileSync(path.join(GEO, 'files', path.basename(new URL(r.request().url()).pathname))), contentType: 'font/woff2' }));
  await p.goto(ORIGIN + route, { waitUntil: 'domcontentloaded' }); 
  await p.evaluate((css) => { const s = document.createElement('style'); s.textContent = css; document.head.append(s); }, fontCss);
  await p.evaluate(() => Promise.all(['300', '500', '600'].map((w) => document.fonts.load(`${w} 16px Geologica`, 'Аа'))).then(() => document.fonts.ready));

  const res = await p.evaluate(() => {
    const NWS = /[^ \t\n\r\f]/;
    const geo = (cs) => /^["']?Geologica/.test(cs.fontFamily);
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:pre;contain:layout';
    document.body.append(box);
    const PROPS = ['fontFamily', 'fontWeight', 'fontSize', 'fontStyle', 'fontStretch', 'letterSpacing', 'wordSpacing', 'textTransform', 'fontFeatureSettings', 'fontVariantNumeric', 'fontKerning', 'lineHeight'];
    const styleOf = (cs) => {
      PROPS.forEach((k) => { box.style[k] = cs[k]; });
      box.innerHTML = '<span>Ж</span><i style="display:inline-block;width:0;height:0"></i>';
      const sr = box.firstChild.getBoundingClientRect(), base = box.lastChild.getBoundingClientRect().top;
      return { w: +cs.fontWeight, fs: parseFloat(cs.fontSize), asc: base - sr.top, ch: sr.height, lh: box.getBoundingClientRect().height, tt: cs.textTransform, fvn: cs.fontVariantNumeric };
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
      if (P.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
      const cs = getComputedStyle(P);
      if (!geo(cs)) continue;
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
    const counts = [...document.querySelectorAll('[data-count]')].filter((el) => geo(getComputedStyle(el))).length;
    box.remove();
    return { total, nodes, dyn, counts };
  });
  if (res.counts) throw new Error(`${res.counts} счётчиков data-count набраны Geologica — их надо обработать отдельно`);
  fs.writeFileSync(out, JSON.stringify(res));
  console.log(`text nodes ${res.total}, geologica ${res.nodes.length}, words ${res.nodes.reduce((a, n) => a + n.toks.filter((t) => t.s).length, 0)}, dyn ${Object.keys(res.dyn).join(',')}`);
  await b.close();
})();
