/* v4 rules: neutrality for the original campaign, water, wear, the seven new modules, six new technologies, new actions,
   discoveries, free play, game modes and their winnability, the mission generator, the score report, rover physics,
   simulated sensors, Pip's state-based answers, NASA data handling, saves (with real v2 and v3 save files) and two-player turns.
   Run from this folder: node test-v4.cjs   (needs only Node) */
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const M = require('./model.js'), SW = require('./spaceweather.js'), V = require('./model4.js');
const root = [path.resolve(__dirname, '..', '..'), path.resolve(__dirname, '..')].find(r => fs.existsSync(path.join(r, 'data', 'donki-daily.json')));
const DATA = JSON.parse(fs.readFileSync(path.join(root, 'data', 'donki-daily.json'), 'utf8'));
globalThis.DONKI_DAILY = DATA;
const day = risk => ({ date: null, risk, flare: null, sep: false, kp: 0, cmeSpeed: 0, ids: [] });
const calm = (n = 5) => { const s = M.initial(7, Array.from({ length: n }, () => day(0))); s.alerts = s.alerts.map(() => null); s.events = s.events.map(() => null); s.dust = []; return s; };
const rich = s => { s.power = 40; s.air = 100; s.food = 100; s.minutes = 0; s.rad = 100; return s; };
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const act = (s, id) => { const r = M.apply(s, id); assert.equal(r.ok, true, id + ': ' + r.reason); return r; };
const V4_FIELDS = ['mode', 'water', 'cond', 'finds', 'gen', 'hist', 'risky', 'obsSol', 'upSol', 'analysed', 'sandbox', 'medUsed'];

/* 1. The original campaign is untouched: a state with no v4 field plays to the same numbers as a v4 state. */
{
  const script = ['plant', 'scan:rock0', 'build:pad0:solar', 'END', 'light', 'air', 'upgrade:pad0', 'explore:ice', 'END', 'harvest', 'scan:rock1', 'shield', 'END'];
  const run = strip => { const s = calm(); if (strip) for (const k of V4_FIELDS) delete s[k]; for (const id of script) { if (id === 'END') M.end(s, false); else M.apply(s, id); } return [s.sol, s.power, s.air, s.food, s.rad, s.rp, s.samples.length, s.growth]; };
  ok(JSON.stringify(run(true)) === JSON.stringify(run(false)), 'a state without v4 fields plays by the same numbers');
  const s = calm();
  ok(M.desc('air', s).cost.power === 2 && M.desc('air', s).gain.air === 30, 'air maker unchanged without v4 modules');
  ok(M.desc('clean', s).cost.air === 4 && M.desc('scan:rock0', s).cost.time === 15 && M.desc('upgrade:pad0', { ...s, modules: { pad0: 'solar' } }).cost.power === 2, 'v3 costs unchanged without v4 technology');
  ok(s.water === null && s.cond === null && s.mode === 'storm' && !s.sandbox, 'a new mission starts as the original campaign with water and wear off');
  ok(M.winOK({ ...s, shield: true, harvested: true, samples: ['a', 'b', 'c'], delivered: true }) && !M.winOK(s), 'the original four goals still decide a win');
  const e = calm(); const r = M.end(e, false); ok(r.wN === 0 && e.water === null, 'nights do not touch water when it is off');
}

/* 2. The seven new modules each change a rule */
{
  for (const t of ['well', 'ghx', 'grid', 'med', 'obs', 'ccentre', 'alab']) { ok(M.MODULES[t] && M.UPTEXT[t] && M.UNLOCK.modules[t] > 1, 'module ' + t + ' has text, an upgrade and an unlock level'); const s = rich(calm()); ok(act(s, 'build:pad1:' + t) && s.modules.pad1 === t && s.hist.length === 1, 'module ' + t + ' can be built and is logged in the construction history'); }
  let s = rich(calm()); const a0 = M.desc('air', s).gain.air; act(s, 'build:pad0:well'); ok(M.desc('air', s).gain.air === a0 + 5, 'water extractor: air maker gives 5 more air');
  rich(s); act(s, 'upgrade:pad0'); ok(M.desc('air', s).gain.air === a0 + 7, 'water extractor Level 2: 2 more');
  s = rich(calm()); s.food = 50; act(s, 'build:pad0:ghx'); M.end(s, false); ok(s.food === 50 + 4 - 12, 'greenhouse wing adds 4 food each night');
  s = rich(calm()); act(s, 'build:pad0:grid'); ok(M.desc('air', s).cost.power === 1, 'power hub: air maker costs 1 power'); s.power = 9; M.end(s, false); ok(s.power === 8 + 3, 'power hub saves 3 power overnight');
  s = rich(calm()); s.rad = 50; s.days[0].risk = 1; const b = calm(); b.rad = 50; b.days[0].risk = 1; act(s, 'build:pad2:med'); const radAfterBuild = s.rad; M.end(s, false); M.end(b, false); ok(s.rad - radAfterBuild === (b.rad - 50) + 5, 'medical bay gives 5 Safety each night');
  s = rich(calm()); act(s, 'build:pad2:med'); s.days[0].risk = 2; s.shield = false; s.rad = 3; s.days[0].risk = 1; M.end(s, false); ok(s.rad > 0 && s.medUsed === true && !s.done, 'medical bay catches one night that would have ended the mission');
  s.rad = 3; s.days[s.sol - 1].risk = 1; M.end(s, false); ok(s.done && !s.success, 'the emergency save works only once');
  s = rich(calm()); ok(/Observatory/.test(M.reason(s, 'observe')), 'observing needs an observatory'); act(s, 'build:pad0:obs'); const rp0 = s.rp; act(s, 'observe'); ok(s.rp === rp0 + 1 && /already/.test(M.reason(s, 'observe')), 'observatory: 1 point, once a sol');
  M.end(s, false); s.days[s.sol - 1].risk = 1; rich(s); const rp1 = s.rp; act(s, 'observe'); ok(s.rp === rp1 + 2, 'an active Sun gives the observatory 1 extra point');
  s = rich(calm()); ok(/Comms centre/.test(M.reason(s, 'uplink'))); act(s, 'build:pad0:ccentre'); const u0 = s.rp; act(s, 'uplink'); ok(s.rp === u0 + 1 && /already/.test(M.reason(s, 'uplink')), 'comms centre: one exchange a sol');
  s.commsDown = 90; s.upSol = 0; ok(/down until/.test(M.reason(s, 'uplink')), 'no exchange while the radio is down');
  s = rich(calm()); act(s, 'build:pad0:alab'); ok(/No new samples/.test(M.reason(s, 'analyse')), 'nothing to analyse without samples'); act(s, 'scan:rock0'); rich(s); act(s, 'scan:rock1'); const r0 = s.rp; rich(s); act(s, 'analyse'); ok(s.rp === r0 + 2 && /No new/.test(M.reason(s, 'analyse')), 'sample lab: 1 point per unstudied sample');
  const sc0 = M.score(calm()).parts.find(p => p.key === 'life').pts; s = rich(calm()); act(s, 'build:pad0:med'); ok(M.score(s).parts.find(p => p.key === 'life').pts > sc0, 'new life-support modules count in the sustainability score');
}

