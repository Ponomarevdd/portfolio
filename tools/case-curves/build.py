# Шаг 2: из замеров делает кривые. Каждое слово — свой <svg> в строке текста, поэтому
# браузер переносит строки как раньше. Буквы и слова лежат один раз в общем <defs>.
# python3 build.py <meas.json> <out.json>
import base64, io, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
FS = os.path.join(HERE, '../../site/node_modules/@fontsource/')
meas, out = sys.argv[1:3]
M = json.load(open(meas))
CFG = json.load(open(os.path.join(HERE, 'fonts.json')))['FAMILIES']
FAMS = sorted({x['st']['f'] for x in M['nodes'] if 'st' in x} | {x['svg']['f'] for x in M['nodes'] if 'svg' in x}
              | {d['st']['f'] for d in M['dyn'].values()})
def ffile(fam, s, w): p = CFG[fam]['pkg']; return f'{FS}{p}/files/{p}-{s}-{w}-normal.woff2'
# начертания, которые раньше подключала страница
fonts = {(fam, w): [TTFont(ffile(fam, s, w)) for s in ('latin', 'cyrillic', 'latin-ext', 'cyrillic-ext') if os.path.exists(ffile(fam, s, w))]
         for fam in FAMS for w in CFG[fam]['faces']}
UPM = {fam: fonts[(fam, CFG[fam]['faces'][0])][0]['head'].unitsPerEm for fam in FAMS}
# Знаков, которых нет в шрифте макета (≥, ′), берём из Onest, шрифта сайта, или из Geologica
FB = {}
def fallback(w):
    if w not in FB:
        FB[w] = [TTFont(p) for pkg in ('onest', 'geologica') for s in ('latin', 'latin-ext', 'cyrillic', 'math', 'symbols')
                 for p in [f'{FS}{pkg}/files/{pkg}-{s}-{w}-normal.woff2'] if os.path.exists(p)]
    return FB[w]
SKEW = .25  # наклон синтетического курсива, как у браузера (font-synthesis: style)

def face(fam, w):
    # подбор начертания по правилам CSS
    F = CFG[fam]['faces']
    if w in F: return w
    up = sorted(f for f in F if f > w); down = sorted((f for f in F if f < w), reverse=True)
    if 400 <= w <= 500:
        mid = [f for f in up if f <= 500]; return (mid + down + up)[0]
    return (down + up)[0] if w < 400 else (up + down)[0]

def tnum(f):
    for fe in (f['GSUB'].table.FeatureList.FeatureRecord if 'GSUB' in f else []):
        if fe.FeatureTag == 'tnum':
            m = {}
            for li in fe.Feature.LookupListIndex:
                for st in f['GSUB'].table.LookupList.Lookup[li].SubTable:
                    m.update(getattr(st, 'mapping', {}) or {})
            return m
    return {}

