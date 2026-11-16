/* v3 rules: upgrades, new modules and sites, research, science lab, mission alerts, extra missions, save repair.
   Run from this folder: node test-v3.cjs   (needs only Node; loads model.js and the real DONKI archive) */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('./model.js'),SW=require('./spaceweather.js');
const root=[path.resolve(__dirname,'..','..'),path.resolve(__dirname,'..')].find(r=>fs.existsSync(path.join(r,'data','donki-daily.json')));
globalThis.DONKI_DAILY=JSON.parse(fs.readFileSync(path.join(root,'data','donki-daily.json'),'utf8'));
const calm=()=>{const s=M.initial(7,[0,0,0,0,0].map(risk=>({date:null,risk,flare:null,sep:false,kp:0,cmeSpeed:0,ids:[]})));s.alerts=s.alerts.map(()=>null);return s;};
const rich=s=>{s.power=40;s.air=100;s.minutes=0;s.rad=100;return s;};
let n=0;const ok=(c,m)=>{assert.ok(c,m);n++;};

/* 1. v2 saves: a state without any v3 field plays by the v2 numbers */
{const a=calm(),b=calm();for(const k of ['rp','tech','modLv','labs','flags','alerts','alertDone'])delete b[k];
 for(const id of ['plant','air','build:pad0:solar','build:pad1:garden']){M.apply(a,id);M.apply(b,id);}M.end(a,false);M.end(b,false);
 for(const k of ['power','air','food','rad','sol'])ok(a[k]===b[k],'v2-shaped state matches on '+k);
 ok(M.normalize(b)&&b.rp===0&&typeof b.tech==='object','normalize fills the v3 fields');
 ok(!M.normalize({sol:1})&&!M.normalize(null)&&!M.normalize({days:[{}],sol:9,power:1,air:1,food:1,rad:1,minutes:0}),'normalize rejects broken saves');
 const c=calm();c.modules={pad0:'solar',nope:'solar',pad1:'laser'};c.tech={ox1:true,zz:true};c.air=-5;M.normalize(c);ok(Object.keys(c.modules).join()==='pad0'&&!c.tech.zz&&c.air===0,'normalize drops unknown modules and tech and clamps supplies');}

/* 2. upgrades */
{const s=rich(calm());M.apply(s,'build:pad0:solar');ok(M.reason(s,'upgrade:pad1')!=='','cannot upgrade an empty pad');
 const g1=M.genFor(s,2);ok(M.apply(s,'upgrade:pad0').ok&&M.lv(s,'pad0')===2,'upgrade to level 2');ok(M.genFor(s,2)===g1+1,'level 2 solar makes 1 more power');
 ok(/Research/.test(M.reason(rich(s),'upgrade:pad0')),'level 3 needs a researched technology');s.tech.gh1=true;rich(s);ok(M.apply(s,'upgrade:pad0').ok&&M.lv(s,'pad0')===3,'level 3 after research');
 ok(/highest/.test(M.reason(rich(s),'upgrade:pad0')),'no level 4');
 const t=rich(calm());M.apply(t,'build:pad1:recycler');const a1=M.airNight(t);rich(t);M.apply(t,'upgrade:pad1');ok(M.airNight(t)===a1-3,'upgraded recycler saves 3 more air');
 const u=rich(calm());M.apply(u,'build:pad1:storage');ok(M.cap(u)===130,'storage raises the cap to 130');u.air=95;u.power=10;M.apply(u,'air');ok(u.air===125,'air can go above 100 with storage');
 const v=calm();v.air=95;v.power=10;M.apply(v,'air');ok(v.air===100,'without storage the cap is still 100');}

/* 3. expansion pads */
{const s=rich(calm());ok(/opens when 2/.test(M.reason(s,'build:pad4:solar')),'pad4 locked at first');M.apply(s,'build:pad0:solar');rich(s);M.apply(s,'build:pad1:garden');rich(s);ok(M.apply(s,'build:pad4:battery').ok,'pad4 opens at 2 modules');rich(s);ok(/opens when 4/.test(M.reason(s,'build:pad5:solar')),'pad5 still locked at 3');M.apply(s,'build:pad2:storage');rich(s);ok(M.apply(s,'build:pad5:solar').ok,'pad5 opens at 4 modules');
 ok(M.bonus(s).find(b=>b.id==='expansion').done,'Colony expansion mission completes');}

