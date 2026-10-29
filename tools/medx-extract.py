"""Достаёт фрагменты макетов MedX из канваса «MedX — Статья» для страницы кейса.

python3 tools/medx-extract.py <папка project/ канваса>
Пишет site/src/data/medx/*.html. Картинки из канваса (/_blob/…) заменяются на файлы обложек из
site/public/images/medx (BLOBS), ссылки-якоря на span, id убираются, чтобы не спорить со страницей.
"""
import re, sys, pathlib

SRC = pathlib.Path(sys.argv[1])
OUT = pathlib.Path(__file__).resolve().parent.parent / 'site/src/data/medx'
OUT.mkdir(parents=True, exist_ok=True)

def grab(s, i):
    """Элемент, начинающийся с позиции i, вместе с вложенными тегами того же имени."""
    tag = re.match(r'<([a-z0-9]+)', s[i:]).group(1)
    depth, j = 0, i
    pat = re.compile(r'<(/?)%s\b[^>]*?(/?)>' % tag)
    for m in pat.finditer(s, i):
        if m.group(2): continue
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return s[i:m.end()]
    raise ValueError(tag)

# Картинки канваса → обложки и фото, которые прислал Дмитрий (карточки «В первую очередь» в лонгриде — фото)
BLOBS = {
    '7d4f8a8a6393a20e2422c5bd65e1b573': 'ill-onco-patient.webp',
    '94fdb2bdb50e54914e7037e88a2e1b92': 'photo-risk.webp',
    '0358809e0ab6974af30c0cdf60b70fad': 'photo-staff.webp',
    '182759340007e4ac27a5668576ab6b9e': 'ill-onco.webp',
    '9288a387d4e1e7b43bce57abdf2e58e1': 'ill-onco-patient.webp',
    'dd3921ea1cc8a470985f25da6f666754': 'ill-onco.webp',
    '14f9017466f308540d5d2116f71217a3': 'ill-origins.webp',
    'b198ff436f278d10a76c4ed89b72b69b': 'ill-origins.webp',
}

def clean(h):
    h = re.sub(r'/_blob/([0-9a-f]+)', lambda m: '__IMG__/' + BLOBS.get(m.group(1), 'placeholder.svg'), h)
    h = re.sub(r'<a\b([^>]*?)\shref="#[^"]*"', r'<span\1', h)
    h = re.sub(r'</a>', '</span>', h)
    h = re.sub(r'\sid="[^"]*"', '', h)
    h = re.sub(r'<!--[\s\S]*?-->', '', h)
    return h

def body(name):
    s = (SRC / name).read_text()
    s = re.sub(r'<helmet>[\s\S]*?</helmet>', '', s)
    return s[s.index('<x-dc>') + 6:s.index('</x-dc>')].strip()

def figures(name):
    s = body(name)
    return [grab(s, m.start()) for m in re.finditer(r'<figure\b', s)]

def fluid(h):
    """Схема тянется на ширину контейнера: рамка 100%, широкие SVG масштабируются по ширине."""
    h = h.replace('width: 944px;', 'width: 100%;', 1)
    # Белок S: шаги и рисунок растут не больше чем в 1,2 раза, иначе подписи в SVG крупнее текста
    h = h.replace('<div style="display: flex; width: 864px;">', '<div style="display: flex; width: 100%; max-width: 1040px; margin-inline: auto;">')
    h = h.replace('style="display: block; margin-top: -12px;"', 'style="display: block; margin-top: -12px; max-width: 1040px; margin-inline: auto;"')
    h = h.replace('<div style="width: 288px; display: flex; justify-content: center;">', '<div style="flex: 1; display: flex; justify-content: center;">')
    return re.sub(r'(<svg width="864" height="\d+"[^>]*?style=")', r'\1width: 100%; height: auto; ', h)


NUM = r'(-?[0-9.]+)'
def _f(v): return f'{v:.1f}'.rstrip('0').rstrip('.')

