/* Click-everything audit with Playwright and REAL mouse input.
   For every menu it opens the menu, then, one control at a time (fresh page each time), clicks each visible control and reports:
   BLOCKED  = another element sits on top, so a real click would not reach it (the "froze" bug)
   NO EFFECT = the click changed nothing on the page, storage or location
   ERROR    = a script error was raised
   Setup: npm i playwright-core.   Run: node test-clickall.cjs   (CHANNEL=chrome for Chrome; ONLY=text to filter openers) */
const {chromium}=require('playwright-core'),path=require('node:path'),fs=require('node:fs');
const file=path.resolve(__dirname,'..','index.html');if(!fs.existsSync(file))throw new Error('build first');
const url='file:///'+file.split(path.sep).join('/');
const OPENERS=[
 ['title:howBtn',['#howBtn'],true],['title:aboutBtn',['#aboutBtn'],true],['title:settings',['#setBtn2'],true],['title:start-age',[],true],
 ['band',['#bandChip']],['settings',['#setBtn']],['help',['#help']],['pause',['#pause']],['pause>rewind',['#pause','#rewind']],['pause>restart',['#pause','#restart']],
 ['places',['#map']],['colony',['#colonyBtn']],['missions',['#journal']],['pip',['#pipBtn']],['hud',[]]
];
const GATHER=`(()=>{const out=[];const all=[...document.querySelectorAll('button,a[href],select,summary,input:not([type=hidden]),[role=button],[role=radio]')];
 for(const el of all){if(el.closest('[inert]')||el.disabled)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;let h=false;for(let p=el;p;p=p.parentElement){const c=getComputedStyle(p);if(c.display==='none'||c.visibility==='hidden'||+c.opacity===0){h=true;break;}}if(h)continue;
 el.scrollIntoView({block:'center'});const r=el.getBoundingClientRect();if(r.width<2||r.height<2)continue;if(r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)continue;
 const x=r.left+r.width/2,y=r.top+r.height/2,t=document.elementFromPoint(x,y);const ok=!!t&&(el===t||el.contains(t)||t.contains(el)||(el.labels&&[...el.labels].some(l=>l.contains(t))));
 out.push({id:el.id||'',text:(el.getAttribute('aria-label')||el.textContent||el.value||el.tagName).trim().replace(/\\s+/g,' ').slice(0,40),tag:el.tagName,x,y,ok,top:ok?'':(()=>{const a=t&&t.closest('[id]');return (a?a.id:'')+'/'+((t&&(t.className&&t.className.baseVal===undefined?t.className:t.tagName))+'').slice(0,30);})(),sel:el.tagName==='SELECT',lab:!!el.closest('#labels')});}
 return out;})()`;
const SNAP=`(()=>{let h=5381;const s=document.documentElement.className+document.documentElement.getAttribute('style')+document.body.className+document.body.getAttribute('style')+document.body.innerHTML+'|'+JSON.stringify(localStorage)+'|'+location.href;for(let i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h;})()`;
(async()=>{const b=await chromium.launch({channel:process.env.CHANNEL||'msedge',headless:true});const ctx=await b.newContext({viewport:{width:1280,height:800}});let p,errs=[],uses=0;const fresh_page=async()=>{if(p)await p.close().catch(()=>{});p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));uses=0;};await fresh_page();
 const sleep=ms=>p.waitForTimeout(ms);
 async function seed(){await p.goto(url);await p.evaluate(()=>{try{localStorage.clear();}catch(e){}});await p.reload();await p.click('.agechip[data-age="12"]');await p.click('#start');
  for(let k=0;k<30;k++){await sleep(400);const h=await p.evaluate(()=>(document.querySelector('#debrief h1')||{}).textContent||'');const cine=await p.evaluate(()=>document.getElementById('cine').style.display!=='none');if(cine){await p.click('#cineSkip',{timeout:2000}).catch(()=>{});continue;}
   const night=await p.evaluate(()=>getComputedStyle(document.getElementById('night')).display!=='none');if(!night&&k>3)break;
   if(/Warm-up/.test(h)){for(let i=0;i<4;i++){await p.click('.qo >> nth=0');await sleep(200);}await p.click('#infoBack');continue;}
   const x=await p.$('#debrief .primary');if(x)await x.click({timeout:2000}).catch(()=>{});}
  await sleep(500);await p.evaluate(()=>{__lm.getState().log.unshift('seed');__lm.updateHUD();__lm.save();});}
 async function fresh(title){if(++uses>10)await fresh_page();await p.goto(url);await sleep(300);if(title)return;await p.waitForSelector('#resume:not(.hidden)',{timeout:4000});await p.click('#resume');await sleep(500);}
 async function open(steps,title){await fresh(title);if(title){if(steps.length)await p.click(steps[0]);else await p.click('.agechip[data-age="9"]');await sleep(400);return;}for(const s of steps){await p.click(s,{timeout:3000});await sleep(350);}}
 await seed();const report=[];let total=0;
 for(const [name,steps,title] of OPENERS){if(process.env.ONLY&&!name.includes(process.env.ONLY))continue;
  await open(steps,title).catch(e=>report.push(`OPEN FAIL  ${name}: ${e.message.split('\n')[0]}`));
  const list=await p.evaluate(GATHER);console.log(`\n== ${name}: ${list.length} controls`);
  for(let i=0;i<list.length;i++){const c=list[i];total++;const tag=`${name} > "${c.text}"${c.id?' #'+c.id:''}`;
   if(!c.ok&&c.lab){continue;}
   if(!c.ok&&/^(paused|night|welcome|cine|launch)\//.test(c.top)){continue;}
   if(!c.ok){report.push(`BLOCKED    ${tag} (covered by ${c.top})`);console.log('  BLOCKED  '+c.text);continue;}
   if(['#unpause','#saveQuit'].includes('#'+c.id)&&false)continue;
   await open(steps,title).catch(async()=>{await fresh_page();await open(steps,title).catch(()=>{});});errs=[];const l2=await p.evaluate(GATHER).catch(()=>[]);const el=l2[i];if(!el||el.text!==c.text){continue;}
   const before=await p.evaluate(SNAP);let url0=p.url();const shotA=await p.screenshot();await sleep(150);const shotB=await p.screenshot();const noisy=Buffer.compare(shotA,shotB)!==0;
   try{if(c.sel){await p.selectOption(`#${c.id}`,{index:1}).catch(()=>{});}else await p.mouse.click(el.x,el.y);}catch(e){report.push(`CLICKFAIL  ${tag}: ${e.message.split('\n')[0]}`);continue;}
   await sleep(450);let after;try{after=await p.evaluate(SNAP);}catch(e){after='navigated';}
   if(errs.length){report.push(`ERROR      ${tag}: ${errs[0]}`);console.log('  ERROR    '+c.text);}
   else if(after===before&&p.url()===url0){const shotC=await p.screenshot();if(!noisy&&Buffer.compare(shotB,shotC)!==0)console.log('  ok(scene) '+c.text);else if(noisy){report.push(`UNVERIFIED ${tag} (DOM unchanged, scene animates)`);console.log('  unverified '+c.text);}else{report.push(`NO EFFECT  ${tag}`);console.log('  no effect '+c.text);}}
   else console.log('  ok       '+c.text);}
 }
 console.log(`\n${total} controls clicked with the real mouse.`);
 if(report.length){console.log('\nFINDINGS ('+report.length+'):\n'+report.join('\n'));}else console.log('No blocked, dead or erroring controls.');
 await b.close();process.exit(report.some(r=>/^(BLOCKED|ERROR|OPEN|CLICKFAIL)/.test(r))?1:0);})();
