# Phase 2: turn measured runs into SVG glyph symbols + per-run svg markup.
import json,sys
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../site/')+'node_modules/@fontsource/geologica/files/'
C=sys.argv[1]
runs=json.load(open(C+'/runs.json'))
fonts={w:[TTFont(f'{D}geologica-{sub}-{w}-normal.woff2') for sub in ('latin','cyrillic','latin-ext','cyrillic-ext')] for w in (400,500,600)}
UPM=2000; ASC=1950
def glyph(w,ch):
    for f in fonts[w]:
        cm=f.getBestCmap()
        if ord(ch) in cm:
            gs=f.getGlyphSet(); pen=SVGPathPen(gs,lambda v:('%d'%round(v)) if abs(v-round(v))<.05 else ('%.1f'%v).rstrip('0').rstrip('.'))
            gs[cm[ord(ch)]].draw(pen); return pen.getCommands()
    raise SystemExit('missing glyph %r w%d'%(ch,w))
syms={}; out={}
def num(v,p=2): s=(('%.'+str(p)+'f')%v).rstrip('0').rstrip('.'); return s if s not in ('-0','') else '0'
for r in runs:
    groups={}
    for c in r['chars']:
        key=(c['w'],c['ch']); 
        if key not in syms: syms[key]='g%d'%len(syms)
        sc=c['s']/UPM; base=c['top']+round(ASC*c['s']/UPM)
        g=groups.setdefault((c['s'],round(base,2)),[])
        g.append('<use href="#%s" x="%d"/>'%(syms[key],round(c['x']/sc)))
    body=''.join('<g transform="matrix(%s 0 0 -%s 0 %s)">%s</g>'%(num(s/UPM,6),num(s/UPM,6),num(b),''.join(u)) for (s,b),u in groups.items())
    cls='lv-tx' if r['mode']=='block' else 'lv-tx lv-tx-i'
    out[r['id']]='<svg class="%s" width="%s" height="%s" aria-hidden="true">%s</svg>'%(cls,num(r['W']),num(r['H']),body)
defs='<svg class="lv-tx-defs" width="0" height="0" aria-hidden="true"><defs>'+''.join('<path id="%s" d="%s"/>'%(i,glyph(w,ch)) for (w,ch),i in syms.items())+'</defs></svg>'
json.dump({'runs':out,'defs':defs},open(C+'/svgs.json','w'),ensure_ascii=False)
print(len(syms),'glyphs; defs',len(defs),'runs',sum(map(len,out.values())))