/* 3. The six new technologies each change the rule they claim */
{
  const T = k => { const s = rich(calm()); s.tech = { [k]: true }; return s; }, base = rich(calm());
  ok(Object.keys(M.TECH).length === 18 && Object.keys(M.TECH_CATS).length === 9, '12 kept technologies plus 6 new, in nine fields');
  for (const k of ['sol1', 'sol2', 'ox1', 'ox2', 'rad1', 'rad2', 'rov1', 'rov2', 'gh1', 'gh2', 'com1', 'com2']) ok(M.TECH[k], 'v3 technology ' + k + ' is kept');
  ok(M.desc('explore:ice', T('wat1')).gain.air === M.desc('explore:ice', base).gain.air + 10, 'ice drill: +10 air from the ice crater');
  { const w = T('wat1'); w.water = 20; ok(M.desc('explore:ice', w).gain.water === 20, 'ice drill: 20 water when water is tracked'); }
  ok(M.desc('air', T('wat2')).gain.air === 35 && M.waterNight(T('wat2')) === 4, 'water recycling: +5 air and 2 less water each night');
  ok(M.desc('scan:rock0', T('geo1')).cost.time === 10, 'field spectrometer: scans take 10 minutes');
  { const a = T('geo2'), b = rich(calm()); a.explored.ice = b.explored.ice = true; ok(M.desc('find:ice_ground', a).gain.rp === M.desc('find:ice_ground', b).gain.rp + 1 && M.desc('find:ice_photo', a).gain.rp === M.desc('find:ice_photo', b).gain.rp, 'ground radar: +1 point for rock and ground scans, not photographs'); }
  { const a = T('aut1'); a.dust = [1]; const d = M.desc('clean', a); ok(d.cost.air === 1 && d.cost.rad === 0, 'cleaning robot: 1 air and no Safety'); }
  { const a = T('aut2'); a.modules = { pad0: 'solar' }; const d = M.desc('upgrade:pad0', a); ok(d.cost.power === 1 && d.cost.time === 5, 'maintenance robots: cheaper, faster upgrades'); }
  { const s = rich(calm()); s.rp = 2; ok(/Research/.test(M.reason(s, 'research:wat2')) && act(s, 'research:wat1') && s.rp === 0, 'new technologies have prerequisites and costs'); }
}

/* 4. Water */
{
  let s = calm(); s.water = 40; M.end(s, false); ok(s.water === 34, 'the crew uses 6 water each night');
  s = rich(calm()); s.water = 40; act(s, 'build:pad0:well'); M.end(s, false); ok(s.water === 40, 'a water extractor adds 6 each morning');
  s = rich(calm()); s.water = 40; act(s, 'build:pad0:ghx'); ok(M.waterNight(s) === 8, 'a greenhouse wing uses 2 more water');
  s = calm(); s.water = 5; const r = M.end(s, false); ok(r.failed && s.done && !s.success, 'running out of water ends the mission');
  s = rich(calm()); s.water = 3; s.food = 50; act(s, 'build:pad0:ghx'); ok(M.ghxFood(s) === 0, 'a greenhouse wing grows nothing without enough water');
  s = rich(calm()); s.water = 55; act(s, 'explore:ice'); ok(s.water === 60 && M.wcap(s) === 60, 'water is capped by the tanks');
  rich(s); act(s, 'build:pad0:storage'); ok(M.wcap(s) === 90, 'a storage depot holds 30 more water');
}

/* 5. Wear and repair */
{
  const s = rich(calm(8)); s.cond = {}; act(s, 'build:pad0:solar'); ok(s.cond.pad0 === 100, 'a new module starts in perfect condition');
  M.end(s, false); ok(s.cond.pad0 === 85, 'a night wears a module by 15');
  ok(/perfect/.test(M.reason(Object.assign(rich(calm()), { cond: { pad0: 100 }, modules: { pad0: 'solar' } }), 'repair:pad0')), 'nothing to repair at 100%');
  s.cond.pad0 = 0; ok(M.broken(s, 'pad0') && M.genFor(s, s.sol) === 0 && M.count(s, 'solar') === 0, 'a worn-out module is offline');
  rich(s); act(s, 'repair:pad0'); ok(s.cond.pad0 === 100 && M.genFor(s, s.sol) > 0, 'a repair brings it back');
  const d = rich(calm(8)); d.cond = {}; act(d, 'build:pad0:solar'); d.events[0] = 'dust'; M.end(d, false); ok(d.cond.pad0 === 70, 'dust storms wear modules twice as fast');
  const a = rich(calm(8)); a.cond = {}; a.tech = { aut2: true }; act(a, 'build:pad0:solar'); M.end(a, false); ok(a.cond.pad0 === 92, 'maintenance robots halve the wear');
  const c = rich(calm()); act(c, 'build:pad0:solar'); M.end(c, false); ok(c.cond === null && /Nothing|perfect/.test(M.reason(c, 'repair:pad0')), 'no wear in the original campaign');
}