def round_hv(h, r=10):
    """Ортогональные линии (M x y H.. V..) получают скруглённые углы вместо прямых."""
    def one(m):
        toks = re.findall(r'([MHV])\s*(-?[0-9.]+)(?:\s+(-?[0-9.]+))?', m.group(1))
        if len(toks) < 3 or toks[0][0] != 'M': return m.group(0)
        pts = [(float(toks[0][1]), float(toks[0][2]))]
        for c, a, _ in toks[1:]:
            x, y = pts[-1]
            pts.append((float(a), y) if c == 'H' else (x, float(a)))
        d = f'M{_f(pts[0][0])} {_f(pts[0][1])}'
        for i in range(1, len(pts) - 1):
            (ax, ay), (bx, by), (cx, cy) = pts[i - 1], pts[i], pts[i + 1]
            l1, l2 = abs(bx - ax) + abs(by - ay), abs(cx - bx) + abs(cy - by)
            k = min(r, l1 / 2, l2 / 2)
            if k <= 0: continue
            sx, sy = (bx - ax) / l1, (by - ay) / l1
            ex, ey = (cx - bx) / l2, (cy - by) / l2
            d += f' L{_f(bx - sx * k)} {_f(by - sy * k)} Q{_f(bx)} {_f(by)} {_f(bx + ex * k)} {_f(by + ey * k)}'
        d += f' L{_f(pts[-1][0])} {_f(pts[-1][1])}'
        return f'd="{d}"'
    return re.sub(r'd="(M[0-9. ]+(?:\s*[HV]\s*[0-9.]+){2,})"', one, h)

def round_polyline(h, r=20):
    """Ломаные выноски (M.. L.. L..) со скруглённым изломом, направление входа сохраняется."""
    def one(m):
        pts = [tuple(map(float, q)) for q in re.findall(NUM + ' ' + NUM, m.group(1))]
        seg = lambda i: ((pts[i + 1][0] - pts[i][0]) ** 2 + (pts[i + 1][1] - pts[i][1]) ** 2) ** .5
        if min(seg(i) for i in range(len(pts) - 1)) < 20: return m.group(0)  # наконечник стрелки
        d = f'M{_f(pts[0][0])} {_f(pts[0][1])}'
        for i in range(1, len(pts) - 1):
            (ax, ay), (bx, by), (cx, cy) = pts[i - 1], pts[i], pts[i + 1]
            l1, l2 = ((bx - ax) ** 2 + (by - ay) ** 2) ** .5, ((cx - bx) ** 2 + (cy - by) ** 2) ** .5
            k = min(r, l1 / 2, l2 / 2)
            d += (f' L{_f(bx - (bx - ax) / l1 * k)} {_f(by - (by - ay) / l1 * k)}'
                  f' Q{_f(bx)} {_f(by)} {_f(bx + (cx - bx) / l2 * k)} {_f(by + (cy - by) / l2 * k)}')
        return f'd="{d} L{_f(pts[-1][0])} {_f(pts[-1][1])}"'
    return re.sub(r'd="(M[0-9.]+ [0-9.]+(?: L[0-9.]+ [0-9.]+){2,})"', one, h)

ARROW = re.compile(r'(<path d=")(M[0-9. L-]+)("[^>]*></path>\s*<path d=")M([0-9.-]+) ([0-9.-]+) L([0-9.-]+) ([0-9.-]+) L([0-9.-]+) ([0-9.-]+)(")')

def smooth_arrows(h, s_bend=False, r=24):
    """Наклонные стрелки: выходят прямо и плавно поворачивают в цель, наконечник по направлению входа."""
    def one(m):
        pts = [tuple(map(float, q)) for q in re.findall(NUM + ' ' + NUM, m.group(2))]
        tip = (float(m.group(6)), float(m.group(7)))
        if len(pts) < 2 or abs(pts[-1][0] - tip[0]) > .6 or abs(pts[-1][1] - tip[1]) > .6: return m.group(0)
        (x1, y1), (x2, y2) = pts[-2], pts[-1]
        dx, dy = x2 - x1, y2 - y1
        if abs(dx) < .6 or abs(dy) < .6: return m.group(0)
        sx, sy = (1 if dx > 0 else -1), (1 if dy > 0 else -1)
        head = pts[:-2]
        d = 'M' + ' L'.join(f'{_f(x)} {_f(y)}' for x, y in head + [(x1, y1)])
        if s_bend:
            ym = (y1 + y2) / 2; k = min(r, abs(dx) / 2, abs(dy) / 2)
            d += (f' L{_f(x1)} {_f(ym - sy * k)} Q{_f(x1)} {_f(ym)} {_f(x1 + sx * k)} {_f(ym)}'
                  f' L{_f(x2 - sx * k)} {_f(ym)} Q{_f(x2)} {_f(ym)} {_f(x2)} {_f(ym + sy * k)} L{_f(x2)} {_f(y2)}')
        else:
            k = min(r, abs(dx), abs(dy))
            d += f' L{_f(x2 - sx * k)} {_f(y1)} Q{_f(x2)} {_f(y1)} {_f(x2)} {_f(y1 + sy * k)} L{_f(x2)} {_f(y2)}'
        # наконечник смотрит вдоль вертикали входа
        hx, hy = 4.6, 8.6
        tipd = f'M{_f(x2 - hx)} {_f(y2 - sy * hy)} L{_f(x2)} {_f(y2)} L{_f(x2 + hx)} {_f(y2 - sy * hy)}'
        return m.group(1) + d + m.group(3) + tipd + m.group(10)
    return ARROW.sub(one, h)

