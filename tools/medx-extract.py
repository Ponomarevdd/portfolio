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

def write(n, h):
    (OUT / f'{n}.html').write_text(clean(h))

o1, o2, o3, o4 = (figures(f'Origins{i}.dc.html') for i in range(1, 5))
write('fig-genera', fluid(o1[0]))
# Шкала хронологии из SVG фиксированной ширины в сетку из трёх колонок, чтобы схема тянулась на всю ширину
TIMELINE = ('<div style="position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:16px;height:34px">'
            '<span style="position:absolute;left:2px;right:2px;top:16px;height:2px;border-radius:1px;background:#3b876a"></span>'
            '<svg width="11" height="18" viewBox="0 0 11 18" style="position:absolute;right:0;top:8px"><path d="M1 1 L9.5 9 L1 17" stroke="#3b876a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>'
            + ''.join(f'<span style="position:relative;justify-self:center;width:2px;height:26px;margin-top:4px;background:#3b876a">'
                      f'<i style="position:absolute;left:-6px;top:6px;width:14px;height:14px;border-radius:50%;box-sizing:border-box;border:2px solid #f7f4ee;background:{c}"></i></span>'
                      for c in ('#3b876a', '#3b876a', '#c9744a'))
            + '</div>')
out = re.sub(r'<svg width="864" height="34"[\s\S]*?</svg>', TIMELINE, o1[3], count=1)
write('fig-outbreaks', fluid(out))
write('fig-hosts', o1[4])
write('fig-genome', fluid(o3[0]))
write('fig-spike', fluid(o3[2]))
write('fig-mutations', fluid(o3[5]))
write('fig-lineages', fluid(o4[0]))
# Сложные схемы для блока «Задача и проблема»
write('fig-structure', o1[1])
write('fig-phylo', o2[2])
write('fig-simplot', o3[1])
write('fig-s-protein', o3[3])

write('longread', body('Main.dc.html'))
# В сайдбаре «Моё обучение» вместо набранного «MedX» настоящий логотип (векторная отрисовка с растра)
lms = body('Main-v2-photo-kwjf.dc.html')
lms = re.sub(r'<div style="padding: 0 12px; font-family: \'PT Serif\'[^>]*>MedX</div>',
             '<img src="__IMG__/logo.svg" alt="MedX.pro" width="150" height="58" style="display:block;margin:0 12px;height:auto">', lms, count=1)
write('lms', lms)

print(sorted(p.name for p in OUT.iterdir()))