/* 6. Discoveries */
{
  ok(Object.keys(M.FINDS).length === 16, 'sixteen discovery spots');
  for (const [k, D] of Object.entries(M.FINDS)) { ok((D.site === 'base' || M.SITES[D.site]) && ['rock', 'ground', 'photo'].includes(D.kind) && D.text.length > 60 && isFinite(D.dx) && isFinite(D.dz), 'discovery ' + k + ' is complete'); if (D.kind === 'rock') ok(D.cls && D.look && D.made, 'rock ' + k + ' has a class, a look and a composition'); }
  for (const site of Object.keys(M.SITES)) ok(['rock', 'ground', 'photo'].every(kind => Object.values(M.FINDS).some(D => D.site === site && D.kind === kind)), 'site ' + site + ' has a rock, a ground scan and a photograph');
  const s = rich(calm()); ok(/Reach the Ice crater/.test(M.reason(s, 'find:ice_rock')), 'a discovery needs its site reached first'); act(s, 'explore:ice'); rich(s); const r0 = s.rp, m0 = s.minutes; act(s, 'find:ice_rock');
  ok(s.rp === r0 + 1 && s.finds.ice_rock === 1 && s.minutes === m0 + 5 && /already/.test(M.reason(s, 'find:ice_rock')), 'a discovery gives a point, takes 5 minutes and happens once');
  ok(M.reason(rich(calm()), 'find:base_photo') === '' && M.desc('find:base_photo', s).cost.power === 0, 'the base photograph needs no trip and photographs need no power');
  const e = rich(calm()); e.days[0].risk = 1; e.explored.canyon = e.explored.ice = true; ok(M.radCost(e, 'find:canyon_rock') > M.radCost(e, 'find:ice_rock'), 'exposed ground costs more Safety for discoveries too');
  ok(M.reason(s, 'find:nope') !== '' && !M.apply(s, 'find:nope').ok, 'unknown discoveries are refused');
}

/* 7. Free play */
{
  const s = V.applyMode(calm(30), 'lab'); const before = [s.power, s.air, s.food, s.rad];
  for (const id of ['plant', 'scan:rock0', 'explore:canyon', 'lab:thermal', 'build:pad0:rtg', 'shield']) act(s, id);
  ok(JSON.stringify([s.power, s.air, s.food, s.rad]) === JSON.stringify(before) && s.minutes === 0, 'free play: actions cost nothing and take no daylight');
  for (let i = 0; i < 40; i++) M.end(s, false); ok(!s.done && s.sol === 30 && s.air === 100 && s.food === 100, 'free play: nights use nothing and the mission never ends');
  ok(s.level === 99 && !M.lockText(s, 'build:pad0:rtg') && s.alerts.every(a => !a), 'free play: everything unlocked, no alerts');
}

/* 8. Modes and winnability */
{
  ok(Object.keys(V.MODES).length === 7 && Object.values(V.MODES).every(m => m.name && m.text.length > 40), 'seven modes, each described');
  const st = V.applyMode(M.initial(3, SW.archiveSpan(3, 8).days), 'story'); ok(st.water === 40 && st.gen.length === 6 && st.days.length === 8 && st.cond === null, 'Story Expedition: 8 sols, water, six chapters');
  const bd = V.applyMode(M.initial(3, SW.archiveSpan(3, 8).days), 'builder'); ok(bd.water === 40 && bd.cond && bd.gen.length <= 3, 'Colony Builder: water and wear');
  const ex = V.applyMode(M.initial(3, SW.practiceWeek(30).days), 'explore'); ok(ex.sandbox, 'Free Exploration: supplies off by default'); const ex2 = V.applyMode(M.initial(3, SW.practiceWeek(12).days), 'explore', { supplies: true }); ok(!ex2.sandbox && ex2.water === 40, 'Free Exploration can use supplies');
  const sm = V.applyMode(M.initial(3, SW.archiveWindow(3).days), 'storm'); ok(sm.water === null && sm.cond === null && sm.days.length === 5, 'the original mode stays the original');
  ok(JSON.stringify(V.lateEvents(5, 8)) === JSON.stringify(V.lateEvents(5, 8)), 'late weather events are repeatable');

  const t = (s, id) => M.reason(s, id) === '' && M.apply(s, id).ok;
  /* a careful player for the two long modes: shelter, food, air, rover science, then the colony */
  function playLong(mode, seed) {
    const s = V.applyMode(M.initial(seed, SW.archiveSpan(seed, 8).days), mode); let g = 0;
    while (!s.done && g++ < 200) {
      const risk = M.today(s).risk;
      if (!s.shield) t(s, 'shield'); if (!s.planted) t(s, 'plant'); if (s.planted) { if (s.growth >= 2) t(s, 'harvest'); else t(s, 'light'); } if (!s.planted) t(s, 'plant');
      if (s.air <= 55) t(s, 'air'); if (M.dirty(s) && !s.cleaned && s.power < 4) t(s, 'clean');
      for (const pid of Object.keys(s.modules)) if (s.cond && s.cond[pid] <= 40) t(s, 'repair:' + pid);
      const out = risk === 0 || (risk === 1 && s.rad >= 30);   /* outdoor work on calm days, or on Watch days only with Safety to spare */
      if (out && s.shield) for (const [pid, ty] of mode === 'builder' ? [['pad0', 'solar'], ['pad2', 'battery'], ['pad1', 'well'], ['pad3', 'garden'], ['pad4', 'recycler'], ['pad5', 'storage']] : [['pad2', 'battery'], ['pad3', 'garden'], ['pad0', 'solar']]) if (!s.modules[pid] && s.power >= M.desc('build:' + pid + ':' + ty, s).cost.power + 2) { t(s, 'build:' + pid + ':' + ty); break; }
      if (out && s.shield) { for (const k of ['ice', 'probe', 'river']) if (!s.explored[k]) { t(s, 'explore:' + k); break; }
      if (risk < 2 && s.shield && s.sol >= 5 && s.samples.length < 3) for (const k of ['ice', 'probe', 'river', 'lava', 'canyon']) if (s.samples.length < 3) t(s, 'explore:' + k);
        for (const f of ['ice_ground', 'probe_photo', 'probe_ground', 'river_photo', 'river_rock']) t(s, 'find:' + f); }
      if (s.rp >= 2 && !M.has(s, 'com1')) t(s, 'research:com1');
      if (s.samples.length >= 3 && !s.packet && !s.delivered) t(s, 'send'); if (s.packet && s.minutes < 60) t(s, 'wait');
      V.tick(s); const r = M.end(s, s.shield && risk >= 1); V.tick(s); if (!r.ok) return { s, stuck: r.reason };
    }
    return { s };
  }
  let story = 0, builder = 0; const N = 120, fails = [];
  for (let seed = 1; seed <= N; seed++) { const a = playLong('story', seed); if (a.s.success) story++; else fails.push('story ' + seed + ' ' + (a.stuck || '') + ' sh' + +a.s.shield + ' hv' + +a.s.harvested + ' sm' + a.s.samples.length + ' dl' + +a.s.delivered + ' sol' + a.s.sol + ' risks ' + a.s.days.map(d => d.risk).join('') + ' air ' + a.s.air + ' food ' + a.s.food + ' water ' + a.s.water + ' rad ' + a.s.rad + ' ch ' + a.s.gen.filter(m => V.missionDone(a.s, m)).length); const b = playLong('builder', seed); if (b.s.success) builder++; else fails.push('builder ' + seed + ' mods ' + Object.keys(b.s.modules).length + ' score ' + M.score(b.s).total + ' w ' + b.s.water + ' rad ' + b.s.rad); }
  console.log('careful bot wins on real 8-day spans: Story Expedition ' + story + '/' + N + ', Colony Builder ' + builder + '/' + N); if (fails.length) console.log(fails.slice(0, 14).join('\n'));
  ok(story >= N * 0.9, 'Story Expedition is winnable on at least 90% of real spans by a simple bot (' + story + '/' + N + ')');
  ok(builder >= N * 0.9, 'Colony Builder is winnable on at least 90% of real spans by a simple bot (' + builder + '/' + N + ')');
  const lazy = V.applyMode(M.initial(1, SW.archiveSpan(1, 8).days), 'builder'); lazy.power = 99; M.apply(lazy, 'shield'); for (let i = 0; i < 20 && !lazy.done; i++) M.end(lazy, true); ok(!lazy.success, 'a colony that builds nothing does not win Colony Builder');
}