DOT_PAIR = re.compile(r'(<path d="(M[^"]+)"[^>]*stroke="(#[0-9a-f]{6})"[^>]*></path>\s*)<path d="M[0-9.-]+ [0-9.-]+ L([0-9.-]+) ([0-9.-]+) L[0-9.-]+ [0-9.-]+"[^>]*></path>')

def dot_heads(h, keep=()):
    """Выноски заканчиваются точкой с белой обводкой (как в «Строении коронавируса»), а не стрелкой, упёртой в элемент."""
    def one(m):
        if m.group(2).startswith(keep): return m.group(0)
        return m.group(1) + f'<circle cx="{m.group(4)}" cy="{m.group(5)}" r="4" fill="{m.group(3)}" stroke="#ffffff" stroke-width="1.5"></circle>'
    return DOT_PAIR.sub(one, h)

def write(n, h):
    (OUT / f'{n}.html').write_text(clean(h))

o1, o2, o3, o4 = (figures(f'Origins{i}.dc.html') for i in range(1, 5))
# fig-genera рисует tools/medx-genera.py (вариант B с иконками животных)
# Шкала хронологии из SVG фиксированной ширины в сетку из трёх колонок, чтобы схема тянулась на всю ширину
TIMELINE = ('<div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;height:34px">'
            '<span style="position:absolute;left:2px;right:2px;top:16px;height:2px;border-radius:1px;background:#3b876a"></span>'
            '<svg width="11" height="18" viewBox="0 0 11 18" style="position:absolute;right:0;top:8px"><path d="M1 1 L9.5 9 L1 17" stroke="#3b876a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
            + ''.join(f'<span style="position:relative;justify-self:center;width:2px;height:26px;margin-top:4px;background:#3b876a">'
                      f'<i style="position:absolute;left:-6px;top:6px;width:14px;height:14px;border-radius:50%;box-sizing:border-box;border:2px solid #f7f4ee;background:{c}"></i></span>'
                      for c in ('#3b876a', '#3b876a', '#c9744a'))
            + '</div>')
out = re.sub(r'<svg width="864" height="34"[\s\S]*?</svg>', TIMELINE, o1[3], count=1)
# Классы для отзывчивой раскладки: на узком экране карточки идут столбиком, шкала становится вертикальной (medx-case.css)
out = out.replace('<div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;height:34px">', '<div class="mxo-line" style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;height:34px">', 1)
out = out.replace('<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px"><div style="background:#ffffff', '<div class="mxo-cards" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px"><div style="background:#ffffff', 1)
assert 'mxo-line' in out and 'mxo-cards' in out, 'разметка хронологии вспышек изменилась'
write('fig-outbreaks', fluid(out).replace('<figure style="', '<figure class="mxo" style="', 1))
# Животные-хозяева: карточки промежуточных хозяев выше (у панголина подпись в две строки),
# «Летучие мыши» компактнее; стрелки снизу укорочены под новые размеры
hosts = o1[4].replace('font:400 28px/34px PT Serif;color:#c9744a', 'font:600 24px/32px Manrope;color:#c9744a').replace('top:150px;width:250px;height:134px;', 'top:150px;width:250px;height:146px;')
hosts = hosts.replace('left:282px;top:350px;width:300px;height:100px;', 'left:282px;top:358px;width:300px;height:88px;')
hosts = hosts.replace('height:88px;background:#e8f3ee;border:1.5px solid #3b876a;border-radius:12px;box-sizing:border-box;padding:16px 20px;display:flex;flex-direction:column;justify-content:center;gap:6px"><div style="display:flex;align-items:center;gap:12px;justify-content:flex-start',
                      'height:88px;background:#e8f3ee;border:1.5px solid #3b876a;border-radius:12px;box-sizing:border-box;padding:12px 20px;display:flex;flex-direction:column;justify-content:center;gap:0"><div style="display:flex;align-items:center;gap:10px;justify-content:center')
