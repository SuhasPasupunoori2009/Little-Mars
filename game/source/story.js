/* Story and sound for Little Mars: Storm Watch.
   Everything here is generated in the browser: no audio files, no network. Sound only starts after a click. */
(function(root){
'use strict';
const A={ctx:null,master:null,bed:null,on:false,mood:-1};
function ctx(){if(A.ctx)return A.ctx;const C=root.AudioContext||root.webkitAudioContext;if(!C)return null;try{A.ctx=new C();A.master=A.ctx.createGain();A.master.gain.value=0;A.master.connect(A.ctx.destination);for(const k of ['musicG','ambG','fxG']){A[k]=A.ctx.createGain();A[k].gain.value=A.mix?A.mix[k]:1;A[k].connect(A.master);}}catch(e){A.ctx=null;}return A.ctx;}
function noiseBuffer(c){const len=c.sampleRate*2,b=c.createBuffer(1,len,c.sampleRate),d=b.getChannelData(0);let last=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;last=(last+.02*w)/1.02;d[i]=last*3.2;}return b;}
/* Ambient bed: a slow pad (three sines), wind (filtered noise) and a storm rumble. Its colour follows the day’s risk. */
function buildBed(c){const bed={};const mk=(type,f)=>{const o=c.createOscillator();o.type=type;o.frequency.value=f;return o;};
bed.padGain=c.createGain();bed.padGain.gain.value=0;const lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=700;
bed.o1=mk('sine',110);bed.o2=mk('sine',164.8);bed.o3=mk('sine',138.6);[bed.o1,bed.o2,bed.o3].forEach(o=>{o.connect(lp);o.start();});lp.connect(bed.padGain).connect(A.musicG);
const trem=c.createOscillator();trem.frequency.value=.12;const tg=c.createGain();tg.gain.value=.012;trem.connect(tg).connect(bed.padGain.gain);trem.start();bed.trem=trem;bed.tg=tg;
const n=c.createBufferSource();n.buffer=noiseBuffer(c);n.loop=true;bed.bp=c.createBiquadFilter();bed.bp.type='bandpass';bed.bp.frequency.value=380;bed.bp.Q.value=.6;bed.windGain=c.createGain();bed.windGain.gain.value=0;n.connect(bed.bp).connect(bed.windGain).connect(A.ambG);n.start();
const sweep=c.createOscillator();sweep.frequency.value=.07;const sg=c.createGain();sg.gain.value=140;sweep.connect(sg).connect(bed.bp.frequency);sweep.start();
bed.rumble=mk('sawtooth',48);const rl=c.createBiquadFilter();rl.type='lowpass';rl.frequency.value=110;bed.rumbleGain=c.createGain();bed.rumbleGain.gain.value=0;bed.rumble.connect(rl).connect(bed.rumbleGain).connect(A.ambG);bed.rumble.start();
return bed;}
function setMood(risk){A.mood=risk;const c=ctx();if(!c||!A.on)return;if(!A.bed)A.bed=buildBed(c);const b=A.bed,t=c.currentTime;
const third=risk===0?138.6:130.8;b.o3.frequency.setTargetAtTime(third,t,1.2);
b.padGain.gain.setTargetAtTime([.05,.045,.03][risk],t,1.5);b.windGain.gain.setTargetAtTime([.012,.03,.085][risk],t,1.5);b.rumbleGain.gain.setTargetAtTime([0,.01,.055][risk],t,1.5);b.trem.frequency.setTargetAtTime([.12,.3,1.1][risk],t,1);b.tg.gain.setTargetAtTime([.012,.02,.02][risk],t,1);}
function enable(on){A.on=!!on;const c=ctx();if(!c)return;if(on){c.resume&&c.resume();A.master.gain.setTargetAtTime(A.vol==null?.9:A.vol,c.currentTime,.3);if(A.mood>=0)setMood(A.mood);else setMood(0);}else{A.master.gain.setTargetAtTime(0,c.currentTime,.2);}}
function note(c,freq,start,dur,type='sine',vol=.07,dest){const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,start);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(vol,start+.02);g.gain.exponentialRampToValueAtTime(.0008,start+dur);o.connect(g).connect(dest||A.fxG);o.start(start);o.stop(start+dur+.05);}
const SFX={
ok(c,t){note(c,660,t,.18);note(c,880,t+.09,.26);},
no(c,t){note(c,240,t,.2,'triangle',.06);note(c,180,t+.12,.3,'triangle',.06);},
chirp(c,t){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(900,t);o.frequency.exponentialRampToValueAtTime(1500,t+.07);o.frequency.exponentialRampToValueAtTime(1100,t+.16);g.gain.setValueAtTime(.05,t);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.connect(g).connect(A.fxG);o.start(t);o.stop(t+.22);},
warn(c,t){[0,.3,.6].forEach((d,i)=>note(c,[740,622,523][i],t+d,.28,'triangle',.08));},
letter(c,t){[523,659,784,1047].forEach((f,i)=>note(c,f,t+i*.11,.7,'sine',.05));},
thruster(c,t){for(let i=0;i<14;i++)note(c,70+Math.random()*30,t+i*.5,.6,'sawtooth',.03);},touch(c,t){note(c,55,t,.9,'sine',.12);note(c,110,t,.4,'triangle',.06);},build(c,t){[0,.16,.32].forEach(d=>note(c,190,t+d,.07,'square',.05));note(c,70,t+.48,.5,'sine',.1);note(c,523,t+.5,.3,'triangle',.04);},
radio(c,t){const n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();n.buffer=noiseBuffer(c);f.type='highpass';f.frequency.value=1800;g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(.001,t+.35);n.connect(f).connect(g).connect(A.fxG);n.start(t);n.stop(t+.4);note(c,1200,t+.3,.08,'square',.03);note(c,1500,t+.42,.08,'square',.03);},
alarm(c,t){[0,.5].forEach(d=>{note(c,880,t+d,.22,'square',.05);note(c,660,t+d+.24,.22,'square',.05);});},
research(c,t){[659,784,988,1319].forEach((f,i)=>note(c,f,t+i*.08,.4,'sine',.05));},
bubble(c,t){[0,.07,.16,.22].forEach((d,i)=>note(c,500+i*130,t+d,.09,'sine',.04));},
/* v4: instrument sounds for the rover */
scan(c,t){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(380,t);o.frequency.exponentialRampToValueAtTime(1400,t+.5);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+.05);g.gain.exponentialRampToValueAtTime(.001,t+.6);o.connect(g).connect(A.fxG);o.start(t);o.stop(t+.65);note(c,1568,t+.6,.18,'sine',.04);},
shutter(c,t){const n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();n.buffer=noiseBuffer(c);f.type='bandpass';f.frequency.value=2600;g.gain.setValueAtTime(.6,t);g.gain.exponentialRampToValueAtTime(.001,t+.09);n.connect(f).connect(g).connect(A.fxG);n.start(t);n.stop(t+.12);note(c,1900,t+.1,.05,'square',.02);},
horn(c,t){note(c,520,t,.12,'triangle',.05);note(c,520,t+.18,.12,'triangle',.05);},
levelup(c,t){[523,659,784,1047,1319].forEach((f,i)=>note(c,f,t+i*.09,.5,'triangle',.06));},badge(c,t){[784,1047].forEach((f,i)=>note(c,f,t+i*.1,.45,'sine',.06));},
/* Mars recordings (Perseverance, Ingenuity, InSight), imitated with synthesis: they are game sounds, not NASA audio. */
laser(c,t){const n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();n.buffer=noiseBuffer(c);f.type='highpass';f.frequency.value=3200;g.gain.setValueAtTime(.5,t);g.gain.exponentialRampToValueAtTime(.001,t+.05);n.connect(f).connect(g).connect(A.fxG);n.start(t);n.stop(t+.07);[.09,.17,.25].forEach(d=>{const m=c.createBufferSource(),h=c.createGain(),b=c.createBiquadFilter();m.buffer=noiseBuffer(c);b.type='bandpass';b.frequency.value=2400;h.gain.setValueAtTime(.45,t+d);h.gain.exponentialRampToValueAtTime(.001,t+d+.03);m.connect(b).connect(h).connect(A.fxG);m.start(t+d);m.stop(t+d+.05);});},
crunch(c,t){for(let i=0;i<3;i++){const s=t+i*.045+Math.random()*.02,n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();n.buffer=noiseBuffer(c);f.type='bandpass';f.frequency.value=700+Math.random()*900;g.gain.setValueAtTime(.35,s);g.gain.exponentialRampToValueAtTime(.001,s+.05);n.connect(f).connect(g).connect(A.fxG);n.start(s);n.stop(s+.07);}},
gust(c,t){const n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();n.buffer=noiseBuffer(c);f.type='bandpass';f.Q.value=.8;f.frequency.setValueAtTime(260,t);f.frequency.exponentialRampToValueAtTime(900,t+1.1);f.frequency.exponentialRampToValueAtTime(300,t+2.4);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.55,t+1.1);g.gain.exponentialRampToValueAtTime(.001,t+2.5);n.connect(f).connect(g).connect(A.fxG);n.start(t);n.stop(t+2.6);for(let i=0;i<40;i++){const s=t+.9+Math.random()*1.2,m=c.createBufferSource(),h=c.createGain(),b=c.createBiquadFilter();m.buffer=noiseBuffer(c);b.type='highpass';b.frequency.value=3500;h.gain.setValueAtTime(.12,s);h.gain.exponentialRampToValueAtTime(.001,s+.02);m.connect(b).connect(h).connect(A.fxG);m.start(s);m.stop(s+.03);}},
heli(c,t){const o=c.createOscillator(),l=c.createOscillator(),lg=c.createGain(),g=c.createGain();o.type='triangle';o.frequency.value=84;l.frequency.value=38;lg.gain.value=.03;l.connect(lg).connect(g.gain);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.05,t+.4);g.gain.setValueAtTime(.05,t+1.4);g.gain.exponentialRampToValueAtTime(.001,t+2);o.connect(g).connect(A.fxG);o.start(t);l.start(t);o.stop(t+2.1);l.stop(t+2.1);},
quake(c,t){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.setValueAtTime(46,t);o.frequency.exponentialRampToValueAtTime(30,t+2.2);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.2,t+.5);g.gain.exponentialRampToValueAtTime(.001,t+2.4);o.connect(g).connect(A.fxG);o.start(t);o.stop(t+2.5);const b=c.createOscillator(),h=c.createGain();b.type='sine';b.frequency.setValueAtTime(220,t+2.3);b.frequency.exponentialRampToValueAtTime(90,t+2.6);h.gain.setValueAtTime(.08,t+2.3);h.gain.exponentialRampToValueAtTime(.001,t+2.7);b.connect(h).connect(A.fxG);b.start(t+2.3);b.stop(t+2.8);},
whir(c,t){const o=c.createOscillator(),g=c.createGain();o.type='sawtooth';o.frequency.setValueAtTime(180,t);o.frequency.exponentialRampToValueAtTime(420,t+.35);o.frequency.exponentialRampToValueAtTime(260,t+.6);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.025,t+.08);g.gain.exponentialRampToValueAtTime(.001,t+.65);const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=900;o.connect(f).connect(g).connect(A.fxG);o.start(t);o.stop(t+.7);},
/* The "home" motif: five bell notes. Major for a mission that went well, slower and minor when it did not. */
themeUp(c,t){[440,523,659,587,440].forEach((f,i)=>{note(c,f,t+i*.42,1.6,'sine',.07);note(c,f*2,t+i*.42,1.1,'triangle',.018);});note(c,220,t,3.2,'sine',.05);note(c,330,t+.4,3,'sine',.035);},
themeDown(c,t){[440,523,415,392,330].forEach((f,i)=>{note(c,f,t+i*.6,1.9,'sine',.065);});note(c,220,t,3.8,'sine',.05);}
};
function sfx(name){if(A.cb)try{A.cb(name);}catch(e){}if(!A.on)return;const c=ctx();if(!c||!SFX[name])return;try{c.resume&&c.resume();SFX[name](c,c.currentTime+.01);}catch(e){}}

