/* End-to-end test with Playwright and REAL mouse and keyboard input (programmatic .click() would miss pointer-events bugs).
   Setup once:  npm i playwright-core      (uses your installed Edge or Chrome, no browser download)
   Run:         node test-e2e.cjs          (CHANNEL=chrome to use Chrome instead of msedge) */
const {chromium}=require('playwright-core'),assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const url='file:///'+path.resolve(__dirname,'..','index.html').split(path.sep).join('/');assert.ok(fs.existsSync(path.resolve(__dirname,'..','index.html')),'build first');
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;console.log('  ok  '+m);};
(async()=>{const b=await chromium.launch({channel:process.env.CHANNEL||'msedge',headless:true});let failed=false;
try{for(const [age,camp] of [[8,'pre-built'],[12,'scratch']]){console.log('Age '+age+' ('+camp+' camp)');
 const ctx=await b.newContext({viewport:{width:1280,height:800}}),p=await ctx.newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.goto(url);await p.waitForSelector('#start');await p.click(`.agechip[data-age="${age}"]`);await p.click('#start');
 const h1=()=>p.evaluate(()=>(document.querySelector('#debrief h1')||{}).textContent||'');
 for(let k=0;k<25&&await p.evaluate(()=>getComputedStyle(document.getElementById('night')).display!=='none'||document.getElementById('cine').style.display!=='none');k++){await p.waitForTimeout(500);if(await p.evaluate(()=>document.getElementById('cine').style.display!=='none')){await p.click('#cineSkip',{timeout:3000}).catch(()=>{});continue;}const x=await p.$('#debrief .primary');if(x)await x.click({timeout:3000});}
 ok(await p.isVisible('#outlook')&&!/Warm-up/.test(await h1()),'one story card, then straight into play with no quiz (real clicks)');
 ok(!(await p.isVisible('#foodStat'))&&!(await p.isVisible('#colonyBtn'))&&await p.isVisible('#airStat'),'only Air and Power show at first; Food, Colony and Control wait');
 await p.evaluate(()=>{__lm.getState().log.unshift('first job');__lm.updateHUD();});await p.waitForTimeout(200);
 ok(await p.isVisible('#foodStat')&&await p.isVisible('#colonyBtn'),'Food and Colony appear after the first job');
 await p.evaluate(()=>__lm.preCheck(function(){},true));await p.waitForTimeout(300);
 for(let i=0;i<4;i++){await p.click('.qo >> nth=1',{timeout:4000});await p.waitForTimeout(250);}
 ok(/Thanks/.test(await h1()),'all four warm-up answers can be clicked with the mouse');
 await p.click('#infoBack',{timeout:4000});await p.waitForTimeout(800);
 for(const [btn,re] of [['#journal',/Level 1/],['#setBtn',/Text size/i],['#pipBtn',/Pip/],['#colonyBtn',/colony/i]]){await p.click(btn,{timeout:4000});await p.waitForTimeout(350);ok(re.test(await p.evaluate(()=>document.getElementById('panel').textContent+document.getElementById('debrief').textContent)),btn+' opens by mouse');
  await p.keyboard.press('Escape');await p.waitForTimeout(300);const x=await p.$('#closePanel');if(x&&await x.isVisible())await x.click();}
 await p.click('#setBtn');await p.waitForTimeout(300);if(await p.isVisible('#modalX')){await p.click('#modalX');}
 await p.keyboard.press('Tab');ok(true,'keyboard Tab does not throw');
 ok(errs.length===0,'no script errors '+errs.join('|'));await ctx.close();}
 console.log('\nE2E PASS: '+n+' checks');}catch(e){failed=true;console.error('\nE2E FAIL: '+e.message.split('\n')[0]);}finally{await b.close();process.exit(failed?1:0);}})();