for x in ('382', '432', '482'): hosts = hosts.replace(f'd="M{x} 346 ', f'd="M{x} 352 ')
hosts = re.sub(r'(d="M[0-9.]+ 352 L[0-9.]+) 294"', r'\1 306"', hosts)
hosts = re.sub(r'L(125|739) 294 L', r'L\1 306 L', hosts)
hosts = hosts.replace('d="M427.2 302.8 L432 294 L436.8 302.8"', 'd="M427.4 314.6 L432 306 L436.6 314.6"')
write('fig-hosts', smooth_arrows(hosts, s_bend=True))
# Геном: буквы S, E, M, N и их выноски в цветах белков из легенды, выноски с точкой на конце
genome = fluid(o3[0])
for y, c in (('76', '#3b876a'), ('150', '#c9744a'), ('200', '#6f93a8'), ('240', '#b08a2e')):
    genome = re.sub(r'(<path d="M([0-9.]+) ([0-9.]+) L250 %s" stroke=")#3b876a(" stroke-width=")1.2"' % y,
                    lambda m, c=c: m.group(1) + c + m.group(4) + '1.5"', genome)
    genome = re.sub(r'(<path d="M([0-9.]+) ([0-9.]+) L250 %s"[^>]*></path>)' % y,
                    lambda m, c=c: m.group(1) + f'<circle cx="{float(m.group(2)):.1f}" cy="{float(m.group(3)):.1f}" r="3.5" fill="{c}" stroke="#ffffff" stroke-width="1.5"></circle>', genome)
    # прежняя мелкая точка на конце выноски поверх новой не нужна
    genome = re.sub(r'(r="3.5" fill="%s" stroke="#ffffff" stroke-width="1.5"></circle>)<circle [^>]*r="2.5"[^>]*></circle>' % c, r'\1', genome)
for t, ty, c in (('S', '80', '#3b876a'), ('E', '155', '#c9744a'), ('M', '205', '#6f93a8'), ('N', '245', '#b08a2e')):
    genome = genome.replace(f'<text x="256" y="{ty}" font-family="Manrope, sans-serif" font-size="15" font-weight="600" fill="#173d34" text-anchor="start">{t}</text>',
                            f'<text x="256" y="{ty}" font-family="Manrope, sans-serif" font-size="16" font-weight="700" fill="{c}" text-anchor="start">{t}</text>')
# Подпись про серые гены уходит в примечание, чтобы вирус и легенда центрировались друг относительно друга
gray = '<div style="font-size: 14px; line-height: 21px; color: #60716a; padding-top: 6px;">Серые гены — вспомогательные (3a, 6, 7a, 7b, 8, 10).</div>'
assert gray in genome
genome = genome.replace(gray, '').replace('Одна нить РНК длиной около 30 тыс. нуклеотидов</div>',
                                           'Одна нить РНК длиной около 30 тыс. нуклеотидов. Серые гены — вспомогательные (3a, 6, 7a, 7b, 8, 10).</div>')
write('fig-genome', genome)
# Белок S: выноска «Тримеры белка S» не доходит до шипа вплотную, рисунок отодвинут от шагов
spike = fluid(o3[2]).replace('d="M110 22 L122 40"', 'd="M122 23 L122 34"').replace('d="M121.1 31.0 L122 40 L114.1 35.7"', 'd="M117.4 25.4 L122 34 L126.6 25.4"')
spike = spike.replace('margin-top: -12px;', 'margin-top: 20px;').replace('gap: 28px; margin: 0;', 'gap: 36px; margin: 0;', 1)
# стрелки между стадиями посередине промежутка между вирусами
for a, b in (('M220 70 L262 70', 'M267 70 L309 70'), ('M254.1 65.8 L262 70 L254.1 74.2', 'M301.1 65.8 L309 70 L301.1 74.2'),
             ('M508 70 L550 70', 'M554 70 L596 70'), ('M542.1 65.8 L550 70 L542.1 74.2', 'M588.1 65.8 L596 70 L588.1 74.2')):
    spike = spike.replace(a, b)