/* 9. Mission generator */
{
  let made = 0; const seenTpl = new Set();
  for (let seed = 1; seed <= 300; seed++) for (const diff of ['easy', 'normal', 'hard']) {
    const s = M.initial(seed, SW.archiveWindow(seed).days); s.difficulty = diff; s.level = 1 + seed % 10; if (seed % 4 === 0) s.water = 40;
    const g = V.generate(s, seed, 3);
    ok(g.length === 3 && new Set(g.map(m => m.id)).size === 3, 'three different missions (seed ' + seed + ', ' + diff + ')');
    for (const m of g) { made++; seenTpl.add(m.tpl);
      assert.ok(V.feasible(s, m) && !V.missionDone(s, m), 'mission is not already done and nothing it needs is locked: ' + m.id);
      assert.ok(m.name && m.text && m.xp > 0 && m.cat && m.parts.length && m.parts.every(p => typeof V.CHECK[p.t] === 'function'), 'mission has words, XP and a real completion test: ' + m.id);
      for (const p of m.parts) { if (p.t === 'explore') assert.ok(M.needLevel('explore:' + p.a) <= s.level, 'site unlocked'); if (p.t === 'build') assert.ok(M.needLevel('build:pad0:' + p.a) <= s.level, 'module unlocked'); if (p.t === 'water') assert.ok(s.water != null, 'water missions only when water is tracked'); }
    }
    ok(JSON.stringify(V.generate(s, seed, 3)) === JSON.stringify(g), 'same state and seed give the same missions');
  }
  console.log('generated ' + made + ' missions from ' + seenTpl.size + ' of ' + Object.keys(V.TEMPLATES).length + ' templates');
  ok(seenTpl.size >= 11, 'the generator uses nearly every template');
  /* every template can actually be completed by doing what it says */
  const done = { explore: s => act(s, 'explore:ice'), survey: s => { act(s, 'explore:ice'); for (const f of ['ice_rock', 'ice_ground', 'ice_photo']) act(rich(s), 'find:' + f); },
    finds: s => { act(s, 'explore:ice'); act(rich(s), 'explore:lava'); for (const f of ['ice_rock', 'ice_ground', 'ice_photo', 'lava_rock']) act(rich(s), 'find:' + f); },
    build: (s, m) => act(s, 'build:pad0:' + m.arg), expand: s => { ['pad0', 'pad1', 'pad2', 'pad3'].forEach(p => act(rich(s), 'build:' + p + ':solar')); },
    upgrade: s => { act(s, 'build:pad0:solar'); act(rich(s), 'build:pad1:solar'); act(rich(s), 'upgrade:pad0'); act(rich(s), 'upgrade:pad1'); }, research: (s, m) => { s.rp = 9; act(s, 'research:' + Object.keys(M.TECH).find(k => M.TECH[k].cat === m.arg && !M.TECH[k].pre)); },
    labwork: s => { for (const k of ['shield', 'solar', 'water']) act(rich(s), 'lab:' + k); }, stock: s => { rich(s); M.end(s, false); rich(s); }, water: s => { s.water = 60; },
    prepare: s => act(s, 'shield'), comms: s => { s.samples = ['a', 'b', 'c']; act(s, 'send'); for (let i = 0; i < 4; i++) act(s, 'wait'); },
    observe: s => { act(s, 'build:pad0:obs'); act(rich(s), 'observe'); } };
  for (const tpl of Object.keys(V.TEMPLATES)) { const s = rich(calm()); s.water = 20; s.days[3].risk = 2; const args = V.TEMPLATES[tpl].args(s); ok(args.length > 0, 'template ' + tpl + ' is offered on a fresh mission'); const m = V.makeMission(s, tpl, args[0], 0); s.gen = [m]; ok(!V.missionDone(s, m), tpl + ' starts not done'); done[tpl](s, m); const fresh = V.tick(s); ok(V.missionDone(s, m) && fresh.length === 1, 'template ' + tpl + ' can be completed'); }
  { const s = rich(calm()); const m = V.makeMission(s, 'stock', 'any', 0); s.gen = [m]; rich(s); M.end(s, false); rich(s); V.tick(s); s.air = 10; s.food = 10; ok(V.missionDone(s, m) && V.tick(s).length === 0, 'a finished mission stays finished and is only reported once'); }
  for (const D of V.DESIGNED) ok(D.parts.every(p => V.CHECK[p.t]) && D.why && D.text, 'designed mission ' + D.id + ' has a completion test and a science reason');
  { const s = rich(calm()); s.level = 1; ok(!V.feasible(s, V.DESIGNED.find(d => d.id === 'lander')) && V.feasible(s, V.DESIGNED.find(d => d.id === 'beneath')), 'feasibility respects level locks'); }
  { const s = V.applyMode(calm(), 'custom', { custom: [{ tpl: 'explore', arg: 'ice' }, { tpl: 'nonsense', arg: 'x' }, { tpl: 'beneath', arg: '' }] }); ok(s.gen.length === 2 && !M.winOK(s), 'Mission Creator drops unknown objectives'); act(rich(s), 'explore:ice'); act(rich(s), 'find:ice_ground'); V.tick(s); ok(M.winOK(s), 'a custom mission is won by finishing its objectives'); }
  { const s = V.applyMode(calm(), 'custom', { custom: [] }); ok(!M.winOK(s), 'a custom mission with no objectives cannot be won by doing nothing'); }
}

