# Phase 4: write SchoolLive.astro from the text template with stages replaced by the curved markup.
import os,re,sys
C=sys.argv[1]
src=open(C+'/SchoolLive.text.astro').read()
def stage(w,html):
    global src
    a=src.index(f'<div class="lv-stage" data-w="{w}" data-h="540">'); a=src.index('>',a)+1
    b=src.index('\n  </div>\n</Tile>',a)
    src=src[:a]+'\n'+html+src[b:]
for w,f in (('760','d'),('532','m')):
    h=open(f'{C}/stage_{f}.html').read().replace('src="/images/school-platform/ill-files.svg"','src={img}')
    stage(w,h)
src=src.replace('// Живая обложка кейса «Цифровая платформа для школ»: окно урока и телефон. Анимация на CSS, сцена масштабируется под плитку.',
 '// Живая обложка кейса «Цифровая платформа для школ»: окно урока и телефон. Анимация на CSS, сцена масштабируется под плитку.\n// Текст переведён в кривые (curve/ в рабочей папке генератора), поэтому шрифты Geologica не грузятся.')
src=src.replace(".lv-ui{font-family:'Geologica',sans-serif;color:#1C1C1C;font-weight:400}",".lv-ui{color:#1C1C1C}")
src=src.replace('</style>','.lv-tx{display:block;overflow:visible;fill:currentColor}\n.lv-tx-i{display:inline-block;vertical-align:top}\n.lv-tx-defs{position:absolute;width:0;height:0;overflow:hidden}\n</style>',1)
src=re.sub(r"import '@fontsource/geologica/[^']*';\n",'',src)
src=src.replace("import Iconsax from './Iconsax.astro';\n",'')
assert "font-family:'Geologica'" not in src
open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'../../site/src/components/SchoolLive.astro'),'w').write(src)
print(len(src))
