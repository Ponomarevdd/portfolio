// Phase 3: re-measure (same marking), swap text for SVG curves, serialize both stages.
import { chromium } from 'playwright';
import fs from 'fs';
const C=process.argv[2];
const {runs,defs}=JSON.parse(fs.readFileSync(C+'/svgs.json','utf8'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto('http://127.0.0.1:4399/work/'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
const res=await p.evaluate(([runs,defs])=>{
  // same traversal order as measure.mjs, so run ids line up
  const inflow=(n)=>{ if(n.nodeType===3) return n.data.trim()!==''; if(n.nodeType!==1) return false; if(n.tagName==='BR') return true; const pos=getComputedStyle(n).position; return !(pos==='absolute'||pos==='fixed'); };
  const handled=new Set(); const todo=[]; let id=0;
  for (const tile of document.querySelectorAll('.lv-tile')) {
    const w=document.createTreeWalker(tile,NodeFilter.SHOW_TEXT); const nodes=[]; let n; while((n=w.nextNode())) if(n.data.trim()) nodes.push(n);
    for (const t of nodes) {
      const P=t.parentElement; const cs=getComputedStyle(P);
      const kids=[...P.childNodes].filter(c=>inflow(c));
      const textOnly=kids.every(c=>c.nodeType===3||c.tagName==='BR') && cs.display!=='inline';
      if (textOnly && handled.has(P)) continue;
      if (textOnly) handled.add(P);
      todo.push({rid:'r'+(id++),textOnly,P,t});
    }
  }
  for (const {rid,textOnly,P,t} of todo) {
    const tpl=document.createElement('template'); tpl.innerHTML=runs[rid]; const svg=tpl.content.firstChild;
    if (textOnly) { [...P.childNodes].filter(c=>c.nodeType===3||c.tagName==='BR').forEach(c=>c.remove()); P.prepend(svg); }
    else t.replaceWith(svg);
  }
  const st=document.querySelectorAll('.lv-stage');
  const tpl=document.createElement('template'); tpl.innerHTML=defs; st[0].prepend(tpl.content.firstChild);
  return {count:todo.length,d:st[0].innerHTML,m:st[1].innerHTML};
},[runs,defs]);
fs.writeFileSync(C+'/stage_d.html',res.d); fs.writeFileSync(C+'/stage_m.html',res.m);
console.log(res.count,res.d.length,res.m.length);
await b.close();
