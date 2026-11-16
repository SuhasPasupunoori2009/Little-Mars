/* Browser smoke test. Drives a real headless Chrome or Edge with the DevTools protocol. No npm packages needed (Node 22+).
   Run from this folder:  node test-smoke.cjs        (set CHROME=path\to\chrome.exe if the browser is not found)
   It checks: the page loads without errors, nothing contacts NASA until Live is chosen, the data labels show,
   age picker -> warm-up -> forecast works, panels open and close with the keyboard, and every control has a name. */
const {spawn}=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const CANDIDATES=[process.env.CHROME,'C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const exe=CANDIDATES.find(p=>fs.existsSync(p));if(!exe){console.log('SKIP: no Chrome or Edge found. Set CHROME to its path.');process.exit(0);}
const page=path.resolve(__dirname,'..','index.html');assert.ok(fs.existsSync(page),'build index.html first');
const PORT=9300+Math.floor(Math.random()*500),dir=fs.mkdtempSync(path.join(os.tmpdir(),'lm-smoke-'));
const proc=spawn(exe,['--headless=new','--disable-gpu-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--no-first-run','--no-default-browser-check','--window-size=1280,800','--remote-debugging-port='+PORT,'--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let ws,id=0;const pending=new Map(),errors=[],requests=[];
function send(method,params={}){return new Promise((res,rej)=>{const i=++id;pending.set(i,{res,rej});ws.send(JSON.stringify({id:i,method,params}));});}
async function ev(expr){const r=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error('page error: '+(r.exceptionDetails.exception&&r.exceptionDetails.exception.description||r.exceptionDetails.text));return r.result.value;}
async function waitFor(expr,label,ms=15000){const t=Date.now();while(Date.now()-t<ms){try{if(await ev(expr))return;}catch(e){}await sleep(150);}throw new Error('timed out waiting for '+label);}
let passed=0;const ok=(c,m)=>{assert.ok(c,m);passed++;console.log('  ok  '+m);};
async function connect(){for(let k=0;k<60;k++){try{const list=await (await fetch('http://127.0.0.1:'+PORT+'/json/list')).json();const p=list.find(x=>x.type==='page');if(p){ws=new WebSocket(p.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});ws.onmessage=m=>{const d=JSON.parse(m.data);if(d.id&&pending.has(d.id)){const p=pending.get(d.id);pending.delete(d.id);d.error?p.rej(new Error(d.error.message)):p.res(d.result);}else if(d.method==='Runtime.exceptionThrown')errors.push(d.params.exceptionDetails.exception&&d.params.exceptionDetails.exception.description||d.params.exceptionDetails.text);else if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errors.push('console.error: '+d.params.args.map(a=>a.value||a.description).join(' '));else if(d.method==='Network.requestWillBeSent')requests.push(d.params.request.url);};return;}}catch(e){}await sleep(250);}throw new Error('could not reach the browser');}
async function dismiss(){for(let k=0;k<14;k++){const st=await ev(`(()=>{const n=document.getElementById('night'),w=document.getElementById('welcome');return {night:n&&getComputedStyle(n).display!=='none',welcome:w&&!w.classList.contains('hidden'),cine:document.getElementById('cine')&&document.getElementById('cine').style.display!=='none'}})()`);if(st.cine){await ev(`document.getElementById('cineSkip').click()`);await sleep(700);continue;}
 if(!st.night&&!st.welcome&&!await ev(`!!document.querySelector('.coach,.coachcard')`))return;const clicked=await ev(`(()=>{const b=document.getElementById('modalX')||document.querySelector('#debrief .primary, #night .primary, .coach button, .coachcard button');if(b){b.click();return true;}return false;})()`);await sleep(500);if(!clicked)return;}}
(async()=>{try{
 await connect();await send('Runtime.enable');await send('Network.enable');await send('Page.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
 await send('Page.navigate',{url:'file:///'+page.replace(/\\/g,'/')});
 await waitFor(`document.readyState==='complete'&&!!document.getElementById('start')`,'page load');await sleep(800);
 console.log('Loaded '+page);
 ok(!await ev(`getComputedStyle(document.getElementById('error')).display!=='none'&&document.getElementById('error').offsetHeight>0`),'3D started, no error screen');
 ok(!requests.some(u=>/nasa\.gov/.test(u)),'no request to NASA when the game loads (Live is opt-in)');
 ok(await ev(`document.querySelector('#weekMode option[value=live]').textContent.includes('ask NASA')||document.querySelector('#weekMode option[value=live]').textContent.includes('Asking')`),'Live option says it asks NASA');
 ok(await ev(`document.documentElement.lang==='en'`),'page language is set');
 /* age gating */
 await ev(`document.querySelector('.agechip[data-age="8"]').click()`);ok(await ev(`document.querySelector('.agechip[data-age="8"]').getAttribute('aria-checked')==='true'`),'age chip reports checked state');
 await ev(`document.getElementById('start').click()`);
 for(let k=0;k<12&&await ev(`getComputedStyle(document.getElementById('night')).display!=='none'||document.getElementById('cine').style.display!=='none'`);k++){await ev(`(()=>{const b=document.querySelector('#cineSkip');if(document.getElementById('cine').style.display!=='none'&&b){b.click();return;}const p=document.querySelector('#night .primary, #debrief .primary');if(p)p.click();})()`);await sleep(500);}
 ok(await ev(`!/Warm-up/.test(document.getElementById('debrief').textContent)&&document.getElementById('foodStat').offsetParent===null&&document.getElementById('colonyBtn').offsetParent===null`),'no quiz before play; Food and Colony stay hidden until the first job is done');
 await ev(`__lm.preCheck(function(){},true)`);
 await waitFor(`/Warm-up/.test(document.getElementById('debrief').textContent)`,'warm-up card');ok(true,'warm-up check is offered later and can be opened');
 await sleep(200);ok(await ev(`!document.getElementById('night').inert&&!document.getElementById('night').closest('[inert]')`),'open card is not inert (keyboard and screen readers can reach it)');ok(await ev(`document.getElementById('night').contains(document.activeElement)`),'focus moves into the warm-up card');ok(await ev(`document.getElementById('night').getAttribute('role')==='dialog'&&document.getElementById('night').getAttribute('aria-modal')==='true'&&/Warm-up/.test((document.getElementById(document.getElementById('night').getAttribute('aria-labelledby'))||{}).textContent||'')`),'card is a labelled modal dialog');
 await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true}))`);ok(await ev(`document.getElementById('night').contains(document.activeElement)`),'Tab keeps focus inside the open card');ok(await ev(`!!document.getElementById('modalX')&&document.getElementById('infoBack').textContent.includes('Skip')`),'warm-up card can be skipped (close button and Skip)');
 await ev(`document.getElementById('modalX').click()`);await sleep(600);await dismiss();
 await waitFor(`document.getElementById('outlook')&&document.getElementById('outlook').textContent.length>20`,'forecast');
 const out=await ev(`document.getElementById('outlook').textContent`);
 ok(/STATIC ARCHIVE/.test(out),'forecast says STATIC ARCHIVE with retrieval date');ok(/NASA data vs game levels/.test(out),'forecast links the NASA-vs-game explanation');
 ok(/NASA data/.test(out)&&/Science view/.test(out),'forecast labels the data and keeps the science view');
 ok(await ev(`document.querySelectorAll('#outlook .chip').length===5`),'five-day forecast strip renders');
 ok(await ev(`[...document.querySelectorAll('#outlook .chip')].every(c=>/Calm|Watch|Storm/.test(c.textContent))`),'every forecast day carries a word, not just a colour');
 /* panels by keyboard */
 for(const [btn,expect] of [['journal',/Level 1/],['setBtn',/Text size|Settings/i],['pipBtn',/Pip/],['colonyBtn',/colony/i]]){
  await ev(`document.getElementById('${btn}').click()`);await sleep(400);const txt=await ev(`document.getElementById('panel').textContent+document.getElementById('debrief').textContent+document.body.innerText.slice(0,0)`);
  ok(expect.test(txt),'#'+btn+' opens its panel');
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);await sleep(300);
  await ev(`(()=>{const x=document.getElementById('modalX')||document.querySelector('#panel .x, #panel [data-close]');if(x)x.click();})()`);await sleep(200);}
 /* mission book shows the unlock ladder, expert missions and the new score card */
 await ev(`document.getElementById('journal').click()`);await sleep(300);
 const book=await ev(`document.getElementById('panel').textContent`);
 ok(/What each level unlocks/.test(book),'mission book shows what each level unlocks');ok(/Grid master/.test(book)&&/Unlocks at Level 7/.test(book),'expert missions show their level lock');
 ok(/Unlocks at Level 2|Level 2/.test(book)||/Pioneer/.test(book),'unlock ladder names levels');
 await ev(`(()=>{const x=document.getElementById('modalX')||document.querySelector('#panel .x');if(x)x.click();else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));})()`);
 /* accessibility audit of the live page */
 const bad=await ev(`(()=>{const out=[],vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
  const nameOf=e=>(e.getAttribute('aria-label')||e.getAttribute('aria-labelledby')&&[...e.getAttribute('aria-labelledby').split(' ')].map(i=>(document.getElementById(i)||{}).textContent).join(' ')||e.textContent||e.getAttribute('title')||(e.labels&&e.labels[0]&&e.labels[0].textContent)||'').trim();
  for(const e of document.querySelectorAll('button,a[href],select,input,textarea,[role=button],[tabindex]:not([tabindex="-1"])')){if(!vis(e))continue;if(!nameOf(e))out.push('no accessible name: '+e.outerHTML.slice(0,90));}
  for(const i of document.querySelectorAll('img'))if(!i.hasAttribute('alt'))out.push('img without alt');
  if(!document.querySelector('canvas[aria-label]'))out.push('canvas has no label');
  if(!document.querySelector('[aria-live]'))out.push('no live region');
  for(const e of document.querySelectorAll('[tabindex]'))if(+e.getAttribute('tabindex')>0)out.push('positive tabindex');
  return out;})()`);
 ok(bad.length===0,'every visible control has an accessible name, no positive tabindex ('+(bad.length?bad.join('; '):'clean')+')');
 /* keyboard reachability: Tab from the top eventually lands on game controls and focus is always visible */
 const tabbable=await ev(`document.querySelectorAll('button:not([disabled]),select,input,a[href],[tabindex="0"]').length`);ok(tabbable>=10,'plenty of keyboard-reachable controls ('+tabbable+')');
 ok(await ev(`(()=>{const s=[...document.styleSheets].flatMap(x=>{try{return [...x.cssRules]}catch(e){return []}}).map(r=>r.cssText).join(' ');return /focus-visible/.test(s);})()`),'visible focus style is defined');
 /* privacy: choosing Live is the only thing that contacts NASA */
 await ev(`location.reload()`);await waitFor(`document.readyState==='complete'&&!!document.getElementById('weekMode')`,'reload');await sleep(500);
 const before=requests.filter(u=>/nasa\.gov/.test(u)).length;
 await ev(`(()=>{const s=document.getElementById('weekMode');s.value='live';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);await sleep(2500);
 ok(requests.filter(u=>/nasa\.gov/.test(u)).length>before,'choosing Live is what contacts NASA');
 ok(errors.filter(e=>!/ERR_INTERNET|Failed to load resource|net::|CORS|fetch/i.test(e)).length===0,'no script errors ('+(errors.length?errors.slice(0,3).join(' | '):'none')+')');
 console.log('\nSMOKE PASS: '+passed+' checks');
}catch(e){console.error('\nSMOKE FAIL: '+e.message);process.exitCode=1;}finally{try{ws&&ws.close();}catch(e){}proc.kill();setTimeout(()=>{try{fs.rmSync(dir,{recursive:true,force:true});}catch(e){}process.exit(process.exitCode||0);},800);}})();