/* 10. Score report */
{
  const s = calm(), r = V.report(s); ok(r.parts.reduce((a, p) => a + p.max, 0) === 100 && r.total <= 100 && r.parts.every(p => p.why.length > 10 && p.pts >= 0 && p.pts <= p.max), 'seven parts, 100 points, each with a reason');
  const a = rich(calm()), b = rich(calm()); for (const x of [a, b]) { x.shield = true; x.shieldSol = 1; } b.days[0].risk = 2; act(b, 'scan:rock0'); a.samples.push('rock0');
  ok(b.risky === 1 && V.report(b).parts.find(p => p.key === 'decisions').pts < V.report(a).parts.find(p => p.key === 'decisions').pts, 'outdoor work during a storm lowers the score');
  ok(/storm/.test(V.report(b).parts.find(p => p.key === 'decisions').why), 'the report says why');
  const w = rich(calm()); w.shield = w.harvested = w.delivered = true; w.shieldSol = 1; w.samples = ['a', 'b', 'c']; ok(V.report(w).parts[0].pts === 30 && V.report(w).total > V.report(calm()).total, 'finishing the goals earns full completion marks');
}

/* 11. Rover physics */
{
  const flat = { height: () => 0, surface: () => 'packed', circles: [], limit: 0 };
  const drive = (fps, secs, input, terrain, v) => { v = v || { x: 0, z: 0, heading: 0, speed: 0, steer: 0 }; let last; for (let i = 0; i < fps * secs; i++) last = V.driveStep(v, input, 1 / fps, terrain || flat); return { v, last }; };
  const a = drive(30, 6, { throttle: 1 }).v, b = drive(120, 6, { throttle: 1 }).v;
  ok(Math.abs(a.x - b.x) / b.x < 0.03, 'distance covered does not depend on frame rate (' + a.x.toFixed(2) + ' m at 30 fps, ' + b.x.toFixed(2) + ' m at 120 fps)');
  ok(a.speed <= V.ROVER.maxFwd + 1e-9 && a.speed > 4, 'speed is capped at the top speed');
  const first = drive(60, 1, { throttle: 1 }).v; ok(first.speed < V.ROVER.accel * 1.01 && first.speed > 1, 'no instant acceleration (' + first.speed.toFixed(2) + ' m/s after one second)');
  const moving = drive(60, 5, { throttle: 1 }).v, x0 = moving.x; drive(60, 2, { brake: true }, flat, moving); ok(moving.speed === 0 && moving.x - x0 < 5, 'the brake stops the rover within a few metres');
  const coast = drive(60, 5, { throttle: 1 }).v; drive(60, 8, {}, flat, coast); ok(coast.speed < 0.2, 'the rover rolls to a stop when the throttle is released');
  const rev = drive(60, 4, { throttle: -1 }).v; ok(rev.x < 0 && rev.speed >= -V.ROVER.maxRev - 1e-9, 'reverse is slower than forward');
  const up = drive(60, 5, { throttle: 1 }, { ...flat, height: (x) => x * 0.2 }).v, down = drive(60, 5, { throttle: 1 }, { ...flat, height: (x) => -x * 0.2 }).v; ok(up.x < a.x * 0.95 && down.x >= up.x, 'climbing a slope is slower than flat ground');
  const sand = drive(60, 5, { throttle: 1 }, { ...flat, surface: () => 'sand' }).v, pk = drive(60, 5, { throttle: 1 }).v; ok(sand.x < pk.x * 0.85, 'loose sand is slower than packed soil');
  const ice = drive(60, 4, { throttle: 1, steer: 1 }, { ...flat, surface: () => 'ice' }).v, grip = drive(60, 4, { throttle: 1, steer: 1 }).v; ok(Math.abs(ice.heading) < Math.abs(grip.heading), 'ice gives less steering grip');
  const turn = drive(60, 3, { throttle: 0.4, steer: 1 }); ok(turn.last.turnRadius >= V.ROVER.wheelbase / Math.tan(V.ROVER.maxSteer) - 1e-6 && Math.abs(turn.v.heading) > 0.5, 'steering turns the rover, never tighter than its turning circle');
  const still = drive(60, 2, { steer: 1 }).v; ok(still.heading === 0, 'the rover cannot turn on the spot');
  const wall = { ...flat, circles: [{ x: 10, z: 0, r: 2 }] }, c = drive(60, 6, { throttle: 1 }, wall); ok(Math.hypot(c.v.x - 10, c.v.z) >= 2 + V.ROVER.radius - 1e-6 && c.v.x < 8, 'a collision stops the rover outside the obstacle');
  let hits = 0; { const v = { x: 0, z: 0, heading: 0, speed: 0, steer: 0 }; for (let i = 0; i < 300; i++) if (V.driveStep(v, { throttle: 1 }, 1 / 60, wall).hit) hits++; } ok(hits > 0, 'collisions are reported');
  const edge = drive(60, 30, { throttle: 1 }, { ...flat, limit: 40 }).v; ok(Math.hypot(edge.x, edge.z) <= 40 + 1e-6, 'the rover cannot leave the mapped region');
  ok(V.avoid({ x: 0, z: 0, heading: 0, speed: 3 }, [{ x: 4, z: 0.4, r: 1 }]) !== 0 && V.avoid({ x: 0, z: 0, heading: 0, speed: 3 }, [{ x: -4, z: 0, r: 1 }]) === 0 && V.avoid({ x: 0, z: 0, heading: 0, speed: 3 }, [{ x: 4, z: 9, r: 1 }]) === 0, 'obstacle avoidance only reacts to things close ahead');
  { const v = { x: 0, z: 0, heading: 0, speed: 0, steer: 0 }, obs = [{ x: 14, z: 0.3, r: 1.5 }]; let hit = false; for (let i = 0; i < 600; i++) { const r = V.driveStep(v, { throttle: 0.7, steer: V.avoid(v, obs) }, 1 / 60, { ...flat, circles: obs }); if (r.hit) hit = true; } ok(!hit && v.x > 18, 'with avoidance on, the rover steers round a boulder without touching it'); }
  ok(V.driveStep({ x: 0, z: 0, heading: 0, speed: 0, steer: 0 }, { throttle: 1 }, 5, flat).moved < 1, 'a very long frame cannot fling the rover');
}