spike = spike.replace('d="M122 23 L122 34"', 'd="M122 23 L122 36"').replace('d="M117.4 25.4 L122 34 L126.6 25.4"', 'd="M117.4 27.4 L122 36 L126.6 27.4"')
# Подложка клетки внизу обрезалась краем svg и давала острые углы: доводим её до низа со скруглением
spike = spike.replace('H864 V300 H0 Z" fill="#e8f3ee"', 'H864 V274 Q864 290 848 290 H16 Q0 290 0 274 Z" fill="#e8f3ee"')
spike = spike.replace('H864 V300 H0 H640 Z" fill="#e8f3ee"', 'H864 V274 Q864 290 848 290 H640 Z" fill="#e8f3ee"')
spike = dot_heads(smooth_arrows(spike), keep=('M267 ', 'M554 ', 'M396 ', 'M500 ', 'M720 '))
# Нить РНК заканчивается просто линией, без стрелки (Дмитрий, 2026-10-28)
spike, n_rna = re.subn(r'<path d="M724\.2 200\.1 L720 208 L715\.8 200\.1"[^>]*>(</path>)?', '', spike)
assert n_rna == 1, 'стрелка на конце РНК не найдена'
write('fig-spike', spike)
# Колонки «одного вида / разные / человек» шире, чтобы подписи не слипались
# Шапка таблицы: «Связывание АПФ2 рецептора» сидит вплотную к подписям колонок, под ними больше воздуха до строк
mut = o3[5].replace('padding:24px;display:flex;flex-direction:column;gap:16px;position:relative;', 'padding:36px 24px 24px;display:flex;flex-direction:column;gap:16px;position:relative;')
mut = mut.replace('flex-direction:column;align-items:center;gap:4px;', 'flex-direction:column;align-items:center;gap:8px;')
mut = mut.replace('display:flex;padding-left:48px;justify-content:flex-end;', 'display:flex;padding-left:48px;justify-content:flex-end;margin-bottom:4px;')
# подписи колонок выровнены по низу («человек» в одну строку стоит на уровне вторых строк соседей)
mut = mut.replace('display:flex;padding-right:24px;', 'display:flex;align-items:flex-end;padding-right:24px;', 1)
# линия таймлайна от первой точки до последней
mut = mut.replace('position:absolute;left:35px;top:96px;bottom:50px;', 'position:absolute;left:35px;top:144px;bottom:102px;')
write('fig-mutations', fluid(mut).replace('width:88px;', 'width:136px;').replace('padding:16px 24px;display:flex;align-items:center;gap:16px;', 'padding:20px 28px;display:flex;align-items:center;gap:24px;').replace('gap:14px;position:relative;', 'gap:16px;position:relative;'))
# Этиология ОРВИ вместо «Линий SARS-CoV-2» (Дмитрий, 2026-10-28): без антиквы, выноска с точкой на конце
orvi = fluid(o1[2]).replace('font-family="PT Serif" font-size="34"', 'data-keep="" font-family="Manrope" font-weight="700" font-size="32"')
orvi = orvi.replace('font:400 24px/32px PT Serif;color:#3b876a', 'font:600 24px/32px Manrope;color:#3b876a')
assert 'PT Serif' not in orvi, 'в схеме ОРВИ осталась антиква'
write('fig-orvi', dot_heads(orvi))
# Сложные схемы для блока «Задача и проблема»
write('fig-structure', o1[1])
# Названия подродов без антиквы, как остальные подписи схем
write('fig-phylo', o2[2].replace('font-family="PT Serif" font-size="28"', 'font-family="Manrope" font-weight="600" font-size="24"'))
# SimPlot без белой подложки: график и легенда прямо на фоне фрейма
write('fig-simplot', o3[1].replace('<div style="background:#ffffff;border-radius:12px;padding:20px 24px;display:flex;flex-direction:column;gap:16px">',
                                   '<div style="display:flex;flex-direction:column;gap:20px">').replace('gap:6px 16px;padding-left:12px', 'gap:6px 16px'))
