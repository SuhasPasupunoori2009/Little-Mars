/* Real NASA space weather for the game. Data: NASA CCMC DONKI. See data/donki-daily.json and scripts/fetch_donki.py. */
(function(root){
/* Times shown to players are New York time; the NASA records and their dates stay in UTC. */
function nyTime(v){const d=new Date(v);if(isNaN(d))return null;try{const f=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZoneName:'short'}).formatToParts(d),g=k=>(f.find(x=>x.type===k)||{}).value;return g('year')+'-'+g('month')+'-'+g('day')+' '+(g('hour')==='24'?'00':g('hour'))+':'+g('minute')+' '+g('timeZoneName');}catch(e){return d.toISOString().slice(0,16).replace('T',' ')+' UTC';}}root.nyTime=nyTime;
/* Live NASA text goes into the page, so only a real flare class such as M5.2 is accepted. */
function cleanFlare(v){const s=String(v==null?'':v).trim();return /^[A-X][0-9]{1,2}(\.[0-9])?$/.test(s)?s:null;}


'use strict';
const WORDS=['Calm','Watch','Storm'];
const RULE='Storm = an X-class flare or a solar particle event that day. Watch = an M-class flare or a very fast solar cloud (CME, 1500 km/s or more). Calm = anything quieter.';
/* Same rule as scripts/fetch_donki.py. The tests check the archive against this function. */
function riskOf(d){const f=d.flare||'';if(f[0]==='X'||d.sep)return 2;if(f[0]==='M'||(d.cmeSpeed||0)>=1500)return 1;return 0;}
function fmtDate(iso){if(!iso)return 'Story day';const d=new Date(iso+'T00:00:00Z');return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()]+' '+d.getUTCDate()+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getUTCMonth()]+' '+d.getUTCFullYear();}
function describe(d){const bits=[];if(d.flare)bits.push((d.flare[0]==='X'||d.flare[0]==='M')?d.flare+' solar flare':'small '+d.flare+' flare');if(d.sep)bits.push('radiation particles from the Sun');if((d.cmeSpeed||0)>=1000)bits.push('fast solar cloud at '+d.cmeSpeed+' km/s');if((d.kp||0)>=5)bits.push('magnetic storm at Earth (Kp '+d.kp+')');return bits.length?bits.join(' · '):'A quiet Sun';}
/* Kid-friendly wording. Same facts as describe(), without the jargon. */
const WHAT=['Safe to work outside.','Outdoor jobs cost extra Safety today.','Dangerous outside! Build the shield, then rest in the shelter.'];
function kidDescribe(d){const bits=[];const f=d.flare||'';if(f[0]==='X')bits.push('a huge flare ('+f+')');else if(f[0]==='M')bits.push('a strong flare ('+f+')');else if(f)bits.push('a small flare ('+f+')');if(d.sep)bits.push('fast space particles that left the Sun (in the game they can reach Mars)');if((d.cmeSpeed||0)>=1000)bits.push('a giant cloud of gas racing from the Sun at '+d.cmeSpeed+' km/s');if((d.kp||0)>=5)bits.push('a magnetic storm around Earth');return bits.length?'Today the Sun made '+bits.join(', plus ')+'.':'The Sun is quiet today.';}
function dress(d){return {...d,word:WORDS[d.risk],nasaWord:d.softened?WORDS[2]:null,label:fmtDate(d.date),desc:describe(d),kid:kidDescribe(d),what:WHAT[d.risk]};}
function pack(days,source,extra={}){const list=days.map(dress),dated=list.filter(d=>d.date);return {days:list,source,heading:source==='live'?'LIVE from NASA DONKI':source==='archive'?'Real NASA DONKI week (archive)':'Practice week',range:dated.length?fmtDate(dated[0].date)+' to '+fmtDate(dated[dated.length-1].date):'Story week',...extra};}
function storyWeek(){return pack([0,1,2,0,1].map(risk=>({date:null,risk,flare:null,sep:false,kp:0,cmeSpeed:0,ids:[]})),'story');}
function archiveWindow(seed,onDate){const D=root.DONKI_DAILY;if(!D||!D.windows.length)return storyWeek();let i=D.windows[Math.abs(seed)%D.windows.length];if(onDate){const j=D.windows.find(w=>D.days.slice(w,w+5).some(x=>x.date===onDate));if(j!==undefined)i=j;}return pack(D.days.slice(i,i+5),'archive',{fetched:D.fetched,fetchedAt:D.fetchedAt?nyTime(D.fetchedAt):null,curated:true,windows:D.windows.length,possible:D.windowsPossible||null,span:D.range});}
/* Live weeks are real, but we never let day 1 or two back-to-back days be storms, so a mission can always be won. */
function soften(days){const out=days.map(d=>({...d})),notes=[];if(out[0].risk===2){out[0].risk=1;out[0].softened=true;out[0].was=2;}for(let i=1;i<out.length;i++)if(out[i].risk===2&&out[i-1].risk===2){out[i].risk=1;out[i].softened=true;out[i].was=2;}return out;}
async function live(){const end=new Date();end.setUTCDate(end.getUTCDate()-1);const start=new Date(end);start.setUTCDate(start.getUTCDate()-4);const iso=d=>d.toISOString().slice(0,10),a=iso(start),b=iso(end);
const get=async k=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),7000);try{const r=await fetch(`https://ccmc.gsfc.nasa.gov/DONKI/WS/get/${k}?startDate=${a}&endDate=${b}`,{signal:c.signal});if(!r.ok)throw new Error('DONKI '+r.status);const txt=await r.text();return txt.trim()?JSON.parse(txt):[];}finally{clearTimeout(t);}};
const [flr,sep,cme]=await Promise.all([get('FLR'),get('SEP'),get('CME')]);const map={};for(let d=new Date(start);d<=end;d.setUTCDate(d.getUTCDate()+1))map[iso(d)]={date:iso(d),flare:null,sep:false,kp:0,cmeSpeed:0,ids:[]};
const rank=c=>({A:0,B:1,C:2,M:3,X:4}[c[0]]*100+parseFloat(c.slice(1)));
for(const e of flr){const d=map[(e.beginTime||'').slice(0,10)],cl=cleanFlare(e.classType);if(d&&cl&&(!d.flare||rank(cl)>rank(d.flare))){d.flare=cl;d.ids[0]=String(e.flrID||'').replace(/[^0-9A-Za-z:_-]/g,'').slice(0,40);}}
for(const e of sep){const d=map[(e.eventTime||'').slice(0,10)];if(d){d.sep=true;d.ids.push(e.sepID);}}
for(const e of cme){const d=map[(e.startTime||'').slice(0,10)];const sp=Math.max(0,...(e.cmeAnalyses||[]).map(x=>x.speed||0));if(d&&sp>d.cmeSpeed){d.cmeSpeed=Math.round(sp);}}
const days=Object.values(map).map(d=>({...d,risk:riskOf(d),ids:d.ids.filter(Boolean)}));const eased=soften(days);return pack(eased,'live',{fetched:iso(new Date()),fetchedAt:nyTime(new Date()),eased:eased.filter(x=>x.softened).length});}
/* v4: longer missions. Takes n real days in a row starting at a curated window. Days after the fifth are eased by the same
   rule as live weeks (no two Storms in a row), and every eased day is marked so the forecast can say so. */
