/* Real-mouse test of the interactive chores: choose garden size, build and test a wall, solve a hidden pipe puzzle. Run: node test-chores.cjs */
const {chromium}=require('playwright-core'),path=require('node:path');
const url='file:///'+path.resolve(__dirname,'..','index.html').split(path.sep).join('/');let bad=0;const ok=(c,m)=>{console.log((c?'  ok  ':'  FAIL ')+m);if(!c)bad++;};
(async()=>{const b=await chromium.launch({channel:process.env.CHANNEL||'msedge',headless:true}),p=await (await b.newContext({viewport:{width:1280,height:800}})).newPage(),errs=[];p.on('pageerror',e=>errs.push(e.message));
 const sl=ms=>p.waitForTimeout(ms);await p.goto(url);await p.evaluate(()=>localStorage.clear());await p.reload();await p.click('.agechip[data-age="8"]');await p.click('#start');
 for(let k=0;k<25&&await p.evaluate(()=>getComputedStyle(document.getElementById('night')).display!=='none'||document.getElementById('cine').style.display!=='none');k++){await sl(500);if(await p.evaluate(()=>document.getElementById('cine').style.display!=='none'))await p.click('#cineSkip').catch(()=>{});else{const x=await p.$('#debrief .primary');if(x)await x.click().catch(()=>{});}}
 await p.evaluate(()=>{const s=__lm.getState();s.power=12;s.air=90;});
 await p.evaluate(()=>__lm.startAction('plant'));await sl(300);
 ok(await p.locator('.choice').count()===3,'plant: three garden sizes to choose from');
 ok(await p.isDisabled('#finishTask'),'plant: cannot finish before choosing');
 await p.locator('.choice').nth(0).click();await sl(200);ok(await p.locator('.tile').count()===2,'plant: two trays after choosing 2');
 await p.click('#tileAll');await sl(200);await p.click('#finishTask');await sl(300);ok(await p.evaluate(()=>__lm.getState().trays)===2,'plant: choice is applied to the game');
 await p.evaluate(()=>__lm.startAction('shield'));await sl(300);
 ok(/Blocks about \d+%/.test(await p.locator('.choice').nth(2).textContent()),'shield: each thickness shows what it blocks before you pick');
 await p.locator('.choice').nth(2).click();await sl(200);ok(await p.locator('.tile').count()===8,'shield: eight bags after choosing the thick wall');
 await p.click('#tileAll');await sl(200);ok(await p.isDisabled('#finishTask'),'shield: must test the wall before finishing');
 await p.click('#testWall');await sl(2600);ok(await p.locator('.beam.done').count()===1&&await p.isEnabled('#finishTask'),'shield: particle test runs and shows the result');
 await p.click('#finishTask');await sl(300);ok(await p.evaluate(()=>__lm.getState().shieldK)===.35,'shield: thick wall is applied');
 await p.evaluate(()=>__lm.startAction('air'));await sl(300);
 for(let r=0;r<2;r++){const t=await p.evaluate(()=>__lm.mini().target);ok(await p.isDisabled('#finishTask'),'pipes: puzzle starts unsolved');for(let i=0;i<4;i++){const cur=await p.evaluate(j=>__lm.mini().pipe[j],i);if(cur!==t[i]){await p.click(`[data-pipe="${i}"]`);await sl(80);}}break;}
 ok(await p.isEnabled('#finishTask'),'pipes: solving the hidden pattern unlocks Finish');
 await p.click('#finishTask');await sl(300);
 await p.evaluate(()=>{const s=__lm.getState();s.growth=2;s.power=12;});await p.evaluate(()=>__lm.startAction('harvest'));await sl(300);
 ok(await p.locator('.guess .secondary').count()===3,'harvest: three guesses to choose from');
 await p.locator('.guess .secondary').nth(0).click();await sl(150);await p.click('#tileAll');await sl(150);await p.click('#finishTask');await sl(400);
 ok(/guess/i.test(await p.evaluate(()=>document.getElementById('radio').textContent+document.getElementById('toast').textContent)),'harvest: you are told how your guess compared');
 ok(errs.length===0,'no script errors '+errs.join(';'));await b.close();console.log(bad?'\nCHORES FAIL':'\nCHORES PASS');process.exit(bad?1:0);})();
