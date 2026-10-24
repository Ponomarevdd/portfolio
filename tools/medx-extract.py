"""Достаёт фрагменты макетов MedX из канваса «MedX — Статья» для страницы кейса.

python3 tools/medx-extract.py <папка project/ канваса>
Пишет site/src/data/medx/*.html. Картинки из канваса (/_blob/…) заменяются на заглушку
__IMG__/placeholder.svg, ссылки-якоря на span, id убираются, чтобы не спорить со страницей.
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

def clean(h):
    h = re.sub(r'/_blob/[0-9a-f]+', '__IMG__/placeholder.svg', h)
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

def write(n, h):
    (OUT / f'{n}.html').write_text(clean(h))

o1, o3, o4 = figures('Origins1.dc.html'), figures('Origins3.dc.html'), figures('Origins4.dc.html')
write('fig-genera', o1[0])
write('fig-outbreaks', o1[3])
write('fig-hosts', o1[4])
write('fig-genome', o3[0])
write('fig-spike', o3[2])
write('fig-mutations', o3[5])
write('fig-lineages', o4[0])

write('longread', body('Main.dc.html'))
write('lms', body('Main-v2-photo-kwjf.dc.html'))

# Плашки из UI kit: элемент сразу после подписи .lbl
kit = body('Kit.dc.html')
kit = kit[kit.index('>Плашки<'):]
for m in re.finditer(r'<p class="lbl">([^<]+)</p>\s*', kit):
    slug = {'Важно': 'note', 'Карточка с рекомендацией': 'card', 'Этап и срок': 'stage', 'Таблица': 'table',
            'Таймлайн': 'timeline', 'Итоги': 'summary', 'Содержание': 'toc', 'Список': 'list'}.get(m.group(1))
    if slug: write(f'kit-{slug}', grab(kit, m.end()))
print(sorted(p.name for p in OUT.iterdir()))