function archiveSpan(seed,n){const D=root.DONKI_DAILY;if(!D||!D.windows.length||n<=5)return archiveWindow(seed);let i=D.windows[Math.abs(seed)%D.windows.length];if(i+n>D.days.length)i=Math.max(0,D.days.length-n);const raw=D.days.slice(i,i+n).map(d=>({...d}));for(let k=5;k<raw.length;k++)if(raw[k].risk===2&&raw[k-1].risk===2){raw[k].risk=1;raw[k].softened=true;raw[k].was=2;}return pack(raw,'archive',{fetched:D.fetched,fetchedAt:D.fetchedAt?nyTime(D.fetchedAt):null,curated:true,windows:D.windows.length,possible:D.windowsPossible||null,span:D.range,eased:raw.filter(x=>x.softened).length});}
/* v4: a made-up, storm-free practice pattern of any length, clearly labelled as not NASA data. */
function practiceWeek(n){const pat=[0,0,1,0,0,1,0,0];return pack(Array.from({length:n},(_,i)=>({date:null,risk:pat[i%pat.length],flare:null,sep:false,kp:0,cmeSpeed:0,ids:[]})),'story');}
root.SpaceWeather={WORDS,RULE,riskOf,fmtDate,describe,kidDescribe,dress,archiveWindow,archiveSpan,practiceWeek,live,storyWeek,soften,cleanFlare};
if(typeof module!=='undefined')module.exports=root.SpaceWeather;
})(typeof window!=='undefined'?window:globalThis);