/* 12. Simulated sensors and the clock */
{
  const s = calm(); const a = V.sensors(s, 0, 0, 0), b = V.sensors(s, 0, 0, 0);
  ok(JSON.stringify(a) === JSON.stringify(b), 'sensor readings are repeatable');
  ok(/simulation/i.test(a.label) && /practice day, no NASA data/.test(a.sunSource), 'readings are labelled as a simulation, and a practice day says it has no NASA data');
  for (let m = 0; m <= 100; m += 10) { s.minutes = m; const x = V.sensors(s, 0, 0, 0); ok(x.temp <= 0 && x.temp >= -120 && x.pressure > 500 && x.pressure < 900 && x.wind >= 0 && x.wind < 40, 'readings stay in typical Mars ranges at minute ' + m); }
  s.minutes = 50; const noon = V.sensors(s, 0, 0, 0).temp; s.minutes = 0; ok(noon > V.sensors(s, 0, 0, 0).temp, 'midday is warmer than morning');
  const c = calm(); c.events[0] = 'cold'; ok(V.sensors(c, 0, 0, 0).temp < V.sensors(calm(), 0, 0, 0).temp, 'a cold snap reads colder');
  const d = calm(); d.events[0] = 'dust'; const ds = V.sensors(d, 0, 0, 0); ok(ds.visibility < 5 && ds.wind > 15, 'a dust storm reads windy with low visibility');
  const real = M.initial(5, SW.archiveWindow(5).days); ok(/NASA DONKI record of \d{4}-\d\d-\d\d/.test(V.sensors(real, 0, 0, 0).sunSource), 'the Sun line names the NASA record it came from');
  ok(V.clock(Object.assign(calm(), { minutes: 0 })).text === '07:00' && V.clock(Object.assign(calm(), { minutes: 100 })).text === '17:00', 'the clock runs from 07:00 to 17:00');
}

/* 13. Pip answers from the real state */
{
  const s = M.initial(5, SW.archiveWindow(5).days); s.power = 3; s.air = 61;
  ok(/3 power/.test(V.pipAnswer(s, 'What should I do today?')) && /61 air/.test(V.pipAnswer(s, 'what should i do today')) && /Sol 1 of 5/.test(V.pipAnswer(s, 'What should I do today?')), 'the plan answer quotes the real supplies and sol');
  ok(/3 power cells now/.test(V.pipAnswer(s, 'Why is my power low?')), 'the power answer quotes the real power');
  const cme = V.pipAnswer(s, 'What is a coronal mass ejection?'), t = M.today(s); ok(t.cmeSpeed ? cme.includes(t.cmeSpeed + ' km/s') : /lists no CME/.test(cme), 'the CME answer reports exactly what today’s NASA record holds');
  ok(/not a NASA warning/.test(cme), 'and says the game level is a simplification');
  const p = calm(); ok(/no NASA record/.test(V.pipAnswer(p, 'what is a CME')) && /no NASA record/.test(V.pipAnswer(p, 'tell me about flares')), 'on a practice week Pip says it has no NASA record instead of inventing one');
  p.age = 7; const young = V.pipAnswer(p, 'what is a cme'); p.age = 12; ok(young !== V.pipAnswer(p, 'what is a cme') && young.length < V.pipAnswer(p, 'what is a cme').length + 80, 'the explanation changes with the commander’s age');
  ok(/Nothing is in the journal/.test(V.pipAnswer(calm(), 'What did I discover?')), 'an empty journal is reported as empty');
  const f = rich(calm()); act(f, 'explore:ice'); act(rich(f), 'find:ice_ground'); ok(/Ice crater/.test(V.pipAnswer(f, 'what did I discover')) && /Buried ice layer/.test(V.pipAnswer(f, 'what did I discover')), 'the discovery answer lists what was really found');
  ok(/does not track water/.test(V.pipAnswer(calm(), 'how much water')) && /Water is 33/.test(V.pipAnswer(Object.assign(calm(), { water: 33 }), 'water?')), 'the water answer depends on the mode');
  ok(/at the Ice crater/.test(V.pipAnswer(calm(), 'where am I', { place: 'at the Ice crater' })), 'Pip knows the player’s location when told');
  ok(/simulated/.test(V.pipAnswer(calm(), 'what is the temperature')), 'sensor answers are labelled as simulated');
  ok(V.pipAnswer(calm(), 'do you like cheese') === null, 'unknown questions fall through to the older answers');
  const w = rich(calm(8)); w.cond = {}; act(w, 'build:pad0:solar'); w.cond.pad0 = 0; ok(/offline/.test(V.pipAnswer(w, 'is anything broken')), 'Pip reports broken modules');
}