def n(v):
    s = ('%.2f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

glyphs = {}   # (family, face, char, tab, italic) -> id
gdefs = []
def glyph(fam, w, ch, tab, it=False):
    key = (fam, w, ch, tab, it)
    if key in glyphs: return glyphs[key]
    for f in fonts[(fam, w)] + fallback(w):
        cm = f.getBestCmap()
        if ord(ch) not in cm: continue
        name = cm[ord(ch)]
        if tab: name = tnum(f).get(name, name)
        gs = f.getGlyphSet(); pen = SVGPathPen(gs, n)
        z = UPM[fam] / f['head'].unitsPerEm
        gs[name].draw(TransformPen(pen, (z, 0, z * SKEW if it else 0, -z, 0, 0)))
        gid = 'cg%d' % len(glyphs); glyphs[key] = gid
        d = pen.getCommands()
        gdefs.append('<path id="%s" d="%s"/>' % (gid, d) if d else '<g id="%s"/>' % gid)
        return gid
    raise SystemExit('нет глифа %r в %s %d' % (ch, fam, w))

words = {}    # (family, face, tab, italic, s, positions) -> id
wdefs = []
def word_def(fam, w, tab, it, s, xs, ys=None):
    ys = ys or (0,) * len(xs)
    key = (fam, w, tab, it, s, xs, ys)
    if key not in words:
        wid = 'cw%d' % len(words); words[key] = wid
        def use(c, x, y):
            a = ''.join(' %s="%d"' % (k, v) for k, v in (('x', x), ('y', y)) if v)
            return '<use href="#%s"%s/>' % (glyph(fam, w, c, tab, it), a)
        wdefs.append('<g id="%s">%s</g>' % (wid, ''.join(use(c, x, y) for c, x, y in zip(s, xs, ys) if not c.isspace())))
    return words[key]

def word_svg(t, st):
    fam = st['f']; w = face(fam, st['w']); fs = st['fs']; U = UPM[fam]; k = U / fs; tab = 'tabular' in st['fvn']
    xs = tuple(round(x * k) for x in t['x'])
    wid = word_def(fam, w, tab, st.get('it', False), t['s'], xs)
    # Коробка слова = коробка глифов живого текста (или строка, если та ниже), на полпикселя меньше,
    # чтобы из-за округлений строка не стала выше. Базовая линия там же, где у текста.
    asc = st['asc'] * k; desc = (st['ch'] - st['asc']) * k
    if st['lh'] < st['ch']:
        hl = (st['lh'] - st['ch']) / 2 * k; asc += hl; desc += hl
    eps = .5 * k; A = asc - eps; D = desc - eps
    adv = t['adv'] * k
    return ('<svg class="cv" viewBox="0 %s %s %s" style="width:%sem;height:%sem;vertical-align:%sem">'
            '<use href="#%s"/></svg>') % (n(-A), n(adv), n(A + D), n4(adv / U), n4((A + D) / U), n4(-D / U), wid)

def svg_text(x):
    # <text> схемы -> <use> слова в его координатах: базовая линия первой буквы и масштаб кегля
    v = x['svg']; fam = v['f']; U = UPM[fam]; sc = v['fs'] / U
    x0, y0 = v['ch'][0]
    xs = tuple(round((cx - x0) / sc) for cx, cy in v['ch']); ys = tuple(round((cy - y0) / sc) for cx, cy in v['ch'])
    wid = word_def(fam, face(fam, v['w']), False, v['it'], v['s'], xs, ys)
    tr = (v['tr'] + ' ' if v['tr'] else '') + 'translate(%s %s) scale(%s)' % (n(x0), n(y0), ('%.5f' % sc).rstrip('0'))
    return '<use href="#%s" transform="%s" fill="%s" role="img" aria-label="%s"/>' % (wid, tr, v['fill'], esc(x['t']).replace('"', '&quot;'))

def n4(v):
    s = ('%.4f' % v).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s

def esc(s): return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def render(toks, st, sr_text=None):
    h = ''.join(' ' if 'ws' in t else word_svg(t, st) for t in toks)
    # Обёртка держит слова вместе: во flex-контейнере иначе каждое слово стало бы отдельным элементом
    # Свои теги, а не span: на span в макетах висят стили вроде «.sc-tokens span»
    if sr_text is None: return '<cv-w>%s</cv-w>' % h
    return '<cv-w aria-hidden="true">%s</cv-w><cv-s>%s</cv-s>' % (h, esc(sr_text))

nodes = [{'i': x['i'], 't': x['t'], 'svg': 1, 'h': svg_text(x)} if 'svg' in x else
         {'i': x['i'], 't': x['t'], 'h': render(x['toks'], x['st'], x['t'] if x['sr'] else None)} for x in M['nodes']]
dyn = {key: {v: render(toks, d['st']) for v, toks in d['v'].items()} for key, d in M['dyn'].items()}
defs = '<svg class="cv-defs" aria-hidden="true"><defs>%s%s</defs></svg>' % (''.join(gdefs), ''.join(wdefs))

# Крошечный шрифт только с пробелом: пробелы и высота строки остаются как у шрифта макета, буквы — кривыми
faces_css = ''
for fam in FAMS:
    f = TTFont(ffile(fam, 'latin', CFG[fam]['faces'][0]))
    opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = []; opt.notdef_outline = True  # пустой glyf браузер отвергает
    sub = subset.Subsetter(opt); sub.populate(unicodes=[0x20, 0xA0]); sub.subset(f)
    buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
    faces_css += "@font-face{font-family:'%s';font-weight:100 900;src:url(data:font/woff2;base64,%s) format('woff2')}" % (fam, base64.b64encode(buf.getvalue()).decode())
css = (faces_css + ".cv{display:inline-block;overflow:visible;fill:currentColor}"
       ".cv-defs{position:absolute;width:0;height:0;overflow:hidden}"
       "cv-s{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}")

json.dump({'total': M['total'], 'css': css, 'defs': defs, 'nodes': nodes, 'dyn': dyn}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print('glyphs', len(glyphs), 'words', len(words), 'defs', len(defs), 'nodes html', sum(len(x['h']) for x in nodes), 'space fonts', len(faces_css))
