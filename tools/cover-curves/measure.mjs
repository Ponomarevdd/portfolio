// Phase 1: collect text runs with per-char positions from the live (text) cover on /work/.
import { chromium } from 'playwright';
import fs from 'fs';
const OUT=process.argv[2];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
await p.goto('http://127.0.0.1:4399/work/'); await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(500);
const runs = await p.evaluate(()=>{
  const st=document.createElement('style'); st.textContent='.lv,.lv *{animation:none!important;transition:none!important}'; document.head.append(st);
  document.querySelectorAll('.lv-stage').forEach(s=>s.style.setProperty('--s','1'));
  const runs=[]; let id=0;
  const inflow=(n)=>{ if(n.nodeType===3) return n.data.trim()!==''; if(n.nodeType!==1) return false; if(n.tagName==='BR') return 'br'; const pos=getComputedStyle(n).position; return !(pos==='absolute'||pos==='fixed'); };
  const handled=new Set();
  for (const tile of document.querySelectorAll('.lv-tile')) {
    const w=document.createTreeWalker(tile,NodeFilter.SHOW_TEXT); const nodes=[]; let n; while((n=w.nextNode())) if(n.data.trim()) nodes.push(n);
    for (const t of nodes) {
      const P=t.parentElement; const cs=getComputedStyle(P);
      const kids=[...P.childNodes].filter(c=>inflow(c));
      const textOnly=kids.every(c=>c.nodeType===3||c.tagName==='BR') && cs.display!=='inline';
      if (textOnly && handled.has(P)) continue;
      const k=P.getBoundingClientRect().width/(P.offsetWidth||1)||1;
      let ox,oy,W,H,mode;
      const pr=P.getBoundingClientRect();
      const fl=(v)=>parseFloat(v)||0;
      if (textOnly) { handled.add(P); mode='block';
        ox=pr.left+(fl(cs.borderLeftWidth)+fl(cs.paddingLeft))*k; oy=pr.top+(fl(cs.borderTopWidth)+fl(cs.paddingTop))*k;
        W=P.clientWidth-fl(cs.paddingLeft)-fl(cs.paddingRight); H=P.clientHeight-fl(cs.paddingTop)-fl(cs.paddingBottom);
      } else { mode='inline';
        const r=document.createRange(); r.selectNodeContents(t); const rr=r.getBoundingClientRect();
        const ch=r.getClientRects()[0].height/k; // content area of one line
        const lh=cs.lineHeight==='normal'?ch:fl(cs.lineHeight);
        ox=rr.left; oy=rr.top-(lh-ch)/2*k; W=rr.width/k; H=rr.height/k+(lh-ch);
      }
      const texts = textOnly ? [...P.childNodes].filter(c=>c.nodeType===3) : [t];
      const chars=[];
      for (const tn of texts) for (let i=0;i<tn.data.length;i++){ const ch=tn.data[i]; if(/\s/.test(ch)) continue;
        const r=document.createRange(); r.setStart(tn,i); r.setEnd(tn,i+1); const rc=r.getBoundingClientRect(); if(!rc.width) continue;
        const tcs=getComputedStyle(tn.parentElement);
        chars.push({ch,x:(rc.left-ox)/k,top:(rc.top-oy)/k,h:rc.height/k,w:+tcs.fontWeight,s:fl(tcs.fontSize)}); }
      const rid='r'+(id++);
      if (textOnly) P.setAttribute('data-cv',rid); else { const sp=document.createElement('span'); sp.setAttribute('data-cvi',rid); t.replaceWith(sp); sp.append(t); }
      runs.push({id:rid,mode,W:+W.toFixed(2),H:+H.toFixed(2),chars});
    }
  }
  return runs;
});
fs.writeFileSync(OUT+'/runs.json',JSON.stringify(runs));
console.log(runs.length, runs.reduce((a,r)=>a+r.chars.length,0), runs.filter(r=>r.mode==='inline').length);
await b.close();