/* 14. NASA data handling */
{
  let softened = 0;
  for (let seed = 0; seed < DATA.windows.length; seed++) {
    const w = SW.archiveSpan(seed, 8); assert.equal(w.days.length, 8); assert.equal(w.source, 'archive');
    w.days.forEach((d, i) => { const raw = DATA.days.find(x => x.date === d.date); assert.ok(raw, 'every day is a real archive day'); assert.equal(d.flare, raw.flare); assert.equal(d.cmeSpeed, raw.cmeSpeed); assert.equal(d.sep, raw.sep);
      if (d.softened) { softened++; assert.equal(SW.riskOf(raw), 2); assert.equal(d.risk, 1); assert.ok(i >= 5); } else assert.equal(d.risk, SW.riskOf(raw)); if (i >= 5 && d.risk === 2) assert.ok(w.days[i - 1].risk !== 2, 'no two storms in a row after day 5'); });
    assert.equal(w.eased, w.days.filter(d => d.softened).length);
  }
  n += DATA.windows.length; console.log('checked ' + DATA.windows.length + ' eight-day spans against the archive (' + softened + ' days eased and marked)');
  ok(SW.archiveSpan(4, 5).days.length === 5, 'a five-day request is the ordinary curated week');
  ok(SW.practiceWeek(12).days.every(d => d.date === null && d.risk < 2 && !d.flare) && SW.practiceWeek(12).source === 'story', 'practice weeks hold no NASA values and no storms');
  const ch = V.challengeSet(DATA, 9, 8, SW.riskOf); ok(ch.length === 8 && ch.every(c => c.day.date && c.level === SW.riskOf(c.day) && DATA.days.includes(c.day)), 'challenge rounds are real archive days and the answer is the published rule');
  ok(new Set(ch.map(c => c.level)).size === 3 && new Set(ch.map(c => c.day.date)).size === 8, 'the challenge mixes Calm, Watch and Storm days without repeats');
  ok(JSON.stringify(V.challengeSet(DATA, 9, 8, SW.riskOf)) === JSON.stringify(ch), 'the challenge is repeatable');
  ok(V.challengeSet(null, 1, 8, SW.riskOf).length === 0, 'no archive means no challenge rounds, not invented ones');
  const keep = globalThis.DONKI_DAILY; globalThis.DONKI_DAILY = undefined; ok(SW.archiveWindow(3).source === 'story' && SW.archiveSpan(3, 8).source === 'story', 'without the archive the game falls back to a labelled practice week'); globalThis.DONKI_DAILY = keep;
}

/* 15. Saves: real old files, damage, export and import */
{
  const fx = f => fs.readFileSync(path.join(__dirname, 'tests', 'fixtures', f), 'utf8');
  const v3 = V.migrateSave(fx('save-v3.json')); ok(v3.ok && v3.from === 3 && v3.save.format === 4, 'a real v3 save loads');
  ok(v3.save.state.modules.pad0 === 'solar' && v3.save.state.modLv.pad0 === 2 && v3.save.state.tech.sol1 && v3.save.state.rp === 1 && v3.save.state.sol === 2, 'the v3 save keeps its colony, research and sol');
  ok(v3.save.state.water === null && v3.save.state.cond === null && v3.save.state.mode === 'storm' && Array.isArray(v3.save.state.gen), 'old saves continue as the original campaign');
  ok(v3.save.position.x === 4.5 && v3.save.position.z === -2.25 && v3.save.checkpoint && v3.save.checkpoint.sol === 1, 'position and checkpoint are kept');
  const v2 = V.migrateSave(fx('save-v2.json')); ok(v2.ok && v2.from === 2 && v2.save.state.rp === 0 && Object.keys(v2.save.state.tech).length === 0, 'a v2-shaped save loads and gains neutral v3 and v4 fields');
  { const s = v2.save.state; s.minutes = 0; s.power = 20; ok(M.reason(s, 'air') === '' && M.apply(s, 'air').ok, 'a migrated v2 save can keep playing'); }
  const again = V.migrateSave(JSON.parse(JSON.stringify(v3.save))); ok(again.ok && again.from === 4, 'a v4 save loads as v4');
  for (const [bad, why] of [['{oops', 'broken JSON'], ['null', 'null'], ['{"state":{"version":5}}', 'missing fields'], ['{"state":{"version":3,"days":[]}}', 'too old'], [JSON.stringify({ format: 9, state: v3.save.state }), 'newer format'], ['[1,2]', 'an array'], ['"hello"', 'a string']]) ok(V.migrateSave(bad).ok === false && V.migrateSave(bad).reason.length > 5, 'rejected without throwing: ' + why);
  { const d = JSON.parse(fx('save-v3.json')); d.state.air = 'lots'; ok(!V.migrateSave(d).ok, 'a save with a damaged supply is rejected'); }
  { const d = JSON.parse(fx('save-v3.json')); d.state.modules.pad9 = 'castle'; d.state.gen = [{ id: 'x', parts: [{ t: 'evil' }] }, null]; d.position = { x: 9999, z: 'a' }; const r = V.migrateSave(d); ok(r.ok && !r.save.state.modules.pad9 && r.save.state.gen.length === 0 && r.save.position.x === -3, 'unknown modules, bad missions and a bad position are repaired'); }
  const prof = { xp: 420, age: 11, badges: { shelter: 2 }, ach: { firsttech: 1 }, journal: [{ t: 'rock', id: 'ice_rock', name: 'Frost-cracked boulder', text: 'x' }], fin: 3 };
  const txt = V.exportBundle(prof, v3.save, { 1: v3.save }, '2026-11-15T10:00:00Z'), back = V.importBundle(txt);
  ok(back.ok && back.profile.xp === 420 && back.profile.journal.length === 1 && back.active.state.sol === 2 && back.slots['1'] && back.skipped === 0, 'export then import brings back the profile, journal and saves');
  ok(!V.importBundle('').ok && !V.importBundle('{"app":"other"}').ok && !V.importBundle('x'.repeat(4e6)).ok && !V.importBundle('{nope').ok, 'bad import files are refused');
  const dirty = V.importBundle(JSON.stringify({ app: 'little-mars', kind: 'export', format: 4, profile: { xp: -5, age: 'old', badges: { a: 'x', ['b'.repeat(99)]: 1 }, journal: [{ t: 'rock' }, 'junk'], __proto__: { hacked: 1 } }, active: { state: { version: 5 } }, slots: { 1: 'junk', 7: v3.save } }));
  ok(dirty.ok && dirty.profile.xp === 0 && dirty.profile.age === null && !('a' in dirty.profile.badges) && dirty.profile.journal.length === 0 && dirty.active === null && !dirty.slots['7'] && dirty.skipped === 2, 'an import is cleaned field by field and damaged saves inside it are skipped');
  const J = []; ok(V.journalAdd(J, { t: 'rock', id: 'a', name: 'A' }) && !V.journalAdd(J, { t: 'rock', id: 'a', name: 'A again' }) && J.length === 1, 'the journal does not store the same discovery twice');
  for (let i = 0; i < 450; i++) V.journalAdd(J, { t: 'nasa', id: 'd' + i }); ok(J.length === 400, 'the journal is capped at 400 entries');
}

