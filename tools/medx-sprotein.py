"""Схема «Структура S белка вируса SARS-CoV-2» для кейса MedX, нарисованная заново.

python3 tools/medx-sprotein.py — пишет site/src/data/medx/fig-s-protein.html (после medx-extract.py).
Шип-тример на мембране вируса: стебель S2, головка S1 из трёх долей, домен RBD в положении «вверх»
касается мотивом RBM рецептора ACE2, который спускается с мембраны клетки. Подписи справа, выноски с точкой.
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
T, CAP, G, GD, GL, GXL, B, BD, O, OD = '#173d34', '#60716a', '#3b876a', '#2b6a52', '#8fb9a6', '#e8f3ee', '#6f93a8', '#4e7184', '#c9744a', '#75462f'
W, H, LX = 1014, 470, 640  # ширина сцены, высота, начало подписей


def membrane(y):
    dots = ''.join(f'<circle cx="{x}" cy="{y}" r="2" fill="{G}"></circle>' for x in range(58, 560, 22))
    return (f'<rect x="40" y="{y - 7}" width="520" height="14" rx="7" fill="#cfe3d8" stroke="{G}" stroke-width="1.5"></rect>{dots}')


def label(y, text, note=None):
    s = f'<text x="{LX}" y="{y + 5.5}" font-family="Manrope" font-size="16" font-weight="500" fill="{T}">{text}</text>'
    if note:
        s += f'<text x="{LX}" y="{y + 28}" font-family="Manrope" font-size="14" fill="{CAP}">{note}</text>'
    return s


def dot(x, y):
    return f'<circle cx="{x}" cy="{y}" r="4" fill="{G}" stroke="#ffffff" stroke-width="1.5"></circle>'


def line(d):
    return f'<path d="{d}" fill="none" stroke="{G}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path>'


svg = [f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" style="display:block">']
# Мембрана клетки и рецептор ACE2
svg.append(f'<rect x="334" y="10" width="14" height="70" rx="7" fill="{B}" stroke="{BD}" stroke-width="1.5"></rect>')
svg.append(membrane(24))
svg.append(f'<path d="M282 112 C282 84 306 68 342 68 C380 68 404 84 404 110 C404 138 382 154 346 154 C306 154 282 140 282 112 Z" fill="{B}" stroke="{BD}" stroke-width="2"></path>')
svg.append('<path d="M318 88 C330 98 332 122 322 138 M356 86 C368 98 370 124 360 140" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" opacity="0.55"></path>')
# Стебель S2 (под головкой)
svg.append(f'<path d="M280 340 L320 340 L318 452 Q317.9 456 314 456 L286 456 Q282.1 456 282 452 Z" fill="#cfe3d8" stroke="{G}" stroke-width="2" stroke-linejoin="round"></path>')
svg.append(f'<path d="M293 350 L294.5 452 M307 350 L305.5 452" fill="none" stroke="{GL}" stroke-width="1.5" stroke-linecap="round"></path>')
svg.append(membrane(460))
# Головка S1: три доли тримера, домен RBD поднят и касается ACE2
svg.append(f'<path d="M300 222 C298 214 302 210 308 204" fill="none" stroke="{GD}" stroke-width="6" stroke-linecap="round"></path>')
svg.append(f'<path d="M206 296 C194 262 214 234 250 238 C266 218 334 218 350 238 C386 234 406 262 394 296 C384 324 350 342 326 348 Q300 354 274 348 C250 342 216 324 206 296 Z" fill="{GL}" stroke="{G}" stroke-width="2" stroke-linejoin="round"></path>')
svg.append(f'<path d="M250 238 C266 218 334 218 350 238 C346 280 334 318 324 348 Q300 353 276 348 C266 318 254 280 250 238 Z" fill="{GXL}" stroke="{G}" stroke-width="1.5" stroke-linejoin="round"></path>')
svg.append(f'<ellipse cx="322" cy="190" rx="34" ry="28" transform="rotate(-18 322 190)" fill="{G}" stroke="{GD}" stroke-width="2"></ellipse>')
svg.append(f'<ellipse cx="338" cy="164" rx="20" ry="10" transform="rotate(-18 338 164)" fill="{O}" stroke="{OD}" stroke-width="1.5"></ellipse>')
# Выноски: точка на элементе, линия к подписи справа
for d, x, y in (('M404 112 H624', 404, 112), ('M352 166 L357 170 Q362 174 368 174 H624', 352, 166),
                ('M344 206 L360 222 Q366 228 374 228 H624', 344, 206), ('M394 290 H624', 394, 290), ('M319 400 H624', 319, 400)):
    svg.append(line(d) + dot(x, y))
svg.append(label(112, 'ACE2 рецептор'))
svg.append(label(174, 'Рецептор-связывающий мотив RBM', 'Связывает рецептор, мишень нейтрализующих антител'))
svg.append(label(228, 'Рецептор-связывающий домен RBD'))
svg.append(label(290, 'S1 (головка)'))
svg.append(label(400, 'S2 (стебель)'))
svg.append('</svg>')

html = (f'<figure style="width: 944px; box-sizing: border-box; background: #f7f4ee; border-radius: 16px; padding: 40px; display: flex; flex-direction: column; gap: 28px; margin: 0;">'
        f'<div style="font:600 20px/31px Manrope;color:{T}">Структура S белка вируса SARS-CoV-2</div>'
        f'{"".join(svg)}</figure>')
(ROOT / 'site/src/data/medx/fig-s-protein.html').write_text(html)
print('fig-s-protein.html', len(html))
