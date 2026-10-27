# Шаг 2: из замеров делает кривые. Каждое слово — свой <svg> в строке текста, поэтому
# браузер переносит строки как раньше. Буквы и слова лежат один раз в общем <defs>.
# python3 build.py <meas.json> <out.json>
import base64, io, json, os, sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools import subset

GEO = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../site/node_modules/@fontsource/geologica/files/')
meas, out = sys.argv[1:3]
M = json.load(open(meas))
FACES = (300, 500, 600)  # начертания, которые раньше подключала страница
fonts = {w: [TTFont(f'{GEO}geologica-{s}-{w}-normal.woff2') for s in ('latin', 'cyrillic', 'latin-ext', 'cyrillic-ext')] for w in FACES}
UPM = fonts[500][0]['head'].unitsPerEm

def face(w):
    # подбор начертания по правилам CSS
    if w in FACES: return w
    if w == 400: return 500 if 500 in FACES else max(f for f in FACES if f < 400)
    if w > 500: return min([f for f in FACES if f >= w] or [max(FACES)])
    return max([f for f in FACES if f <= w] or [min(FACES)])

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

glyphs = {}   # (face, char, tab) -> id
gdefs = []
def glyph(w, ch, tab):
    key = (w, ch, tab)
    if key in glyphs: return glyphs[key]
    for f in fonts[w]:
        cm = f.getBestCmap()
        if ord(ch) not in cm: continue
        name = cm[ord(ch)]
        if tab: name = tnum(f).get(name, name)
        gs = f.getGlyphSet(); pen = SVGPathPen(gs, n)
        gs[name].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
        gid = 'cg%d' % len(glyphs); glyphs[key] = gid
        d = pen.getCommands()
        gdefs.append('<path id="%s" d="%s"/>' % (gid, d) if d else '<g id="%s"/>' % gid)
        return gid
    raise SystemExit('нет глифа %r в начертании %d' % (ch, w))

words = {}    # (face, tab, s, positions) -> id
wdefs = []
def word_svg(t, st):
    w = face(st['w']); fs = st['fs']; k = UPM / fs; tab = 'tabular' in st['fvn']
    xs = tuple(round(x * k) for x in t['x'])
    key = (w, tab, t['s'], xs)
    if key not in words:
        wid = 'cw%d' % len(words); words[key] = wid
        uses = ''.join('<use href="#%s" x="%d"/>' % (glyph(w, c, tab), x) if x else '<use href="#%s"/>' % glyph(w, c, tab)
                       for c, x in zip(t['s'], xs) if not c.isspace())
        wdefs.append('<g id="%s">%s</g>' % (wid, uses))
    # Коробка слова = коробка глифов живого текста (или строка, если та ниже), на полпикселя меньше,
    # чтобы из-за округлений строка не стала выше. Базовая линия там же, где у текста.
    asc = st['asc'] * k; desc = (st['ch'] - st['asc']) * k
    if st['lh'] < st['ch']:
        hl = (st['lh'] - st['ch']) / 2 * k; asc += hl; desc += hl
    eps = .5 * k; A = asc - eps; D = desc - eps
    adv = t['adv'] * k
    return ('<svg class="cv" viewBox="0 %s %s %s" style="width:%sem;height:%sem;vertical-align:%sem">'
            '<use href="#%s"/></svg>') % (n(-A), n(adv), n(A + D), n4(adv / UPM), n4((A + D) / UPM), n4(-D / UPM), words[key])

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

nodes = [{'i': x['i'], 't': x['t'], 'h': render(x['toks'], x['st'], x['t'] if x['sr'] else None)} for x in M['nodes']]
dyn = {key: {v: render(toks, d['st']) for v, toks in d['v'].items()} for key, d in M['dyn'].items()}
defs = '<svg class="cv-defs" aria-hidden="true"><defs>%s%s</defs></svg>' % (''.join(gdefs), ''.join(wdefs))

# Крошечный шрифт только с пробелом: пробелы и высота строки остаются как у Geologica, буквы — кривыми
f = TTFont(f'{GEO}geologica-latin-500-normal.woff2')
opt = subset.Options(); opt.flavor = 'woff2'; opt.layout_features = []; opt.notdef_outline = True  # пустой glyf браузер отвергает
sub = subset.Subsetter(opt); sub.populate(unicodes=[0x20, 0xA0]); sub.subset(f)
buf = io.BytesIO(); f.flavor = 'woff2'; f.save(buf)
space = base64.b64encode(buf.getvalue()).decode()
css = ("@font-face{font-family:'Geologica';font-weight:100 900;src:url(data:font/woff2;base64,%s) format('woff2')}"
       ".cv{display:inline-block;overflow:visible;fill:currentColor}"
       ".cv-defs{position:absolute;width:0;height:0;overflow:hidden}"
       "cv-s{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}") % space

json.dump({'total': M['total'], 'css': css, 'defs': defs, 'nodes': nodes, 'dyn': dyn}, open(out, 'w'), ensure_ascii=False, separators=(',', ':'))
print('glyphs', len(glyphs), 'words', len(words), 'defs', len(defs), 'nodes html', sum(len(x['h']) for x in nodes), 'space font', len(space))
