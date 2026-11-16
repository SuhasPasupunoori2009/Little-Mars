const M=require('./model.js'),SW=require('./spaceweather.js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const DATA=JSON.parse(fs.readFileSync([path.join(__dirname,'..','..','data','donki-daily.json'),path.join(__dirname,'..','data','donki-daily.json')].find(fs.existsSync),'utf8'));
global.DONKI_DAILY=DATA;
function act(s,id){const r=M.apply(s,id);assert.equal(r.ok,true,r.reason+' '+id);return r;}
function week(i){return DATA.days.slice(i,i+5);}

/* 1. Data integrity: the game's risk rule must equal the rule used to build the archive. */
for(const d of DATA.days)assert.equal(SW.riskOf(d),d.risk,'risk rule mismatch on '+d.date);
assert.ok(DATA.days.length>600&&DATA.windows.length>100,'archive too small');
for(const w of DATA.windows){const r=week(w).map(d=>d.risk);assert.notEqual(r[0],2,'sol 1 must not be a storm');assert.ok(r.includes(2));for(let j=0;j<4;j++)assert.ok(!(r[j]===2&&r[j+1]===2),'back-to-back storms');}
/* Spot-check against famous, publicly known events. */
const byDate=Object.fromEntries(DATA.days.map(d=>[d.date,d]));
assert.equal(byDate['2024-05-14'].flare,'X8.7');assert.equal(byDate['2024-05-14'].risk,2);
assert.equal(byDate['2024-05-11'].kp,9);assert.equal(byDate['2024-10-03'].flare,'X9.0');

/* 2. A sensible player can win every archived week. */
function play(days,seed,{buildShield=true}={}){const s=M.initial(seed,days);const t=id=>M.reason(s,id)===''&&M.apply(s,id).ok;let guard=0;
while(!s.done&&guard++<400){
 if(buildShield&&!s.shield)t('shield');
 if(!s.planted)t('plant');
 if(s.planted&&!s.harvested){if(s.growth>=2)t('harvest');else t('light');}
 if(s.air<=50)t('air');
 if(M.dirty(s)&&!s.cleaned&&s.power<4)t('clean');
 for(const r of ['rock0','rock1','rock2','rock3']){if(s.samples.length>=3)break;if(!s.samples.includes(r))t('scan:'+r);}
 if(s.samples.length>=3&&!s.packet&&!s.delivered)t('send');
 if(s.packet)t('wait');
 const shelter=s.shield&&M.today(s).risk>=1;
 const r=M.end(s,shelter);if(!r.ok){return {s,stuck:r.reason};}
}return {s};}
let wins=0,stuck=0,total=0,failures=[];
for(const w of DATA.windows){for(const seed of [1,2,3,4]){total++;const r=play(week(w),seed);if(r.stuck)stuck++;if(r.s.success)wins++;else failures.push(week(w)[0].date+' seed'+seed+' '+(r.stuck||'sol'+r.s.sol+' a'+r.s.air+' f'+r.s.food+' rad'+r.s.rad+' sh'+r.s.shield+' h'+r.s.harvested+' smp'+r.s.samples.length+' dlv'+r.s.delivered));}}
console.log(`competent bot wins ${wins}/${total} (${(100*wins/total).toFixed(1)}%)`);
if(failures.length)console.log('sample failures:\n  '+failures.slice(0,8).join('\n  '));
assert.ok(wins/total>=0.95,'game should be winnable by a sensible plan in at least 95% of weeks');

/* 3. Ignoring the shelter must lose. */
let lazyWins=0;for(const w of DATA.windows){const r=play(week(w),1,{buildShield:false});if(r.s.success)lazyWins++;}
assert.equal(lazyWins,0,'no shield must never win');

/* 4. Radiation is a real trade-off: storms and outdoor jobs cost more, shielding halves it. */
let s=M.initial(1,[{risk:0},{risk:1},{risk:2},{risk:0},{risk:1}].map(d=>({date:null,flare:null,sep:false,kp:0,cmeSpeed:0,ids:[],...d})));
assert.equal(M.radCost(s,'scan:rock0'),6);s.sol=2;assert.equal(M.radCost(s,'scan:rock0'),24);s.sol=3;assert.equal(M.radCost(s,'scan:rock0'),60);s.shield=true;assert.equal(M.radCost(s,'scan:rock0'),30);assert.equal(M.radCost(s,'plant'),0);
assert.equal(M.nightLoss(s,true),0);s.sol=2;assert.equal(M.nightLoss(s,false),6);s.shield=false;assert.equal(M.nightLoss(s,false),12);

/* 5. Rules carried over from the original prototype still hold. */
let t=M.initial(1);t.power=1;let snap=JSON.stringify(t);assert.equal(M.apply(t,'plant').ok,false);assert.equal(JSON.stringify(t),snap);
t=M.initial(1);act(t,'scan:rock0');snap=JSON.stringify(t);assert.equal(M.apply(t,'scan:rock0').ok,false);assert.equal(JSON.stringify(t),snap);
t=M.initial(1);t.sol=3;t.minutes=45;assert.match(M.reason(t,'shield'),/storm/);assert.equal(M.end(t,false).ok,false);t.shield=true;assert.equal(M.end(t,false).ok,false);assert.equal(M.end(t,true).ok,true);
t=M.initial(1);act(t,'plant');M.end(t);M.end(t);assert.equal(t.growth,1,'Unlit crops must not grow');assert.equal(M.apply(t,'harvest').ok,false);
t=M.initial(1);t.food=12;const rr=M.end(t);assert.equal(rr.failed,true);assert.equal(t.done,true);
t=M.initial(1);t.samples=['rock0','rock1','rock2'];t.minutes=80;act(t,'send');M.end(t);assert.equal(t.packet.due,30);act(t,'wait');act(t,'wait');assert.equal(t.delivered,false);act(t,'wait');assert.equal(t.delivered,true);
t=M.initial(1);act(t,'air');assert.equal(t.air,100,'Air must cap at storage capacity');assert.equal(M.apply(t,'clean').ok,false);
t=M.initial(1);t.rad=2;t.sol=1;assert.match(M.reason(t,'scan:rock0'),/Radiation/);
t=M.initial(1);t.rad=3;t.air=100;M.end(t,false);/* calm day: no loss */assert.ok(t.rad>=3);
t=M.initial(1,[{risk:1},{risk:1},{risk:1},{risk:1},{risk:1}].map(d=>({date:null,...d})));t.rad=4;const e=M.end(t,false);assert.equal(e.failed,true,'losing all Safety ends the mission');

/* 6. Same seed gives the same dust days; different seeds vary. */
assert.deepEqual(M.initial(7).dust,M.initial(7).dust);assert.ok(new Set(Array.from({length:30},(_,i)=>M.initial(i+1).dust.join())).size>3);
/* 7. Live weeks are softened so they stay fair. */
const hard=SW.soften([2,2,2,0,2].map(risk=>({risk})));assert.deepEqual(hard.map(d=>d.risk),[1,2,1,0,2]);

/* 8. Colony layer: pads, modules, rover sites, Mars weather events, bonus missions and Pip's score. */
const calm=n=>Array.from({length:n},()=>({date:null,risk:0,flare:null,sep:false,kp:0,cmeSpeed:0,ids:[]}));
const mk=()=>{const x=M.initial(1,calm(5));x.events=[null,null,null,null,null];x.dust=[];return x;};let c=mk();
assert.equal(M.reason(c,'build:pad0:solar'),'');act(c,'build:pad0:solar');assert.equal(c.modules.pad0,'solar');assert.match(M.reason(c,'build:pad0:rtg'),/already/);
assert.equal(c.power,6);assert.equal(c.minutes,15);assert.equal(M.genFor(c,2),3,'ridge solar makes 3');
M.end(c);assert.equal(c.power,8+3,'solar array adds to tomorrow morning');
c=mk();c.dust=[2];c.modules={pad1:'solar',pad0:'solar',pad3:'solar',pad2:'rtg'};
assert.equal(M.solarOut(c,'pad1',2),1,'dust halves flats');assert.equal(M.solarOut(c,'pad0',2),3,'ridge ignores dust');assert.equal(M.solarOut(c,'pad3',2),0,'dunes make nothing in dust');assert.equal(M.genFor(c,2),1+3+0+2);
c.events=[null,'dust',null,null,null];assert.equal(M.genFor(c,2),2,'dust storm stops solar but not the nuclear battery');assert.equal(M.dirty({...c,sol:2}),true);
c.events=[null,'devil',null,null,null];assert.equal(M.dirty({...c,sol:2}),false,'dust devil cleans the panels');
c=mk();c.modules={pad0:'battery'};c.power=6;M.end(c);assert.equal(c.power,8+4,'battery saves 4');
c=mk();c.modules={pad0:'recycler'};assert.equal(M.airNight(c),11);const a0=c.air;M.end(c);assert.equal(c.air,a0-11);
c=M.initial(1,calm(5));c.events=['cold',null,null,null,null];assert.equal(M.foodNight(c),20);c.modules={pad2:'quarters'};assert.equal(M.foodNight(c),12);
c=mk();c.modules={pad2:'garden'};c.planted=true;c.growth=2;c.lit=true;const f0=c.food;act(c,'harvest');assert.equal(c.food,Math.min(100,f0+42));
/* rover: costs, gains, one trip per site, counts as a sample, shelter-free safety */
c=mk();c.air=50;c.rad=60;c.power=12;act(c,'explore:lava');assert.equal(c.rad>60,true);assert.ok(c.samples.includes('site:lava'));assert.match(M.reason(c,'explore:lava'),/already/);
act(c,'explore:ice');act(c,'explore:river');assert.equal(c.samples.length,3);assert.equal(M.apply(c,'send').ok,true);
c=M.initial(1,calm(5));c.power=2;assert.match(M.reason(c,'explore:ice'),/power/i);
/* a rock scanned with the rover counts as a sample, once, so three of them can be sent to Earth */
c=mk();c.air=60;c.power=12;act(c,'explore:ice');act(c,'find:ice_rock');assert.ok(c.samples.includes('find:ice_rock'));act(c,'find:ice_ground');assert.equal(c.samples.length,2,'only rock scans add samples');assert.match(M.reason(c,'send'),/three/i);act(c,'explore:river');act(c,'find:river_rock');assert.equal(c.samples.length,4);assert.equal(M.reason(c,'send'),'');
c=M.initial(1,calm(5));c.sol=3;c.days[2].risk=2;c.minutes=45;assert.match(M.reason(c,'build:pad1:solar'),/storm/,'cannot build into a storm');
c=M.initial(1,calm(5));assert.ok(M.radCost(c,'build:pad2:solar')<M.radCost(c,'build:pad1:solar'),'hollow is safer to build in');
/* events are deterministic and fair */
assert.deepEqual(M.initial(9).events,M.initial(9).events);for(let i=1;i<60;i++){const ev=M.initial(i).events;assert.equal(ev.filter(Boolean).length,2);assert.equal(ev[0],null);}
/* bonus missions and Pip's score */
c=M.initial(1,calm(5));assert.equal(M.bonus(c).filter(b=>b.done).length,0);let base=M.score(c).total;
c.events=[null,null,null,null,null];act(c,'build:pad0:solar');assert.equal(M.bonus(c).find(b=>b.id==='builder').done,true);assert.ok(M.score(c).total>base);
c.air=100;c.food=100;c.rad=100;c.shield=true;c.samples=['a','b','c'];c.delivered=true;c.modules={pad0:'solar',pad1:'rtg',pad2:'battery',pad3:'garden'};c.explored={ice:1,lava:1,river:1};c.harvested=true;c.shieldSol=1;c.days[2].risk=2;c.sol=4;
assert.ok(M.score(c).total>=90);assert.equal(M.score(c).parts.reduce((a,p)=>a+p.max,0),100);
/* a colony-building player still wins, and building is a real cost: skipping the shelter for modules still loses */
function playColony(days,seed){const s=M.initial(seed,days);const t=id=>M.reason(s,id)===''&&M.apply(s,id).ok;let g=0;while(!s.done&&g++<400){const risk=M.today(s).risk;if(!s.shield)t('shield');if(!s.planted)t('plant');if(s.planted&&!s.harvested){if(s.growth>=2)t('harvest');else t('light');}if(s.air<=50)t('air');if(M.dirty(s)&&!s.cleaned&&s.power<4)t('clean');if(risk<2){for(const k of ['ice','lava','river']){if(s.samples.length>=3)break;t('explore:'+k);}}if(s.shield&&risk===0&&s.power>=5)t('build:pad0:solar');if(s.samples.length>=3&&!s.packet&&!s.delivered)t('send');if(s.packet)t('wait');const shelter=s.shield&&risk>=1;const r=M.end(s,shelter);if(!r.ok)return {s,stuck:r.reason};}return {s};}
let cw=0,ct=0;for(const w of DATA.windows){for(const seed of [1,2,3]){ct++;if(playColony(week(w),seed).s.success)cw++;}}
console.log(`colony bot (rover samples + solar) wins ${cw}/${ct}`);assert.ok(cw/ct>=0.95,'rover and colony play must also be winnable');

console.log('PASS: real-data integrity, winnable on archived weeks, shield required, radiation trade-offs, original rules, fairness.');
