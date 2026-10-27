"""Схема «Роды коронавирусов и их хозяева» для кейса MedX (вариант B: пять карточек с иконками животных).

python3 tools/medx-genera.py — пишет site/src/data/medx/fig-genera.html.
Иконки лежат в site/src/assets/medx-animals (черновые, game-icons.net, CC BY 3.0).
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / 'site/src/assets/medx-animals'
ANIMAL = {'Лягушки': 'frog', 'Летучие мыши': 'bat', 'Грызуны': 'rat', 'Свиньи': 'pig', 'Коровы': 'cow', 'Утки': 'duck',
          'Кошки': 'cat', 'Собаки': 'sitting-dog', 'Верблюды': 'camel', 'Барсуки': 'badger', 'Панголины': 'pangolin',
          'Птицы': 'seagull', 'Киты': 'whale-tail', 'Человек': 'person'}
GENERA = [  # род, хозяева, заражает человека
    ('Alphaletovirus', ['Лягушки'], False),
    ('Alphacoronavirus', ['Летучие мыши', 'Грызуны', 'Свиньи', 'Коровы', 'Утки', 'Кошки', 'Собаки'], True),
    ('Betacoronavirus', ['Летучие мыши', 'Грызуны', 'Верблюды', 'Барсуки', 'Панголины'], True),
    ('Deltacoronavirus', ['Птицы'], False),
    ('Gammacoronavirus', ['Птицы', 'Киты'], False),
]
T, CAP, P, BG, O, OT, LINE = '#173d34', '#60716a', '#3b876a', '#f7f4ee', '#c9744a', '#75462f', '#d9e4dd'

def body(n):
    return re.search(r'<svg[^>]*>(.*)</svg>', (ICONS / f'{n}.svg').read_text(), re.S).group(1)

def icon(name, size, color):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 512 512" style="display:block;flex:none;color:{color}" aria-hidden="true">'
            f'{body(ANIMAL[name])}</svg>')

cards = []
for genus, hosts, human in GENERA:
    tiles = ''.join(
        f'<li style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:14px 6px 12px;border-radius:12px;background:{BG};'
        f'font:500 13px/17px Manrope;color:{T};text-align:center">{icon(h, 40, P)}<span>{h}</span></li>' for h in hosts)
    # Подвал в одну строку и в одном стиле у обоих состояний: иконка человека + подпись
    foot = (f'<div style="display:flex;align-items:center;gap:6px;padding-top:14px;border-top:1px solid {LINE};'
            f'font:600 13px/18px Manrope;white-space:nowrap;color:{OT if human else CAP}">'
            f'{icon("Человек", 16, O if human else "#afbcb6")}{"Заражает человека" if human else "Человека не заражает"}</div>')
    ring = f'box-shadow:inset 0 0 0 1.5px {O};' if human else ''
    cards.append(
        f'<div style="background:#ffffff;border-radius:14px;padding:20px 14px 14px;display:flex;flex-direction:column;gap:18px;{ring}">'
        f'<div style="font:600 16px/22px Manrope;color:{T if human else CAP}">{genus}</div>'
        f'<ul style="list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;flex:1;align-content:start">{tiles}</ul>'
        f'{foot}</div>')

html = (f'<figure style="width: 944px; box-sizing: border-box; background: {BG}; border-radius: 16px; padding: 40px; display: flex; flex-direction: column; gap: 28px; margin: 0;">'
        f'<div style="font:600 20px/31px Manrope;color:{T}">Роды коронавирусов и их хозяева</div>'
        f'<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px;align-items:stretch">{"".join(cards)}</div>'
        f'<div style="font:400 15px/24px Manrope;color:{CAP}">Только 2 рода из 5 заражают человека. Иконки: game-icons.net, CC BY 3.0</div>'
        '</figure>')
(ROOT / 'site/src/data/medx/fig-genera.html').write_text(html)
print('fig-genera.html', len(html))