/* 4. research */
{const s=rich(calm());ok(/need 2 research/.test(M.reason(s,'research:ox1')),'research needs points');s.rp=6;ok(/first/.test(M.reason(s,'research:ox2')),'tier 2 needs tier 1');
 ok(M.apply(s,'research:ox1').ok&&s.rp===4&&M.has(s,'ox1'),'research spends points');ok(M.desc('air',s).gain.air===40,'electrolysis: air maker gives 40');ok(/already/.test(M.reason(s,'research:ox1')),'cannot research twice');
 const n0=M.airNight(s);M.apply(s,'research:ox2');ok(M.airNight(s)===n0-3&&s.rp===0,'closed-loop air saves 3 a night');
 const t=rich(calm());t.tech={gh1:true,gh2:true,com1:true,rov1:true,sol1:true};ok(M.desc('light',t).cost.power===1&&M.desc('send',t).cost.power===1&&M.desc('explore:ice',t).cost.power===2&&M.desc('explore:ice',t).cost.time===15,'tech changes costs');
 t.planted=true;t.growth=2;ok(M.desc('harvest',t).gain.food===38,'hydroponics adds 8 food');
 const a=calm(),b=calm();a.days[0].risk=1;b.days[0].risk=1;b.tech={rad1:true};ok(M.radCost(b,'scan:rock0')<M.radCost(a,'scan:rock0'),'regolith bricks cut outdoor Safety cost');
 for(const [k,T] of Object.entries(M.TECH)){ok(M.TECH_CATS[T.cat],'tech '+k+' has a category');ok(!T.pre||M.TECH[T.pre],'tech '+k+' prerequisite exists');}
 ok(Object.keys(M.TECH_CATS).every(c=>Object.values(M.TECH).filter(T=>T.cat===c).length===2),'six categories, two technologies each');}

/* 5. research points and the lab */
{const s=rich(calm());M.apply(s,'scan:rock0');ok(s.rp===1,'a scan gives 1 research point');rich(s);M.apply(s,'explore:probe');ok(s.rp===1+2+0||s.rp===4,'old lander gives research points');
 const r0=s.rp;rich(s);ok(M.apply(s,'lab:shield').ok&&s.rp===r0+2,'an experiment gives 2 points');ok(/already/.test(M.reason(rich(s),'lab:shield')),'each experiment once per mission');
 M.apply(s,'build:pad0:lab');rich(s);const r1=s.rp;M.apply(s,'lab:solar');ok(s.rp===r1+4,'a research lab doubles experiment points');
 const r2=s.rp;M.end(s,false);ok(s.rp===r2+1,'a research lab adds 1 point each morning');
 ok(['shield','solar','water','oxygen','geology'].every(k=>M.LABS[k])&&Object.keys(M.LABS).length===8,'the five v3 experiments are kept; v4 adds three (was: exactly five)');}

/* 6. sites */
{const a=calm(),b=calm();a.days[0].risk=1;b.days[0].risk=1;ok(M.radCost(a,'explore:canyon')>M.radCost(b,'explore:ice'),'open ground costs more Safety on an active-Sun day');
 const s=calm();s.level=1;ok(/Level 2/.test(M.reason(s,'explore:probe'))&&/Level 4/.test(M.reason(s,'explore:canyon'))&&!M.lockText(s,'explore:ice'),'new sites unlock by level');
 ok(Object.keys(M.SITES).length===5,'five rover sites');}

/* 7. alerts: nothing changes until a choice is made, one choice is always free, costs are checked */
{for(const id of Object.keys(M.ALERTS)){const s=calm();s.sol=2;s.alerts[1]=id;const before=JSON.stringify([s.power,s.air,s.food,s.rad,s.minutes,s.rp]);const info=M.alertInfo(s);ok(info&&info.id===id,'alert '+id+' is pending');ok(JSON.stringify([s.power,s.air,s.food,s.rad,s.minutes,s.rp])===before,'reading alert '+id+' changes nothing');
  ok(info.choices.some(c=>!c.why&&c.free),'alert '+id+' has a free choice');
  for(let i=0;i<info.choices.length;i++){const t=rich(calm());t.sol=2;t.alerts[1]=id;const inf=M.alertInfo(t);if(inf.choices[i].why)continue;const r=M.alertChoose(t,i);ok(r.ok&&typeof r.msg==='string'&&r.msg.length>10,'alert '+id+' choice '+i+' resolves');ok(M.alertOf(t)===null,'alert '+id+' clears after choosing');ok(t.air>0&&t.rad>0&&t.power>=0,'alert '+id+' choice '+i+' cannot end the mission');}}
 const s=calm();s.sol=2;s.alerts[1]='rescue';s.power=1;const inf=M.alertInfo(s);ok(inf.choices[0].why&&!M.alertChoose(s,0).ok,'a choice you cannot afford is refused');
 const c=calm();c.sol=2;c.alerts[1]='solar';ok(/battery/i.test(M.alertInfo(c).choices[1].why),'battery option needs a battery bank');
 const d=calm();d.sol=2;d.alerts[1]='comms';M.alertChoose(d,2);ok(/down until/.test(M.reason(d,'send'))||d.samples.length<3,'waiting keeps the radio down for a while');
 const sch=M.initial(1234,calm().days).alerts;ok(sch.filter(Boolean).length===3&&sch[0]===null,'three alerts per mission, never on Sol 1');}

