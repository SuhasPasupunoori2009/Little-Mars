/* ===== Little Mars v4 layer: core =====
   build.py joins the files in source/v4 and places them inside game.js after the v3 layer, so they share its variables.
   This file holds the shared v4 state and every hook that game.js and v3ui.js call (v4New, v4After, v4Night, v4HUD, v4Sync,
   v4Frame, v4Busy, v4Reset, v4Station, v4Speak, v4PipAnswer). Rules live in model.js and model4.js; nothing here changes a
   number on its own. Other files: world.js (scenery and weather), rover.js (driving), colony.js (dashboard),
   science.js (journal, experiments, NASA explorer), missions.js (modes, missions, score), saves.js (slots, export, settings). */
const M4 = window.Mars4;
let v4Mode = 'storm', v4Opts = { supplies: false, custom: null }, drv = null, cine4 = null;
profile.journal = Array.isArray(profile.journal) ? profile.journal : [];
profile.custom = Array.isArray(profile.custom) ? profile.custom : [];
for (const [k, d] of [['vr', 92], ['vv', 100]]) if (typeof acc[k] !== 'number') acc[k] = d;
if (!['auto', 'high', 'balanced', 'performance'].includes(acc.perf)) acc.perf = 'auto';
if (typeof acc.avoid !== 'boolean') acc.avoid = true;
Object.assign(SND_CAP, { scan: '[scanner sweep]', shutter: '[camera shutter]', horn: '[soft double beep]', laser: '[laser snaps on a rock]', crunch: '[wheels crunch on rock]', gust: '[dust devil wind]', heli: '[helicopter hum]', quake: '[low marsquake rumble]', whir: '[instrument motor whirs]' });
Object.assign(CAT_ICON, { water: 'air', geology: 'rock0', auto: 'rover' });
Object.assign(MISSION_ICON, { gen: 'rover' });

