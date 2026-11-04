"""Готовит сборку сайта (site/dist) к публикации в артефакт: _astro → assets,
абсолютные ссылки → относительные, ссылки на папки → index.html, шрифты в CSS встраиваются (woff2, base64).

python3 tools/artifact-relativize.py <dist> <out>
"""
import base64, pathlib, re, shutil, sys

dist, out = map(pathlib.Path, sys.argv[1:3])
if out.exists(): shutil.rmtree(out)
shutil.copytree(dist, out)
(out / '_astro').rename(out / 'assets')
assets = out / 'assets'

def font_src(m):
    files = re.findall(r"url\(/_astro/([^)]+)\)\s*format\('([^']+)'\)", m.group(0))
    for name, fmt in files:
        if fmt == 'woff2':
            data = base64.b64encode((assets / name).read_bytes()).decode()
            return f"src: url(data:font/woff2;base64,{data}) format('woff2');"
    return m.group(0)

for css in assets.glob('*.css'):
    s = css.read_text()
    s = re.sub(r"src:\s*url\(/_astro/[^;]+;", font_src, s)
    s = s.replace('/_astro/', './')
    css.write_text(s)

def rel(path, depth):
    prefix = '../' * depth or './'
    path = path.replace('/_astro/', '/assets/')
    target = path[1:]
    if target == '' or target.endswith('/'):
        target += 'index.html'
    return prefix + target

for html in out.rglob('*.html'):
    depth = len(html.relative_to(out).parts) - 1
    s = re.sub(r"src:\s*url\(/_astro/[^;]+;", font_src, html.read_text())
    s = re.sub(r'(href|src|poster|content|component-url|renderer-url|before-hydration-url)="(/(?!/)[^"#]*)"', lambda m: f'{m.group(1)}="{rel(m.group(2), depth)}"', s)
    s = re.sub(r'url\((/(?!/)[^)]*)\)', lambda m: f'url({rel(m.group(1), depth)})', s)
    html.write_text(s)
print('ok')