/* ---- Words ---- */
const DELAYS=[4,7,12,16,19,22];
function delayFor(sol){return DELAYS[(sol*2+1)%DELAYS.length];}
function airFood(s){return `Air ${s.air}, food ${s.food}, safety ${s.rad}.`;}
const CALM=[
 s=>`Dear Earth, the Sun behaved today. We counted ${s.samples.length} of our 3 rocks, checked the plants and gave the air maker a pep talk. ${airFood(s)}`,
 s=>`Dear Earth, a quiet day. Pip tried to teach the solar panels to whistle. They declined. ${airFood(s)}`,
 s=>`Dear Earth, nothing exploded, which Pip is filing under "good news". ${airFood(s)}`
];
const WATCH=[
 s=>`Dear Earth, the forecast said Watch, so we kept trips outside short and stayed close to the shelter. ${airFood(s)}`,
 s=>`Dear Earth, the Sun was grumbling. We did not argue with it. ${airFood(s)}`
];
const STORM=[
 s=>`Dear Earth, the Sun had a very bad day and sent it our way. We spent it in the shelter, which Pip calls "cosy". Pip says that about everything. ${airFood(s)}`,
 s=>`Dear Earth, we waited out the storm together. It was loud in my head and quiet in the room. Everyone is fine. ${airFood(s)}`
];
function letter(res,s){const n=res.ended,pool=res.failed?null:(res.risk===2?STORM:res.risk===1?WATCH:CALM);
let body;if(res.failed)body=`Dear Earth, supplies ran low, so Pip called for an early pickup. Nobody is hurt. We are going to try again with a better plan.`;else body=pool[(n-1)%pool.length](s);
const mins=delayFor(n);return {body,mins,line:`Sent. Earth reads this in about ${mins} minutes. Radio waves travel at the speed of light, and Mars is far away.`};}
function epilogue(s,failed){
if(s.success)return {tone:'up',title:'You made Mars a home.',body:'Dear Earth, five sols. All of us are still here. We did not beat the Sun, because nobody can. We watched it, planned around it and looked after each other. Pip asked me to say it was never worried. Pip was worried.',lesson:'You cannot control the weather. You can control your plan. Real NASA teams watch the Sun every day for the same reason, so astronauts can get to shelter in time.'};
return {tone:'down',title:failed?'Every explorer learns.':'A good start, commander.',body:'Dear Earth, we are coming home early and that is allowed. Every crew that ever flew learned something the first time. We left a light on at the outpost for whoever lands next.',lesson:'Next crew, read the forecast first. Storm days need the shield built and a night in the shelter, so plan the days before them.'};}
function prologueCards(meta){const range=meta&&meta.range?meta.range:'a week of space weather';
return [
 {h:'Welcome to Mars, commander.',p:`Earth is a bright little dot, 3 to 22 minutes away, so every choice matters. The Sun throws out flares and fast particles, and only your shelter protects you here. Your mission days are real weather NASA recorded: ${range}. Pip, your robot buddy, will show you the first job.`}
];}
const QUIPS={storm:['Storm day! Shield first, heroics later.','The Sun is being dramatic again. We have a shelter. We win.'],calm:['Calm day. Suspiciously calm. I love it.'],watch:['A Watch day. That means keep your trips short and your sense of humour long.'],done:['Another job done. I would clap, but I only have grabbers.','Nicely done. I am telling the rocks about this.','Tidy work, commander.'],dust:['Dust storm! The panels are wearing a brown blanket.'],devil:['A dust devil! Free panel cleaning. Mars has style.'],cold:['Brr. Cold night. Eat a little extra, it is science.'],build:['A new building! The base is starting to look like a town.','Construction complete. I cut the ribbon with my grabber.']};
function quip(k,i){const a=QUIPS[k]||[''];return a[(i||0)%a.length];}
/* v3: three independent channels under the master volume, and a rover motor loop on the ambience channel. */
function setMix(m,a,f){const cl=v=>Math.max(0,Math.min(1,+v||0));A.mix={musicG:cl(m),ambG:cl(a),fxG:cl(f)};if(A.ctx)for(const k of ['musicG','ambG','fxG'])if(A[k])A[k].gain.setTargetAtTime(A.mix[k],A.ctx.currentTime,.1);}
function rover(on){const c=ctx();if(!c)return;if(on&&A.on){if(A.rv)return;try{const o=c.createOscillator(),o2=c.createOscillator(),f=c.createBiquadFilter(),g=c.createGain();o.type='sawtooth';o.frequency.value=58;o2.type='square';o2.frequency.value=87;f.type='lowpass';f.frequency.value=260;g.gain.value=0;g.gain.setTargetAtTime(.05,c.currentTime,.3);o.connect(f);o2.connect(f);f.connect(g).connect(A.ambG);o.start();o2.start();A.rv={o,o2,g};}catch(e){}}else if(A.rv){const r=A.rv;A.rv=null;try{r.g.gain.setTargetAtTime(0,c.currentTime,.2);r.o.stop(c.currentTime+.8);r.o2.stop(c.currentTime+.8);}catch(e){}}}
function setVolume(v){A.vol=Math.max(0,Math.min(1,v));if(A.on&&A.master)A.master.gain.setTargetAtTime(A.vol,A.ctx.currentTime,.1);}root.Story={audio:{setMix,rover,setVolume,onSfx:f=>{A.cb=f;},enable,mood:setMood,sfx,theme:up=>sfx(up?'themeUp':'themeDown'),isOn:()=>A.on},letter,epilogue,prologueCards,quip};
if(typeof module!=='undefined')module.exports=root.Story;
})(typeof window!=='undefined'?window:globalThis);