/* 16. Two players */
{
  const s = rich(calm()); s.crew = { names: ['A', 'B'], acts: [0, 0], xp: [0, 0] }; ok(M.role(s) === 'eng', 'Sol 1 belongs to the Engineer');
  ok(M.desc('build:pad0:obs', s).cost.power === M.MODULES.obs.cost.power - 1, 'the Engineer builds v4 modules for 1 less power');
  act(s, 'build:pad0:obs'); M.end(s, false); rich(s); ok(M.role(s) === 'sci' && M.desc('observe', s).gain.rp === 2, 'on Sol 2 the Scientist earns 1 more point from an observation');
  s.explored.ice = true; ok(M.desc('find:ice_photo', s).gain.rp === 2, 'and from a discovery');
  M.end(s, false); ok(M.role(s) === 'eng', 'turns keep alternating');
}

/* 17. Performance profiles */
{
  const P = V.PERF; ok(P.high.pixelRatio > P.balanced.pixelRatio && P.balanced.pixelRatio > P.performance.pixelRatio && P.high.shadow > P.balanced.shadow && P.balanced.shadow > P.performance.shadow && P.high.particles > P.performance.particles, 'three profiles, each lighter than the last');
}

/* 18. Dashboard numbers agree with the rules */
{
  const s = rich(calm()); s.water = 30; act(s, 'build:pad0:solar'); act(rich(s), 'build:pad1:battery'); const d = V.dashboard(s), row = k => d.rows.find(r => r.key === k);
  ok(row('gen').value === 8 + M.genFor(s, 2) && row('air').value === s.air && row('water').value === 30 && d.nightAir === M.airNight(s) && row('sustain').value === M.score(s).total, 'the dashboard shows the same numbers the rules use');
  ok(d.rows.every(r => (r.made + r.used + r.stored).length > 20), 'every dashboard row explains itself');
  s.power = 9; const before = row('store'); ok(V.dashboard(s).rows.find(r => r.key === 'store').value === 4 && before, 'stored energy is what the batteries will really keep');
  ok(!V.dashboard(calm()).rows.some(r => r.key === 'water'), 'no water row in the original campaign');
}

{ // astronaut look
  const d = V.cleanLook(null), L = V.LOOK.LISTS;
  ok(d.hat === 'classic' && d.suit === 'white' && d.trim === 'red' && d.visor === 'gold' && d.pack === 'white' && d.patch === 'none', 'the default look is the old classic astronaut');
  ok(JSON.stringify(V.cleanLook({ hat: 'fox', suit: 'blue' })) === JSON.stringify({ ...d, hat: 'fox', suit: 'blue' }), 'a good pick is kept and the rest stay default');
  const bad = V.cleanLook({ hat: '<img onerror=x>', suit: 7, trim: null, visor: 'gold ', pack: {}, patch: 'rocket', extra: 'x' });
  ok(bad.hat === 'classic' && bad.suit === 'white' && bad.trim === 'red' && bad.visor === 'gold' && bad.pack === 'white' && bad.patch === 'rocket' && !('extra' in bad), 'unknown or odd values fall back to the default and extra keys are dropped');
  ok(['hat', 'suit', 'trim', 'visor', 'pack', 'patch'].every(k => L[k].some(e => e[0] === d[k])), 'every default id exists in its list');
  ok(Object.values(L).every(l => new Set(l.map(e => e[0])).size === l.length), 'ids are unique inside each list');
  ok(L.hat.length >= 10 && L.suit.every(e => /^#[0-9a-f]{6}$/i.test(e[2])), 'at least ten helmets and every colour is a hex value');
  ok(V.cleanProfile({}).look.hat === 'classic' && V.cleanProfile({ look: { hat: 'dino' } }).look.hat === 'dino', 'profiles without a look load, and a saved look survives cleaning');
  let seed = 1; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647, rl = V.randomLook(r);
  ok(JSON.stringify(V.cleanLook(rl)) === JSON.stringify(rl), 'Surprise me only picks valid ids');
  const imp = V.importBundle(V.exportBundle({ xp: 5, look: { hat: 'owl', visor: 'sky' } }, null, {}, null));
  ok(imp.ok && imp.profile.look.hat === 'owl' && imp.profile.look.visor === 'sky', 'export and import keep the look');
}

console.log('PASS: ' + n + ' v4 rule checks.');
