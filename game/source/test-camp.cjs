/* Age, scratch camp, XP and Pip helper rules. Run: node test-camp.cjs */
const M=require('./model.js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const DATA=JSON.parse(fs.readFileSync([path.join(__dirname,'..','..','data','donki-daily.json'),path.join(__dirname,'..','data','donki-daily.json')].find(fs.existsSync),'utf8'));
const week=i=>DATA.days.slice(i,i+5);

/* 1. Scratch camp: tools cannot be used before they are set up, and setup costs show up in the log. */
let s=M.initial(1,week(DATA.windows[0]));s.camp='scratch';s.setup={};
for(const [id,k] of [['plant','farm'],['air','air'],['clean','solar'],['send','comms']]){assert.match(M.reason(s,id),/Set up the/,id+' must need setup');assert.equal(M.needSetup(s,id),k);}
assert.equal(M.isBuilt(s,'farm'),false);assert.equal(M.isBuilt(s,'home'),true);
let r=M.apply(s,'setup:farm');assert.equal(r.ok,true);assert.equal(M.isBuilt(s,'farm'),true);
assert.equal(M.apply(s,'setup:farm').ok,false,'cannot set up twice');
assert.equal(M.apply(M.initial(1,week(DATA.windows[0])),'setup:farm').ok,false,'pre-camp has nothing to set up');
assert.equal(M.reason(s,'plant'),'','plant works after setup');

/* 2. A sensible player can still win from scratch (setups happen only when needed). */
function play(days,seed,age){const x=M.initial(seed,days);x.camp='scratch';x.age=age;x.setup={};
 const t=id=>{const k=M.needSetup(x,id);if(k&&M.reason(x,'setup:'+k)===''&&x.power>=M.desc('setup:'+k,x).cost.power)M.apply(x,'setup:'+k);return M.reason(x,id)===''&&M.apply(x,id).ok;};let g=0;
 while(!x.done&&g++<400){
  if(!x.shield)t('shield');
  if(!x.planted)t('plant');
  if(x.planted&&!x.harvested){if(x.growth>=2)t('harvest');else t('light');}
  if(x.air<=50)t('air');
  if(M.dirty(x)&&!x.cleaned&&x.power<4)t('clean');
  for(const rk of ['rock0','rock1','rock2','rock3']){if(x.samples.length>=3)break;if(!x.samples.includes(rk))t('scan:'+rk);}
  if(x.samples.length>=3&&!x.packet&&!x.delivered)t('send');
  if(x.packet)t('wait');
  const e=M.end(x,x.shield&&M.today(x).risk>=1);if(!e.ok)return {x,stuck:e.reason};}
 return {x};}
let w=0,n=0;for(const win of DATA.windows)for(const seed of [1,2,3]){n++;const o=play(week(win),seed,12);if(o.x.success)w++;}
console.log(`scratch-camp bot wins ${w}/${n}`);assert.ok(w/n>=0.95,'scratch camp must stay winnable');

/* 3. Younger players get easier bonus missions. */
const old=M.initial(1,week(DATA.windows[0])),kid=M.initial(1,week(DATA.windows[0]));old.age=13;kid.age=8;
for(const k of ['mapper','steady','colonist']){assert.notEqual(M.bonus(old).find(b=>b.id===k).text,M.bonus(kid).find(b=>b.id===k).text,k+' text differs by age');}
kid.modules={pad0:'solar',pad1:'garden'};old.modules={pad0:'solar',pad1:'garden'};
assert.equal(M.bonus(kid).find(b=>b.id==='colonist').done,true,'two modules finish it for under 10');
assert.equal(M.bonus(old).find(b=>b.id==='colonist').done,false,'older players need three');
assert.equal(M.young({age:9}),true);assert.equal(M.young({age:10}),false);assert.equal(M.young({age:null}),false);
assert.ok(M.bonus(kid).every(b=>b.xp>0)&&M.progress(kid).every(p=>p.xp>0&&p.key),'every mission carries a reward');

/* 4. Levels and wristbands. */
assert.equal(M.levelOf(0).level,1);assert.equal(M.levelOf(0).band.n,'Dust');assert.equal(M.levelOf(100).level,3);assert.equal(M.levelOf(100).band.n,'Copper');
assert.equal(M.levelOf(99999).level,10);assert.equal(M.levelOf(99999).band.n,'Aurora');assert.equal(M.levelOf(99999).next,null);
let prev=0;for(const L of M.LEVELS){assert.ok(L.xp>=prev);prev=L.xp;}
assert.ok(M.missionXP(kid,3)>M.missionXP(kid,1));

/* 5. Pip plan and advice. */
const p=M.initial(1,week(DATA.windows[0]));let plan=M.plan(p);assert.ok(plan.length>=2,'a plan exists');assert.equal(plan[0].id,'plant');
for(const st of plan){assert.ok(st.title&&st.why&&st.cost,'plan step is explained');}
let tp=p.power;for(const st of plan)tp-=st.cost.power;assert.ok(tp>=0,'plan fits power');
const sc=M.initial(1,week(DATA.windows[0]));sc.camp='scratch';sc.setup={};plan=M.plan(sc);assert.ok(plan.some(x=>x.id==='setup:farm')&&plan.findIndex(x=>x.id==='setup:farm')<plan.findIndex(x=>x.id==='plant'),'setup comes before use');
const st=M.initial(1,[{risk:0},{risk:2},{risk:0},{risk:0},{risk:0}].map(d=>({...d,ids:[]})));assert.match(M.advice(st,'build:pad0:solar'),/storm/i);
assert.equal(M.explainDay(st,true).word,'Calm');

console.log('PASS: camp, age, XP and Pip rules.');

/* 6. Difficulty changes the rules, and every level stays winnable for a sensible player. */
{const START={easy:{air:100,food:80,power:10},normal:{},hard:{air:75,food:45,power:7}};
 const base=M.initial(1,week(DATA.windows[0]));
 const mk=d=>{const x=M.initial(1,week(DATA.windows[0]));Object.assign(x,START[d]);x.difficulty=d;x.planted=false;x.shield=false;return x;};
 const e=mk('easy'),n=mk('normal'),h=mk('hard');
 assert.ok(M.desc('scan:rock0',e).cost.rad<=M.desc('scan:rock0',n).cost.rad&&M.desc('scan:rock0',n).cost.rad<=M.desc('scan:rock0',h).cost.rad,'radiation cost rises with difficulty');
 assert.ok(M.desc('scan:rock0',h).cost.rad>M.desc('scan:rock0',e).cost.rad,'hard really costs more Safety');
 assert.equal(M.advice(h,'scan:rock0'),'','hard has no Pip warnings');
 for(const d of ['easy','normal','hard']){let w2=0,n2=0;for(const win of DATA.windows)for(const seed of [1,2,3]){n2++;const x=M.initial(seed,week(win));Object.assign(x,START[d]);x.difficulty=d;x.camp='scratch';x.age=12;x.setup={};
   const t=id=>{const k=M.needSetup(x,id);if(k&&M.reason(x,'setup:'+k)===''&&x.power>=M.desc('setup:'+k,x).cost.power)M.apply(x,'setup:'+k);return M.reason(x,id)===''&&M.apply(x,id).ok;};let g=0;
   while(!x.done&&g++<400){if(!x.shield)t('shield');if(!x.planted)t('plant');if(x.planted&&!x.harvested){if(x.growth>=2)t('harvest');else t('light');}if(x.air<=50)t('air');if(M.dirty(x)&&!x.cleaned&&x.power<4)t('clean');
    for(const rk of ['rock0','rock1','rock2','rock3']){if(x.samples.length>=3)break;if(!x.samples.includes(rk))t('scan:'+rk);}if(x.samples.length>=3&&!x.packet&&!x.delivered)t('send');if(x.packet)t('wait');
    const r=M.end(x,x.shield&&M.today(x).risk>=1);if(!r.ok)break;}
   if(x.success)w2++;}
  console.log(`${d} bot wins ${w2}/${n2}`);assert.ok(w2/n2>=(d==='hard'?.85:.95),d+' must stay winnable');}
}
console.log('PASS: difficulty rules.');

/* 7. Guidance level is independent of age. */
assert.equal(M.young({age:12,guide:'full'}),true);assert.equal(M.young({age:8,guide:'light'}),false);assert.equal(M.young({age:8,guide:'auto'}),true);assert.equal(M.young({age:12,guide:'auto'}),false);
/* 8. Every hard-mode week is winnable by a player who uses the rover on risky days (the plain walker fails on 23 harsh weeks by design). */
{let w3=0,n3=0;for(const win of DATA.windows)for(const seed of [1,2,3]){n3++;const x=M.initial(seed,week(win));Object.assign(x,{air:75,food:45,power:7});x.difficulty='hard';x.camp='scratch';x.age=12;x.setup={};
 const t=id=>{const k=M.needSetup(x,id);if(k&&M.reason(x,'setup:'+k)===''&&x.power>=M.desc('setup:'+k,x).cost.power)M.apply(x,'setup:'+k);return M.reason(x,id)===''&&M.apply(x,id).ok;};let g=0;
 while(!x.done&&g++<400){if(!x.shield)t('shield');if(!x.planted)t('plant');if(x.planted&&!x.harvested){if(x.growth>=2)t('harvest');else t('light');}if(x.air<=50)t('air');if(M.dirty(x)&&!x.cleaned&&x.power<4)t('clean');
  for(const rk of (M.today(x).risk>0?['explore:ice','explore:lava','explore:river','rock0','rock1']:['rock0','rock1','rock2','rock3'])){if(x.samples.length>=3)break;if(rk.startsWith('explore')){const k=rk.split(':')[1];if(!x.explored[k])t(rk);}else if(!x.samples.includes(rk))t('scan:'+rk);}
  if(x.samples.length>=3&&!x.packet&&!x.delivered)t('send');if(x.packet)t('wait');const r=M.end(x,x.shield&&M.today(x).risk>=1);if(!r.ok)break;}
 if(x.success)w3++;}
 console.log('hard with rover bot wins '+w3+'/'+n3);assert.equal(w3,n3,'hard mode must be fully winnable with good play');}
console.log('PASS: guidance and hard-mode play.');

/* 9. Power score is split into generation, storage and reliability. */
{const mk=()=>{const x=M.initial(1,week(DATA.windows[0]));x.modules={};return x;},P=x=>M.powerParts(x);
 const sum=x=>M.score(x).parts.reduce((a,p)=>a+p.max,0);
 let a=mk();assert.equal(sum(a),100,'parts still add to 100');assert.equal(M.score(a).parts.filter(p=>['gen','store','rel'].includes(p.key)).length,3);
 /* a battery with nothing to charge it is worth nothing, and no longer equals a solar array */
 const bat=mk();bat.modules={pad0:'battery'};assert.equal(P(bat).store.pts,0);assert.equal(P(bat).gen.pts,0);
 const sol=mk();sol.modules={pad0:'solar'};assert.ok(P(sol).gen.pts>0&&P(sol).rel.pts>0,'solar earns generation and reliability');
 const both=mk();both.modules={pad0:'solar',pad1:'battery'};assert.equal(P(both).store.pts,4);
 assert.ok(M.score(sol).total>M.score(bat).total,'solar beats a lone battery bank');
 /* reliability: nuclear battery survives dust, a sandy-dune solar panel does not */
 const dune=mk();dune.modules={pad3:'solar'};const rtg=mk();rtg.modules={pad3:'rtg'};assert.equal(P(dune).worst,0);assert.equal(P(rtg).worst,2);assert.ok(P(rtg).rel.pts>P(dune).rel.pts);
 const mix=mk();mix.modules={pad0:'solar',pad2:'rtg'};assert.ok(P(mix).rel.pts>P(rtg).rel.pts,'two kinds of source adds reliability');
 for(const p of M.score(a).parts)assert.ok(p.why||p.tip,'every part is explained');
}
/* 10. Levels unlock things, and a level-1 commander can still win. */
{assert.equal(M.lvl({}),99,'no level means everything is open (tests, old saves)');
 const x=M.initial(1,week(DATA.windows[0]));x.level=1;
 assert.equal(M.reason(x,'build:pad0:solar'),'' );assert.match(M.reason(x,'build:pad1:battery'),/Level 2/);assert.match(M.reason(x,'build:pad1:rtg'),/Level 8/);assert.match(M.reason(x,'explore:lava'),/Level 5/);
 x.level=8;assert.equal(M.reason(x,'build:pad1:rtg'),'');assert.equal(M.apply(x,'build:pad1:rtg').ok,true);
 const lv=M.levelOf(1100).level;assert.equal(lv,10);for(const [k,n] of Object.entries(M.UNLOCK.modules))assert.ok(n>=1&&n<=lv,k+' unlock reachable');
 for(const n of Object.values(M.UNLOCK.sites))assert.ok(n<=lv);
 const adv=M.bonus(x).filter(b=>b.adv);assert.equal(adv.length,3);assert.ok(adv.every(b=>b.xp>0&&b.text));
 const y=M.initial(1,week(DATA.windows[0]));y.level=1;assert.ok(M.bonus(y).filter(b=>b.adv).every(b=>b.locked&&!b.done),'expert missions locked at level 1');
 assert.ok(M.unlocksAt(2).length&&M.unlocksAt(9).length&&M.unlocksAt(10).length,'each reward level says what it unlocks');
 /* level-1 commanders: walking bot on every week, only level-1 tools */
 let w1=0,n1=0;for(const win of DATA.windows)for(const seed of [1,2,3]){n1++;const s=M.initial(seed,week(win));s.level=1;s.camp='scratch';s.age=12;s.setup={};
  const t=id=>{const k=M.needSetup(s,id);if(k&&M.reason(s,'setup:'+k)===''&&s.power>=M.desc('setup:'+k,s).cost.power)M.apply(s,'setup:'+k);return M.reason(s,id)===''&&M.apply(s,id).ok;};let g=0;
  while(!s.done&&g++<400){if(!s.shield)t('shield');if(!s.planted)t('plant');if(s.planted&&!s.harvested){if(s.growth>=2)t('harvest');else t('light');}if(s.air<=50)t('air');if(M.dirty(s)&&!s.cleaned&&s.power<4)t('clean');
   for(const rk of ['rock0','rock1','rock2','rock3']){if(s.samples.length>=3)break;if(!s.samples.includes(rk))t('scan:'+rk);}if(s.samples.length>=3&&!s.packet&&!s.delivered)t('send');if(s.packet)t('wait');const r=M.end(s,s.shield&&M.today(s).risk>=1);if(!r.ok)break;}
  if(s.success)w1++;}
 console.log('level-1 bot wins '+w1+'/'+n1);assert.ok(w1/n1>=.95,'a brand-new commander must be able to win');}
console.log('PASS: split power score and level unlocks.');

/* 11. Expert missions can really be earned (a scripted player reaches them), so Level 9 and 10 are worth chasing. */
{const run=(list,hard)=>{let gm=0,leg=0,sc=0,n=0;for(const win of DATA.windows){n++;const x=M.initial(3,week(win));if(hard)Object.assign(x,{air:75,food:45,power:7});x.difficulty=hard?'hard':'normal';x.camp='scratch';x.age=12;x.setup={};x.level=10;
  const t=id=>{const k=M.needSetup(x,id);if(k&&M.reason(x,'setup:'+k)===''&&x.power>=M.desc('setup:'+k,x).cost.power)M.apply(x,'setup:'+k);return M.reason(x,id)===''&&M.apply(x,id).ok;};let g=0;
  while(!x.done&&g++<400){if(!x.shield)t('shield');if(!x.planted)t('plant');if(x.planted&&!x.harvested){if(x.growth>=2)t('harvest');else t('light');}if(x.shield&&x.power>=7)for(const b of list)t(b);if(x.air<=50)t('air');if(M.dirty(x)&&!x.cleaned&&x.power<4)t('clean');
   for(const rk of (M.today(x).risk>0?['explore:ice','explore:lava','explore:river','rock0']:['rock0','rock1','rock2'])){if(x.samples.length>=3)break;if(rk.startsWith('explore')){const k=rk.split(':')[1];if(!x.explored[k])t(rk);}else if(!x.samples.includes(rk))t('scan:'+rk);}
   if(x.samples.length>=3&&!x.packet&&!x.delivered)t('send');if(x.packet)t('wait');const r=M.end(x,x.shield&&M.today(x).risk>=1);if(!r.ok)break;}
  const b=M.bonus(x);if(b.find(q=>q.id==='gridmaster').done)gm++;if(b.find(q=>q.id==='legend').done)leg++;if(b.find(q=>q.id==='stormchaser').done)sc++;}return {gm,leg,sc,n};};
 const A=run(['build:pad0:solar','build:pad1:solar','build:pad2:battery','build:pad3:rtg'],true),B=run(['build:pad0:solar','build:pad3:rtg','build:pad1:garden','build:pad2:recycler'],true);
 console.log('expert missions reached by scripted players',A,B);assert.ok(A.gm>=A.n*.4,'Grid master is earnable');assert.ok(B.leg>=1,'Legend challenge is earnable on Hard');assert.ok(A.sc+B.sc>=1,'Storm chaser is earnable');}
console.log('PASS: expert missions are reachable.');

/* 12. Live-week easing keeps NASA's original level and says so. */
{globalThis.DONKI_DAILY=DATA;const SW=require('./spaceweather.js');const mk=r=>({date:'2025-01-0'+(r+1),risk:r,flare:r===2?'X1.0':null,sep:false,kp:0,cmeSpeed:0,ids:[]});
 const out=SW.soften([2,2,0,2,2].map(mk).map((d,i)=>({...d,date:'2025-01-0'+(i+1)})));
 assert.equal(out[0].risk,1);assert.equal(out[0].softened,true);assert.equal(out[0].was,2,'original level kept');assert.equal(out[1].risk,2,'a lone storm after a calm day is left alone');
 assert.equal(out[3].risk,2);assert.equal(out[4].risk,1);assert.equal(out[4].was,2);
 const W=SW.archiveWindow(5);assert.ok(W.curated&&W.fetched&&W.days.length===5&&W.days.every(d=>!d.softened),'archive weeks are curated, not eased');}
console.log('PASS: easing is recorded.');

// 13. Honest alert costs: a choice that looks free must say so only if it truly changes nothing bad.
{const M2=require('./model.js');let bad=[];
 for(const id of Object.keys(M2.ALERTS||{})){const A=M2.ALERTS[id];A.choices.forEach((c,i)=>{const z=!c.cost.power&&!c.cost.air&&!c.cost.time&&!c.cost.rad;if(!z)return;
  const s=M2.initial(1,[{risk:0},{risk:0},{risk:0},{risk:0},{risk:0}]);s.power=10;s.air=80;s.rad=80;s.minutes=10;s.packet=null;const b={p:s.power,a:s.air,r:s.rad};try{c.run(s);}catch(e){}
  const loses=s.power<b.p||s.air<b.a||s.rad<b.r||s.commsDown;if(loses&&!c.note)bad.push(id+':'+c.label);});}
 assert.deepEqual(bad,[],'free-looking alert choices with a hidden cost must carry a note: '+bad.join(' | '));console.log('PASS: no alert choice hides a cost behind "No cost".');}

/* 14. Real choices: garden size and wall thickness change cost AND outcome. */
{const mk=()=>{const x=M.initial(1,[{risk:1},{risk:1},{risk:2},{risk:0},{risk:0}]);x.camp='pre';x.power=12;x.air=90;x.rad=100;return x;};
 const by={};for(const n of [2,3,4]){const x=mk();x.pick={trays:n};const c=M.desc('plant',x).cost.power;const r=M.apply(x,'plant');assert.ok(r.ok,'plant '+n);assert.equal(x.trays,n);x.growth=2;const f=M.desc('harvest',x).gain.food;by[n]={c,f,lamp:M.lampCost(x,n)};}
 assert.equal(by[3].f,30,'default garden is unchanged');assert.ok(by[2].c<by[3].c&&by[3].c<by[4].c&&by[2].f<by[3].f&&by[3].f<by[4].f&&by[4].lamp>by[3].lamp,'more trays: more power and more food');
 const trip={};for(const b of [4,6,8]){const x=mk();x.pick={bags:b};const c=M.desc('shield',x).cost.power;assert.ok(M.apply(x,'shield').ok);trip[b]={c,r:M.radCost(x,'scan:rock0')};}
 assert.ok(trip[4].c<trip[6].c&&trip[6].c<trip[8].c,'thicker wall costs more power');assert.ok(trip[4].r>trip[6].r&&trip[6].r>trip[8].r,'thicker wall saves more Safety');
 const d=mk();assert.ok(M.apply(d,'shield').ok);assert.equal(d.shieldK,.5,'default wall behaves as before');
 const pv=M.shieldPreview(mk(),8);assert.ok(pv.bare>pv.trip&&pv.block===65,'preview numbers are honest');console.log('PASS: garden and wall choices change cost and outcome.');}