/* True while the player is driving or a v4 cinematic is playing: walking, clicking the ground and the console are held off. */
function v4Busy() { return !!drv || !!cine4; }
function v4El(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

/* ---------- starting a mission in the chosen mode ---------- */
function v4Week(w) {
  const md = M4.MODES[v4Mode] || M4.MODES.storm, seed = Math.floor(Math.random() * 99999);
  if (v4Mode === 'lab' || (v4Mode === 'explore' && !v4Opts.supplies)) return SW.practiceWeek(30);
  if (v4Mode === 'explore') return SW.practiceWeek(12);
  if (md.sols > 5) return SW.archiveSpan(seed, md.sols);   /* long missions always use the archive: a live week has only five days */
  return w;
}
function v4New() { siteWay = null; M4.applyMode(state, v4Mode, { supplies: v4Opts.supplies, custom: v4Opts.custom }); v4Drive(false, true); }
function v4Welcome() {
  const n = state.days.length;
  return ({
    storm: 'Welcome to Mars! I’m Pip. These five sols are real days of space weather from NASA. Check the outlook, then plant tomorrow’s food.',
    story: 'Welcome to the Story Expedition! ' + n + ' sols of real NASA space weather and six chapters. Water matters now: the Ice crater and a water extractor both add some. Open Missions to see the chapters.',
    builder: 'Welcome, builder! ' + n + ' sols to raise a colony that lasts. Kits make building cheaper, but modules wear out, so check the Colony dashboard and repair them.',
    explore: state.sandbox ? 'Free Exploration! Nothing runs out here. Walk to the rover and drive it yourself, or send it from the map.' : 'Free Exploration with supplies on. There are no goals, only Mars. Keep an eye on air, food and water.',
    lab: 'Welcome to the Science Lab. Every experiment is free here. Open Control and choose Science lab, or press L.',
    custom: 'Your own mission! Finish every objective you chose within five sols. Open Missions to see them.'
  })[state.mode] || 'Welcome to Mars!';
}
function v4Reset() { v4Mode = (state && M4.MODES[state.mode] && !M4.MODES[state.mode].ui) ? state.mode : 'storm'; v4Drive(false, true); cine4 = null; document.body.classList.remove('v4cine'); if (typeof w4Reset === 'function') w4Reset(); }

/* ---------- after every action and every night ---------- */
function v4Journal(e) { if (M4.journalAdd(profile.journal, { ...e, sol: state.sol, when: (M.today(state).date || '') })) { saveProfile(); return true; } return false; }
function v4MissionTick() {
  const run = runEarned(), got = [];
  for (const m of M4.tick(state)) { if (run.earned['g:' + m.id]) continue; run.earned['g:' + m.id] = 1; profile.xp += m.xp; got.push(m); if (state.crew) state.crew.xp[(state.sol - 1) % 2] += m.xp; }
  if (got.length) { state.level = M.levelOf(profile.xp).level; saveProfile(); renderBand(); Story.audio.sfx('badge'); setTimeout(() => say('Mission complete: ' + got.map(m => m.name + ' (+' + m.xp + ' XP)').join(', ') + '.', true, 'cheer'), 900); }
  return got;
}
function v4After(id, res) {
  const [t, k] = id.split(':');
  if (t === 'scan') { const l = M.locations.find(x => x.id === k); v4Journal({ t: 'rock', id: k, name: l ? l.name : k, text: rockFacts[+k.slice(-1)] || '' }); }
  if (t === 'explore') { const S = M.SITES[k]; v4Journal({ t: 'site', id: k, name: S.name, text: S.found + ' ' + S.text }); }
  if (t === 'find') { const D = M.FINDS[k]; v4Journal({ t: D.kind, id: k, name: D.name, text: D.text, extra: D.kind === 'rock' ? 'Class: ' + D.cls + ' · Looks: ' + D.look + ' · Probably made of: ' + D.made : '' }); Story.audio.sfx(D.kind === 'photo' ? 'shutter' : 'scan'); setTimeout(() => Story.audio.sfx(D.kind === 'photo' ? 'heli' : 'laser'), 700); }
  if (t === 'lab' && LABUI[k]) v4Journal({ t: 'lab', id: k, name: M.LABS[k].name, text: LABUI[k].learn });
  if (t === 'research') v4Journal({ t: 'tech', id: k, name: M.TECH[k].name, text: M.TECH[k].text });
  if (t === 'build' && typeof w4Construct === 'function') w4Construct(k);
  if (t === 'observe') { Story.audio.sfx('scan'); setTimeout(() => Story.audio.sfx('whir'), 650); }
  if (t === 'uplink') Story.audio.sfx('radio');
  if (t === 'repair') Story.audio.sfx('build');
  v4MissionTick();
}
function v4Night(res) {
  v4MissionTick();
  if (res && res.final) {
    const r = M4.report(state), md = M4.MODES[state.mode] || M4.MODES.storm;
    v4Journal({ t: 'report', id: 'run' + (state.runId || 0), name: md.name + ': ' + (state.success ? 'mission accomplished' : 'mission ended early') + ' (' + r.total + '/100)',
      text: 'Sols played: ' + res.ended + ' of ' + state.days.length + '. ' + r.parts.map(p => p.name + ' ' + p.pts + '/' + p.max).join(' · ') + '.', extra: (state.weekMeta && state.weekMeta.range) || '' });
  }
}

/* ---------- HUD: water, clock, temperature, side missions ---------- */
function v4HUD() {
  let w = $('waterStat');
  if (!w) {
    w = v4El('div', 'stat', '<div class="name"><svg class="ico" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/></svg>Water</div><strong id="waterValue">0</strong><small id="waterCap">/60</small><div class="line"><i id="waterBar"></i></div>');
    w.id = 'waterStat'; w.style.setProperty('--c', '#6fc3ff'); $('foodStat').after(w);
    const g = v4El('span', '', ''); g.id = 'genStatus'; $('rpStatus').after(g);
    const c = v4El('div', 'v4clock', ''); c.id = 'v4Clock'; c.setAttribute('role', 'status'); $('weather').after(c);
  }
  w.hidden = state.water == null;
  if (state.water != null) { const C = M.wcap(state); $('waterValue').textContent = state.water; $('waterCap').textContent = '/' + C; $('waterBar').style.width = Math.min(100, state.water / C * 100) + '%'; w.classList.toggle('low', state.water < M.waterNight(state) * 2); }
  const ck = M4.clock(state), sn = M4.sensors(state, 0, 0, 0), md = M4.MODES[state.mode] || M4.MODES.storm;
  $('v4Clock').innerHTML = `<span><b>${ck.text}</b> ${ck.part}</span><span title="${sn.label}">${sn.tempC} <small>simulated</small></span><span>${md.name}${state.sandbox ? ' · supplies off' : ''}</span>`;
  const g = state.gen || [], dn = g.filter(m => M4.missionDone(state, m)).length; $('genStatus').textContent = g.length ? dn + ' / ' + g.length + (state.mode === 'story' ? ' chapters' : ' side missions') : '';
  $('genStatus').hidden = !g.length;
  if (state.sandbox) $('weather').textContent = '☀ Free play · nothing is used up · rest whenever you like';
  document.body.classList.toggle('v4sandbox', !!state.sandbox);
  if (drv && typeof d4HUD === 'function') d4HUD();
}

/* ---------- extra buttons on station panels ---------- */
function v4Station(id) {
  const P = $('panel'), row = (html) => { const d = v4El('div', 'v4row', html); P.appendChild(d); return d; };
  if (id === 'rover') {
    const why = trip ? 'The rover is out on a trip.' : '';
    row(`<h3>Drive it yourself</h3><p class="source-note">Take the wheel and explore: W A S D or the arrow keys to drive, Space to brake, E to use an instrument, Esc to get out. Driving is free; trips to far sites and discoveries cost the same supplies as before.</p><button class="primary" id="v4DriveBtn" ${why ? 'disabled' : ''}>Drive the rover →</button>${why ? `<p class="source-note">${why}</p>` : ''}`);
    $('v4DriveBtn').onclick = () => v4Drive(true);
  }
  if (id === 'home') { const r = row('<div class="menu-row"><button class="secondary" data-v4con="colony">Colony dashboard</button><button class="secondary" data-v4con="journal">Exploration journal</button></div>'); r.querySelectorAll('[data-v4con]').forEach(b => b.onclick = () => openConsole(b.dataset.v4con)); }
  if (id === 'comms') { const r = row('<div class="menu-row"><button class="secondary" data-v4con="history">NASA data explorer</button></div>'); r.querySelector('button').onclick = () => openConsole('history'); }
  if (id.startsWith('pad') && state.modules[id]) {
    const t = state.modules[id], act = { obs: 'observe', ccentre: 'uplink', alab: 'analyse' }[t]; let h = '';
    if (state.cond) { const c = state.cond[id] == null ? 100 : state.cond[id]; h += `<div class="card"><strong>Condition: ${c}% ${c <= 0 ? '· offline ✖' : c < 50 ? '· worn ⚠' : '· good ✓'}</strong><p>Modules lose about 15% each night and 30% in a dust storm. At 0% a module stops working until it is repaired.</p></div>` + (c < 100 ? actionHTML('repair:' + id) : ''); }
    if (act) h += actionHTML(act);
    const hist = (state.hist || []).filter(x => x.pid === id);
    if (hist.length) h += `<details class="ladder"><summary>Construction history</summary><ol>${hist.map(x => `<li><b>Sol ${x.sol}</b><small>${esc(x.what)}</small></li>`).join('')}</ol></details>`;
    if (h) row(h);
  }
}

/* ---------- Pip: voice and state-based answers ---------- */
function v4Speak(text) {
  if (!narration || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text).replace(/[↗→✓✖⚠·]/g, ' '));
    u.rate = clamp(acc.vr / 100, .6, 1.4); u.volume = clamp(acc.vv / 100, 0, 1);
    u.onstart = () => v4Speaking(true); u.onend = u.onerror = () => v4Speaking(false);
    speechSynthesis.speak(u);
  } catch (e) { v4Speaking(false); }
}
function v4Speaking(on) {
  let b = $('v4Stop');
  if (!b) { b = v4El('button', 'v4stop', 'Stop reading'); b.id = 'v4Stop'; b.hidden = true; b.onclick = v4StopSpeak; document.body.appendChild(b); }
  b.hidden = !on;
}
function v4StopSpeak() { try { speechSynthesis.cancel(); } catch (e) {} v4Speaking(false); }
function v4Place() {
  if (drv) { const s = d4NearSite(); return 'driving the rover ' + (s ? 'at the ' + M.SITES[s].name : Math.hypot(drv.v.x, drv.v.z) < 24 ? 'around the landing site' : 'across open ground, ' + Math.round(Math.hypot(drv.v.x, drv.v.z)) + ' metres from the habitat'); }
  return near ? 'at the ' + (near.pad && state.modules[near.id] ? M.MODULES[state.modules[near.id]].name : near.name) : 'at the landing site';
}
function v4PipAnswer(q) { const g = getQuest(); return M4.pipAnswer(state, q, { place: v4Place(), quest: g.title + '. ' + g.text, journalTotal: profile.journal.length }); }