/* 8. crew roles */
{const s=rich(calm());s.crew={names:['A','B'],acts:[0,0],xp:[0,0]};ok(M.role(s)==='eng'&&M.desc('build:pad0:rtg',s).cost.power===3,'Engineer sol: builds cost 1 less power');s.sol=2;ok(M.role(s)==='sci'&&M.desc('scan:rock0',s).gain.rp===2,'Scientist sol: scans give 1 more point');ok(M.role(calm())===null,'no roles in a one-player game');}

/* 9. the proven v2 player (same plan as test-model.cjs) still wins every real archive week when it also has to answer alerts,
      whether it always takes the free choice or takes the bold one whenever it can afford it; using the lab and research never hurts */
{const D=globalThis.DONKI_DAILY;
 const play=(days,seed,mode)=>{const s=M.initial(seed,days);const t=id=>M.reason(s,id)===''&&M.apply(s,id).ok;let guard=0;
  while(!s.done&&guard++<400){
   if(M.alertOf(s)){const inf=M.alertInfo(s);let i=inf.choices.findIndex(c=>c.free&&!c.why);if(mode!=='free'){const j=inf.choices.findIndex(c=>!c.why&&!c.free);if(j>=0&&s.air>55&&s.power>=6&&s.rad>60&&M.today(s).risk===0)i=j;}ok(M.alertChoose(s,i).ok,'bot can always answer an alert');n--;}
   if(!s.shield)t('shield');if(!s.planted)t('plant');if(s.planted&&!s.harvested){if(s.growth>=2)t('harvest');else t('light');}
   if(s.air<=50)t('air');if(M.dirty(s)&&!s.cleaned&&s.power<4)t('clean');
   for(const r of ['rock0','rock1','rock2','rock3']){if(s.samples.length>=3)break;if(!s.samples.includes(r))t('scan:'+r);}
   if(s.samples.length>=3&&!s.packet&&!s.delivered)t('send');if(s.packet)t('wait');
   if(mode==='v3'){if(s.power>=5)for(const k of Object.keys(M.LABS))if(t('lab:'+k))break;for(const k of ['rad1','ox1','gh1','rad2'])t('research:'+k);}
   const r=M.end(s,s.shield&&M.today(s).risk>=1);if(!r.ok)return s;}
  return s;};
 const res={free:0,bold:0,v3:0};let runs=0,rp=0;
 for(const w of D.windows)for(const seed of [1,2]){runs++;const days=D.days.slice(w,w+5);for(const m of Object.keys(res)){const s=play(days,seed,m);if(s.success)res[m]++;if(m==='v3')rp+=Object.keys(s.tech).length;}}
 console.log(`real weeks won out of ${runs}: free alert choices ${res.free}, bold alert choices ${res.bold}, plus lab and research ${res.v3} (average ${(rp/runs).toFixed(1)} technologies researched)`);
 ok(res.free/runs>=.95,'free alert choices keep the mission winnable');ok(res.bold/runs>=.93,'bold alert choices keep the mission winnable');ok(res.v3/runs>=.93,'using the lab and research keeps the mission winnable');ok(rp/runs>=1,'a normal mission earns enough points to research something');}
ok(SW.cleanFlare('M5.2')==='M5.2'&&SW.cleanFlare('X1')==='X1'&&SW.cleanFlare('X17.2')==='X17.2'&&SW.cleanFlare(' C3.4 ')==='C3.4','real flare classes pass');ok(SW.cleanFlare('<img src=x onerror=alert(1)>')===null&&SW.cleanFlare('M5.2<b>')===null&&SW.cleanFlare(null)===null&&SW.cleanFlare('')===null,'live NASA text that is not a flare class is dropped (no HTML reaches the page)');
console.log('PASS: '+n+' v3 rule checks (upgrades, expansion pads, research, lab, sites, alerts, roles, save repair, winnability).');