# Где обитают подковоносы: два блока на всю ширину фрейма (заменила схему структуры S-белка)
write('fig-bats', fluid(o2[1]))

# Шапка лонгрида: без бежевого фона под картинкой, иначе он просвечивает на скруглённых углах
# Скругление только через clip-path (overflow + border-radius при масштабировании дают ореол картинки по краю),
# а слева под текстом подложка непрозрачная, чтобы фото не просвечивало пятнами
lr = body('Main.dc.html').replace('border-radius: 32px; background: #f7f4ee; overflow: hidden;', 'clip-path: inset(0 round 32px); isolation: isolate;', 1).replace('left: -33px; top: 16px; width: 1010px', 'left: -33px; top: 0; width: 1010px', 1)  # фон итогов без тёмной полосы сверху
lr = lr.replace('rgba(247,244,238,0.97) 0%, rgba(247,244,238,0.93) 40%', '#f7f4ee 0%, #f7f4ee 40%', 1)
# Разделитель после итогов в канвасе вёл к подвалу статьи, которого в кейсе нет (Дмитрий, 2026-10-28)
hr = '<hr style="margin: 0; border: 0; height: 1px; background: #d9e4dd;">'
assert lr.count(hr) == 1, 'разделитель в конце лонгрида не найден'
lr = lr.replace(hr, '')
# Ветки содержания без наложения отрезков: в масштабе наложенные сглаженные линии темнели пятнами
tree_old = 'd="M9 -6 V112 M9 4 V14 C9 19.33 11.67 22 17 22 H30 M9 56 V66 C9 71.33 11.67 74 17 74 H30 M9 108 V118 C9 123.33 11.67 126 17 126 H30"'
assert lr.count(tree_old) == 2, 'ветки содержания в лонгриде изменились'
lr = lr.replace(tree_old, 'd="M9 -6 V14 C9 19.33 11.67 22 17 22 H30 M9 14 V66 C9 71.33 11.67 74 17 74 H30 M9 66 V118 C9 123.33 11.67 126 17 126 H30"')
write('longread', lr)
# В сайдбаре «Моё обучение» вместо набранного «MedX» настоящий логотип (векторная отрисовка с растра)
lms = body('Main-v2-photo-kwjf.dc.html')
lms = re.sub(r'<div style="padding: 0 12px; font-family: \'PT Serif\'[^>]*>MedX</div>',
             '<img src="__IMG__/logo.svg" alt="MedX.pro" width="150" height="58" style="display:block;margin:0 12px;height:auto">', lms, count=1)
# Аватар Анны Смирновой вместо инициалов
lms = re.sub(r'<div style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; background: #173D34;[^"]*">АС</div>',
             '<img src="__IMG__/avatar-anna.webp" alt="" width="40" height="40" style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 50%; object-fit: cover; display: block">', lms, count=1)
# Первый шаг учебного плана — тот же лонгрид, что в «Продолжить обучение»; оценка риска идёт вторым
step1 = ('font-size: 20px; line-height: 26px; color: #173D34">Оценка риска перед вакцинацией<',
         'Начать', 'Ключевые факторы, чек-лист и клинические примеры', '15 минут')
assert all(x in lms for x in step1), 'учебный план изменился'
lms = lms.replace(step1[0], step1[0].replace('Оценка риска перед вакцинацией', 'Вакцинация онкологических пациентов'), 1)
lms = lms.replace('white-space: nowrap">Начать ', 'white-space: nowrap">Продолжить ', 1)
lms = lms.replace(step1[2], 'Кого вакцинировать и как выбрать время в зависимости от терапии', 1)
lms = lms.replace('<span style="padding-bottom: 2px">15 минут</span>', '<span style="padding-bottom: 2px">25 минут</span>', 1)
lms = lms.replace('color: #60716A">Выбор тактики вакцинации</span>', 'color: #60716A">Оценка риска перед вакцинацией</span>', 1)
lms = lms.replace('Лонгрид · 10 мин', 'Лонгрид · 15 мин', 1)
write('lms', lms)

print(sorted(p.name for p in OUT.iterdir()))