/* ---------- performance: profiles and a real frame-time meter ---------- */
const v4Perf = { n: 0, sum: 0, sq: 0, worst: 0, t0: performance.now(), firstFrame: 0, playAt: 0 };
function v4ApplyPerf() {
  const name = acc.perf === 'auto' ? 'high' : acc.perf, P = M4.PERF[name];
  PR = Math.min(devicePixelRatio || 1, P.pixelRatio); renderer.setPixelRatio(PR);
  if (sun.shadow.mapSize.x !== P.shadow) { sun.shadow.mapSize.set(P.shadow, P.shadow); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  qStep = acc.perf === 'auto' ? 0 : 2;                       /* a chosen profile switches the automatic step-down off */
  if (typeof w4Detail === 'function') w4Detail(P);
  resize(); v4Perf.n = 0; v4Perf.sum = 0; v4Perf.sq = 0; v4Perf.worst = 0;
}
function v4PerfRead() {
  const p = v4Perf; if (p.n < 30) return null;
  const avg = p.sum / p.n, sd = Math.sqrt(Math.max(0, p.sq / p.n - avg * avg));
  return { frames: p.n, fps: Math.round(1000 / avg), avgMs: +avg.toFixed(1), sdMs: +sd.toFixed(1), worstMs: +p.worst.toFixed(1), firstFrameMs: Math.round(p.firstFrame), toPlayMs: p.playAt ? Math.round(p.playAt) : null,
    heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, profile: acc.perf };
}
let v4Last = 0;
function v4Frame(dt, moving) {
  const now = performance.now();
  if (!v4Perf.firstFrame) v4Perf.firstFrame = now - v4Perf.t0;
  if (started && !v4Perf.playAt) v4Perf.playAt = now - v4Perf.t0;
  if (v4Last && !document.hidden && !paused) { const ms = now - v4Last; if (ms < 1000) { v4Perf.n++; v4Perf.sum += ms; v4Perf.sq += ms * ms; if (ms > v4Perf.worst) v4Perf.worst = ms; if (v4Perf.n > 3000) { v4Perf.n /= 2; v4Perf.sum /= 2; v4Perf.sq /= 2; } } }
  v4Last = now;
  w4Frame(dt, moving); d4Frame(dt); if (cine4) c4Frame(dt);
}
function v4Sync(animate) { w4Sync(animate); if (typeof d4Sync === 'function') d4Sync(); }
