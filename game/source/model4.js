/* Little Mars v4 rules that sit beside model.js. No DOM code here, so Node can test every function.
   Sections: game modes · missions (six designed, plus a constrained generator) · score report · rover physics ·
   simulated sensors · colony dashboard numbers · Pip's state-based answers · Storm Watch Challenge rounds ·
   exploration journal · save envelope, migration, export and import · performance profiles.
   The per-action rules (costs, gains, nights) stay in model.js; this file reads them through MarsModel. */
(function (root) {
'use strict';
const M = root.MarsModel || (typeof require !== 'undefined' ? require('./model.js') : null);

/* A small seeded random generator so missions, events and challenge rounds can be replayed in tests. */
function rng(seed) {
  let r = (Math.imul((seed >>> 0) || 1, 2654435761) >>> 0) || 1;
  return () => { r = (Math.imul(r, 1664525) + 1013904223) >>> 0; return r / 4294967296; };
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------------------------------------------ game modes */
const MODES = {
  storm: { name: 'Original Storm Watch', sols: 5, tag: 'The classic',
    text: 'The five-sol mission exactly as before: shelter, harvest, three samples and a reply from Earth. Three optional side missions are added from what your level has unlocked.' },
  story: { name: 'Story Expedition', sols: 8, water: true, tag: 'Campaign',
    text: 'Eight sols and six chapters: buried ice, the forgotten lander, power through a storm, ancient waterways, a growing colony and a signal from Earth. Water is tracked, the garden can be replanted, and a night in the shelter on an active-Sun day gives 5 Safety back. Win with the four classic goals and at least four chapters.' },
  builder: { name: 'Colony Builder', sols: 8, water: true, wear: true, tag: 'Build and manage',
    text: 'Eight sols to raise a colony that can last. Water is tracked and modules wear out, so they need repairs. Prefabricated kits make every build cost 1 less power. Win with five modules standing and a sustainability score of 60 or more.' },
  explore: { name: 'Free Exploration', sols: 30, tag: 'No pressure',
    text: 'Drive the rover anywhere and study every site. Choose whether supplies are used. With supplies off nothing runs out and nothing can fail.' },
  lab: { name: 'Science Lab', sols: 30, sandbox: true, tag: 'Experiments',
    text: 'All eight experiments with nothing to pay and no clock. Work through them and take the lab challenge.' },
  challenge: { name: 'Storm Watch Challenge', ui: true, tag: 'Quick challenge',
    text: 'Eight real days from NASA’s DONKI archive. Read the observations, work out the game level and choose what a careful crew would do.' },
  custom: { name: 'Mission Creator', sols: 5, tag: 'Make your own',
    text: 'Pick up to three objectives from the game’s own systems and play them as a five-sol mission. Your missions are saved on this device.' }
};

/* Longer missions get Mars weather events after Sol 5 too (model.js only places them on Sols 2 to 5). */
function lateEvents(seed, n) {
  const r = rng((seed >>> 0) + 5150), out = [], kinds = ['dust', 'devil', 'cold'];
  for (let sol = 6; sol <= n; sol++) out[sol - 1] = r() < 0.34 ? kinds[Math.floor(r() * kinds.length)] : null;
  return out;
}

/* Turn a freshly made state (M.initial with the right number of days) into the chosen mode. Returns the same object. */
function applyMode(s, mode, opts) {
  opts = opts || {};
  const md = MODES[mode] || MODES.storm;
  s.mode = MODES[mode] ? mode : 'storm';
  const n = s.days.length;
  if (n > 5) { const late = lateEvents(s.seed, n); for (let i = 5; i < n; i++) s.events[i] = late[i] || null; }
  if (md.water) s.water = 40;
  if (s.days.length > 5) s.rest = 5;   /* long missions: a night in the shelter on an active-Sun day gives 5 Safety back */
  if (md.wear) s.cond = {};
  if (s.mode === 'builder') { s.kit = 1; s.power += 4; s.food += 10; }   /* prefabricated kits: every build costs 1 less power */
  if (s.mode === 'explore') {
    if (opts.supplies) { s.water = 40; }
    else s.sandbox = true;
  }
  if (md.sandbox) s.sandbox = true;
  if (s.sandbox) { s.level = 99; s.power = 12; s.air = 100; s.food = 100; s.rad = 100; s.alerts = s.alerts.map(() => null); s.events = s.events.map(() => null); s.camp = 'pre'; }
  if (s.mode === 'story') s.gen = DESIGNED.map(m => ({ ...m }));
  else if (s.mode === 'custom') s.gen = (opts.custom || []).map((m, i) => makeMission(s, m.tpl, m.arg, i)).filter(Boolean).slice(0, 3);
  else if (s.mode === 'storm' || s.mode === 'builder' || s.mode === 'explore') s.gen = generate(s, s.seed, 3);
  s.genDone = {};
  return s;
}

/* ------------------------------------------------------------------ missions */
const levelOf = s => M.lvl(s);
const builtTypes = s => Object.values(s.modules || {});
const findsAt = (s, site, kind) => Object.keys(s.finds || {}).filter(k => M.FINDS[k] && (!site || M.FINDS[k].site === site) && (!kind || M.FINDS[k].kind === kind)).length;
function firstStorm(s) { const i = s.days.findIndex(d => d.risk === 2); return i < 0 ? 99 : i + 1; }

/* Every objective type has one test. A mission is a list of parts; all parts must be true. */
const CHECK = {
  explore: (s, a) => !!s.explored[a],
  finds: (s, a, n) => findsAt(s, null, a || null) >= n,
  findsAt: (s, a, n) => findsAt(s, a) >= n,
  find: (s, a) => !!(s.finds && s.finds[a]),
  build: (s, a) => builtTypes(s).includes(a),
  buildAny: (s, a) => String(a).split('|').some(t => builtTypes(s).includes(t)),
  modules: (s, a, n) => builtTypes(s).length >= n,
  upgrades: (s, a, n) => Object.entries(s.modLv || {}).filter(([p, l]) => l >= 2 && s.modules[p]).length >= n,
  tech: (s, a, n) => Object.keys(s.tech || {}).length >= n,
  techCat: (s, a) => Object.keys(s.tech || {}).some(k => M.TECH[k] && M.TECH[k].cat === a),
  labs: (s, a, n) => Object.keys(s.labs || {}).length >= n,
  samples: (s, a, n) => s.samples.length >= n,
  stock: (s, a, n) => s.air >= n && s.food >= n && s.sol >= 2,
  power: (s, a, n) => s.power >= n,
  water: (s, a, n) => s.water != null && s.water >= n,
  prepared: s => !!s.shield && s.shieldSol != null && s.shieldSol < firstStorm(s),
  harvested: s => !!s.harvested,
  reply: s => !!s.delivered,
  uplink: s => (s.upSol || 0) > 0,
  observe: s => (s.obsSol || 0) > 0,
  stormPassed: s => s.days.slice(0, s.sol - 1).some(d => d.risk === 2) || (!!s.done && s.days.some(d => d.risk === 2)),
  sustain: (s, a, n) => M.score(s).total >= n
};
function partsDone(s, m) { return (m.parts || []).every(p => CHECK[p.t] && CHECK[p.t](s, p.a, p.n)); }
/* A mission stays done once it has been done (supplies can drop again later). Call tick() after every action and every night. */
function missionDone(s, m) { return !!(s.genDone && s.genDone[m.id]) || partsDone(s, m); }
function tick(s) { s.genDone = s.genDone || {}; const now = []; for (const m of s.gen || []) if (!s.genDone[m.id] && partsDone(s, m)) { s.genDone[m.id] = s.sol; now.push(m); } return now; }

/* The six designed missions. They are the chapters of Story Expedition and can appear in the Mission Creator. */
const DESIGNED = [
  { id: 'beneath', name: 'Beneath the Surface', cat: 'Scientific discovery', xp: 30, text: 'Reach the Ice crater, then run the ground scanner over the buried ice layer.', why: 'Buried ice is water to drink, oxygen to breathe and a record of Mars’s past climate.', parts: [{ t: 'explore', a: 'ice' }, { t: 'find', a: 'ice_ground' }] },
  { id: 'lander', name: 'The Forgotten Lander', cat: 'Exploration', xp: 30, text: 'Reach the Old lander, photograph it and scan the ground under its feet.', why: 'Old hardware shows engineers how machines age in Mars dust, cold and sunlight.', parts: [{ t: 'explore', a: 'probe' }, { t: 'find', a: 'probe_photo' }, { t: 'find', a: 'probe_ground' }] },
  { id: 'powerstorm', name: 'Power Through the Storm', cat: 'Environmental preparation', xp: 35, text: 'Have the shelter built and a way to keep power overnight (battery bank, power hub or nuclear battery) when a Storm sol ends.', why: 'Solar storms and dust both cut what a crew can do outside. Stored power keeps life support running.', parts: [{ t: 'prepared' }, { t: 'buildAny', a: 'battery|grid|rtg' }, { t: 'stormPassed' }] },
  { id: 'waterways', name: 'Ancient Waterways', cat: 'Scientific discovery', xp: 30, text: 'Reach the Dry riverbed and record two discoveries there.', why: 'Rounded pebbles and stacked mud layers are evidence that water once flowed on Mars.', parts: [{ t: 'explore', a: 'river' }, { t: 'findsAt', a: 'river', n: 2 }] },
  { id: 'growing', name: 'The Growing Colony', cat: 'Colony expansion', xp: 30, text: 'Build a greenhouse wing or a garden bed, and bring in a harvest.', why: 'Food grown on Mars is food that does not have to be launched from Earth.', parts: [{ t: 'buildAny', a: 'ghx|garden' }, { t: 'harvested' }] },
  { id: 'signal', name: 'Signal from Earth', cat: 'Communications', xp: 30, text: 'Get Earth’s reply to your science report, and improve the radio with a comms module or the High-gain antenna.', why: 'A message needs 3 to 22 minutes to cross between the planets, so a crew cannot wait for Earth before every decision.', parts: [{ t: 'reply' }, { t: 'radio' }] }
];
CHECK.radio = s => builtTypes(s).includes('tower') || builtTypes(s).includes('ccentre') || M.has(s, 'com1');

/* Templates for the generator and the Mission Creator. Each returns a mission, or null when it would not be fair for this state. */
const scale = (s, easy, normal, hard) => ({ easy, normal, hard }[s.difficulty || 'normal'] ?? normal);
const openSites = s => Object.keys(M.SITES).filter(k => M.needLevel('explore:' + k) <= levelOf(s));
const openModules = s => Object.keys(M.MODULES).filter(t => M.needLevel('build:pad0:' + t) <= levelOf(s));
const TEMPLATES = {
  explore: { cat: 'Exploration', label: 'Reach a far site', args: s => openSites(s).filter(k => !s.explored[k]),
    make: (s, a) => ({ name: 'Expedition: ' + M.SITES[a].name, text: 'Take the rover to the ' + M.SITES[a].name + ', by sending it or by driving it yourself.', xp: 15, parts: [{ t: 'explore', a }] }) },
  survey: { cat: 'Scientific discovery', label: 'Survey a far site', args: s => openSites(s).filter(k => findsAt(s, k) < 3),
    make: (s, a) => ({ name: 'Survey: ' + M.SITES[a].name, text: 'Reach the ' + M.SITES[a].name + ' and record all three discoveries there: a rock scan, a ground scan and a photograph.', xp: 30, parts: [{ t: 'explore', a }, { t: 'findsAt', a, n: 3 }] }) },
  finds: { cat: 'Scientific discovery', label: 'Record discoveries', args: s => (openSites(s).length ? ['any'] : []),
    make: s => { const n = Math.min(scale(s, 2, 3, 4), openSites(s).length * 3); return { name: 'Field notes', text: 'Record ' + n + ' discoveries with the rover’s instruments.', xp: 10 + 5 * n, parts: [{ t: 'finds', a: null, n }] }; } },
  build: { cat: 'Construction', label: 'Build a module', args: s => openModules(s).filter(t => !builtTypes(s).includes(t)),
    make: (s, a) => ({ name: 'Build order: ' + M.MODULES[a].name, text: 'Build a ' + M.MODULES[a].name + ' on any open pad. ' + M.MODULES[a].short + '.', xp: 20, parts: [{ t: 'build', a }] }) },
  expand: { cat: 'Colony expansion', label: 'Grow the colony', args: s => (builtTypes(s).length < 6 ? ['any'] : []),
    make: s => { const n = Math.min(6, Math.max(builtTypes(s).length + 1, scale(s, 2, 3, 4))); return { name: 'Colony of ' + n, text: 'Have ' + n + ' modules standing at once.', xp: 10 * n, parts: [{ t: 'modules', a: null, n }] }; } },
  upgrade: { cat: 'Construction', label: 'Upgrade modules', args: () => ['any'],
    make: s => { const n = scale(s, 1, 1, 2); return { name: n > 1 ? 'Twice improved' : 'Improved', text: 'Upgrade ' + (n > 1 ? 'two modules' : 'a module') + ' to Level 2 or higher.', xp: 15 * n, parts: [{ t: 'modules', a: null, n }, { t: 'upgrades', a: null, n }] }; } },
  research: { cat: 'Research', label: 'Research a field', args: s => Object.keys(M.TECH_CATS).filter(c => !CHECK.techCat(s, c)),
    make: (s, a) => ({ name: 'Research: ' + M.TECH_CATS[a], text: 'Research any technology in ' + M.TECH_CATS[a] + '.', xp: 20, parts: [{ t: 'techCat', a }] }) },
  labwork: { cat: 'Research', label: 'Run experiments', args: s => (Object.keys(s.labs || {}).length < 6 ? ['any'] : []),
    make: s => { const n = Math.min(8, Object.keys(s.labs || {}).length + scale(s, 1, 2, 3)); return { name: 'Lab time', text: 'Have ' + n + ' Science lab experiments logged.', xp: 8 * n, parts: [{ t: 'labs', a: null, n }] }; } },
  stock: { cat: 'Resource management', label: 'Keep supplies high', args: () => ['any'],
    make: s => { const n = scale(s, 55, 65, 70); return { name: 'Well supplied', text: 'From Sol 2 on, have air and food both at ' + n + ' or more at the same time.', xp: 25, parts: [{ t: 'stock', a: null, n }] }; } },
  water: { cat: 'Resource management', label: 'Store water', args: s => (s.water != null ? ['any'] : []),
    make: s => { const n = scale(s, 45, 55, 60); return { name: 'Full tanks', text: 'Have ' + n + ' water stored. A water extractor and the Ice crater both add water.', xp: 25, parts: [{ t: 'water', a: null, n }] }; } },
  prepare: { cat: 'Environmental preparation', label: 'Be ready for the storm', args: s => (!s.shield && firstStorm(s) > s.sol && firstStorm(s) < 99 ? ['any'] : []),
    make: s => ({ name: 'Ready early', text: 'Finish the storm shelter before Sol ' + firstStorm(s) + ', the first Storm day in this week’s data.', xp: 25, parts: [{ t: 'prepared' }] }) },
  comms: { cat: 'Communications', label: 'Hear from Earth', args: s => (!s.delivered ? ['any'] : []),
    make: () => ({ name: 'Message received', text: 'Send three samples to Earth and receive the reply. It takes 40 mission minutes: 20 there and 20 back.', xp: 20, parts: [{ t: 'reply' }] }) },
  observe: { cat: 'Scientific discovery', label: 'Observe the sky', args: s => (M.needLevel('build:pad0:obs') <= levelOf(s) && !(s.obsSol > 0) ? ['any'] : []),
    make: () => ({ name: 'First light', text: 'Build an Observatory and log an observation of the sky.', xp: 25, parts: [{ t: 'build', a: 'obs' }, { t: 'observe' }] }) }
};
function makeMission(s, tpl, arg, i) {
  const T = TEMPLATES[tpl]; if (!T) { const D = DESIGNED.find(d => d.id === tpl); return D ? { ...D } : null; }
  const ok = T.args(s); if (!ok.length) return null;
  const a = ok.includes(arg) ? arg : ok[0];
  const m = T.make(s, a); if (!m || !m.parts.every(p => CHECK[p.t])) return null;
  return { id: tpl + ':' + a + ':' + (i || 0), tpl, arg: a, cat: T.cat, ...m };
}
/* A mission is fair to offer if it is not already done and nothing it needs is locked for this commander. */
function feasible(s, m) {
  if (!m || partsDone(s, m)) return false;
  for (const p of m.parts) {
    if ((p.t === 'explore' || p.t === 'findsAt') && M.needLevel('explore:' + p.a) > levelOf(s)) return false;
    if (p.t === 'find' && M.FINDS[p.a] && M.SITES[M.FINDS[p.a].site] && M.needLevel('explore:' + M.FINDS[p.a].site) > levelOf(s)) return false;
    if (p.t === 'build' && M.needLevel('build:pad0:' + p.a) > levelOf(s)) return false;
    if (p.t === 'buildAny' && !String(p.a).split('|').some(t => M.needLevel('build:pad0:' + t) <= levelOf(s))) return false;
    if (p.t === 'modules' && p.n > 6) return false;
    if (p.t === 'water' && s.water == null) return false;
    if (p.t === 'labs' && p.n > Object.keys(M.LABS).length) return false;
  }
  return true;
}
/* Pick n different missions, from different categories where possible. Same state and seed give the same list. */
function generate(s, seed, n) {
  const r = rng((seed >>> 0) + 31337), out = [], usedCat = new Set(), keys = Object.keys(TEMPLATES);
  for (let i = keys.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [keys[i], keys[j]] = [keys[j], keys[i]]; }
  for (let pass = 0; pass < 2 && out.length < n; pass++) for (const k of keys) {
    if (out.length >= n) break;
    const T = TEMPLATES[k]; if (out.some(m => m.tpl === k) || (pass === 0 && usedCat.has(T.cat))) continue;
    const args = T.args(s); if (!args.length) continue;
    const m = makeMission(s, k, args[Math.floor(r() * args.length)], out.length);
    if (feasible(s, m)) { out.push(m); usedCat.add(T.cat); }
  }
  return out;
}

M.MODE_WIN.story = s => M.baseGoals(s) && (s.gen || []).filter(m => missionDone(s, m)).length >= 4;
M.MODE_WIN.builder = s => Object.keys(s.modules || {}).length >= 5 && M.score(s).total >= 60;
M.MODE_WIN.explore = () => true;
M.MODE_WIN.lab = () => true;
M.MODE_WIN.custom = s => (s.gen || []).length > 0 && s.gen.every(m => missionDone(s, m));

/* ------------------------------------------------------------------ score report: why you got your score */
function report(s) {
  const goals = M.progress(s), gDone = goals.filter(g => g.done).length, gen = s.gen || [], mDone = gen.filter(m => missionDone(s, m)).length;
  const lows = [s.air, s.food].concat(s.water != null ? [s.water * 100 / 60] : []), low = Math.min(...lows);
  const finds = Object.keys(s.finds || {}).length, labs = Object.keys(s.labs || {}).length, tech = Object.keys(s.tech || {}).length, sites = Object.keys(s.explored || {}).length;
  const sus = M.score(s).total, risky = s.risky || 0, brokenN = Object.keys(s.modules || {}).filter(p => M.broken(s, p)).length;
  const early = !!s.shield && s.shieldSol != null && s.shieldSol < firstStorm(s);
  const parts = [
    { key: 'complete', name: 'Mission completion', max: 30, pts: gDone * 5 + (gen.length ? Math.round(mDone / gen.length * 10) : (gDone === 4 ? 10 : 0)),
      why: gDone + ' of 4 main goals' + (gen.length ? ' and ' + mDone + ' of ' + gen.length + ' missions' : '') + ' finished.' },
    { key: 'resources', name: 'Resource management', max: 15, pts: Math.round(clamp(low, 0, 100) / 100 * 15),
      why: 'Your lowest supply at the end was ' + Math.round(clamp(low, 0, 100)) + ' out of 100. A crew is only as safe as its scarcest supply.' },
    { key: 'science', name: 'Scientific discoveries', max: 15, pts: Math.min(8, finds) + Math.min(4, labs) + Math.min(3, tech),
      why: finds + ' discoveries, ' + labs + ' experiments and ' + tech + ' technologies.' },
    { key: 'sustain', name: 'Colony sustainability', max: 15, pts: Math.round(sus / 100 * 15), why: 'Pip’s sustainability check gave the colony ' + sus + ' out of 100.' },
    { key: 'decisions', name: 'Careful decisions', max: 10, pts: Math.max(0, 10 - 3 * risky - 2 * brokenN),
      why: (risky ? risky + ' outdoor job' + (risky > 1 ? 's' : '') + ' done during a solar storm (3 points each). Finishing fast is not worth the risk. ' : 'No outdoor jobs during a solar storm. ') + (brokenN ? brokenN + ' module' + (brokenN > 1 ? 's' : '') + ' left broken.' : '') },
    { key: 'prep', name: 'Preparation', max: 10, pts: (early ? 6 : s.shield ? 3 : 0) + (s.steady40 !== false ? 4 : 0),
      why: (early ? 'Shelter finished before the first storm. ' : s.shield ? 'Shelter built, but not before the first storm. ' : 'No shelter built. ') + (s.steady40 !== false ? 'Safety never fell below 40.' : 'Safety fell below 40 at some point.') },
    { key: 'explore', name: 'Exploration', max: 5, pts: Math.min(5, sites), why: sites + ' of 5 far sites reached.' }
  ];
  const total = parts.reduce((a, p) => a + p.pts, 0);
  const weak = parts.slice().sort((a, b) => a.pts / a.max - b.pts / b.max)[0];
  return { total, parts, weak: weak.name, grade: total >= 85 ? 'Outstanding' : total >= 65 ? 'Strong' : total >= 45 ? 'Promising' : 'A first attempt' };
}

/* ------------------------------------------------------------------ rover physics (direct driving)
   A simple bicycle model stepped with real seconds, so it behaves the same at 30 or 120 frames a second.
   Speeds are game speeds: a real Mars rover moves at walking pace or slower. */
const ROVER = { maxFwd: 6.5, maxRev: 2.4, accel: 3.4, brake: 9, drag: 0.55, wheelbase: 1.7, maxSteer: 0.52, steerRate: 2.4, radius: 1.25, gravity: 3.71 };
const SURFACES = { packed: { grip: 1, roll: 0.25, name: 'Packed soil' }, sand: { grip: 0.7, roll: 1.1, name: 'Loose sand' }, rock: { grip: 0.9, roll: 0.5, name: 'Rocky ground' }, ice: { grip: 0.45, roll: 0.2, name: 'Icy ground' } };
/* terrain: { height(x,z), surface(x,z), circles:[{x,z,r}], limit } · v: { x,z,heading,speed,steer } · input: { throttle,steer,brake } */
function driveStep(v, input, dt, terrain) {
  dt = clamp(dt, 0, 0.1);
  const T = terrain || {}, surf = SURFACES[(T.surface && T.surface(v.x, v.z)) || 'packed'] || SURFACES.packed;
  const thr = clamp(input.throttle || 0, -1, 1), st = clamp(input.steer || 0, -1, 1);
  /* steering eases towards the stick, and tightens less at speed so the rover cannot spin on the spot */
  const want = st * ROVER.maxSteer * (1 - 0.45 * Math.min(1, Math.abs(v.speed) / ROVER.maxFwd));
  const ds = clamp(want - v.steer, -ROVER.steerRate * dt, ROVER.steerRate * dt); v.steer += ds;
  /* slope along the direction of travel: positive means uphill */
  let slope = 0;
  if (T.height) { const e = 0.8, fx = Math.cos(v.heading), fz = -Math.sin(v.heading); slope = (T.height(v.x + fx * e, v.z + fz * e) - T.height(v.x - fx * e, v.z - fz * e)) / (2 * e); }
  let a = thr * ROVER.accel * surf.grip;
  if (input.brake) a = -Math.sign(v.speed) * ROVER.brake * surf.grip;
  else if (thr && Math.sign(thr) !== Math.sign(v.speed) && Math.abs(v.speed) > 0.3) a = -Math.sign(v.speed) * ROVER.brake * 0.6 * surf.grip;
  a -= ROVER.gravity * clamp(slope, -0.6, 0.6);                    /* climbing slows the rover, descending speeds it up */
  a -= v.speed * (ROVER.drag + surf.roll * 0.35);                  /* rolling resistance grows on soft ground */
  const before = v.speed; v.speed += a * dt;
  if (input.brake && Math.sign(before) !== Math.sign(v.speed)) v.speed = 0;
  if (!thr && !input.brake && Math.abs(v.speed) < 0.05 && Math.abs(slope) < 0.08) v.speed = 0;
  v.speed = clamp(v.speed, -ROVER.maxRev, ROVER.maxFwd * (0.55 + 0.45 * surf.grip));
  v.heading += (v.speed / ROVER.wheelbase) * Math.tan(v.steer) * surf.grip * dt;
  let nx = v.x + Math.cos(v.heading) * v.speed * dt, nz = v.z - Math.sin(v.heading) * v.speed * dt, hit = null;
  /* obstacles: push the rover out of any circle it entered and take away most of its speed */
  for (const c of T.circles || []) {
    const dx = nx - c.x, dz = nz - c.z, d = Math.hypot(dx, dz), min = c.r + ROVER.radius;
    if (d < min) { const k = d > 1e-6 ? 1 / d : 0, ux = k ? dx * k : 1, uz = k ? dz * k : 0; nx = c.x + ux * min; nz = c.z + uz * min; hit = c; }
  }
  const lim = T.limit || 0;
  if (lim) { const d = Math.hypot(nx, nz); if (d > lim) { nx *= lim / d; nz *= lim / d; hit = hit || { edge: true }; } }
  if (hit) v.speed *= 0.25;
  const moved = Math.hypot(nx - v.x, nz - v.z); v.x = nx; v.z = nz;
  return { hit, slope, surface: surf.name, moved, accel: a, turnRadius: Math.abs(Math.tan(v.steer)) > 1e-3 ? ROVER.wheelbase / Math.abs(Math.tan(v.steer)) : Infinity };
}
/* Automatic obstacle avoidance: a gentle steering nudge away from anything close ahead. Returns a steer value to add. */
function avoid(v, circles) {
  let push = 0; const fx = Math.cos(v.heading), fz = -Math.sin(v.heading);
  for (const c of circles || []) {
    const dx = c.x - v.x, dz = c.z - v.z, ahead = dx * fx + dz * fz, side = dx * -fz + dz * fx, reach = c.r + ROVER.radius + 0.8, look = 8 + 1.5 * Math.abs(v.speed);
    if (ahead > 0 && ahead < look && Math.abs(side) < reach) push += (side >= 0 ? 1 : -1) * 2.5 * (1 - ahead / look) * (1.15 - Math.abs(side) / reach);
  }
  return clamp(push, -1, 1);
}

/* ------------------------------------------------------------------ simulated environment sensors
   These numbers are a game simulation tuned to typical Mars ranges. Only the Sun line comes from NASA data. */
function sensors(s, x, z, height) {
  const day = M.today(s), ev = M.eventOf(s), t = clamp(s.minutes / 100, 0, 1);
  const wob = Math.sin((s.seed % 97) + s.sol * 2.3 + s.minutes * 0.21);
  const temp = Math.round(-78 + 58 * Math.sin(Math.PI * (0.08 + 0.8 * t)) + (ev === 'cold' ? -16 : 0) + (ev === 'dust' ? -6 : 0) - (height || 0) * 0.4 + wob * 2);
  const pressure = Math.round(700 - (height || 0) * 6 + 25 * Math.cos(Math.PI * t) + wob * 8);
  const wind = Math.round((ev === 'dust' ? 22 : ev === 'devil' ? 12 : 4) + 2.5 * wob + 2 * Math.sin(t * 9));
  const visibility = ev === 'dust' ? 1 : M.isDusty(s, s.sol) ? 8 : 30;
  return {
    temp, pressure, wind: Math.max(0, wind), visibility,
    windWord: wind >= 18 ? 'Strong (dust storm)' : wind >= 9 ? 'Gusty' : 'Light',
    tempC: temp + ' °C', pressurePa: pressure + ' Pa', windMs: Math.max(0, wind) + ' m/s', visKm: visibility + ' km',
    sun: ['Calm', 'Watch', 'Storm'][day.risk], sunSource: day.date ? 'game level from NASA DONKI record of ' + day.date : 'practice day, no NASA data',
    label: 'Game simulation (typical Mars ranges), not a measurement'
  };
}
/* Time of day shown in the HUD: the 100 mission minutes of work run from morning to late afternoon. */
function clock(s) {
  const mins = Math.round(7 * 60 + clamp(s.minutes, 0, 100) / 100 * 10 * 60), h = Math.floor(mins / 60), m = mins % 60;
  return { text: String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), part: s.minutes < 30 ? 'Morning' : s.minutes < 70 ? 'Midday' : s.minutes < 100 ? 'Afternoon' : 'Dusk' };
}

/* ------------------------------------------------------------------ colony dashboard numbers */
function dashboard(s) {
  const next = Math.min(s.sol + 1, s.days.length), dusty = M.isDusty(s, next), base = (dusty ? (M.has(s, 'sol1') ? 6 : 5) : 8) + M.rules(s).morning;
  const gen = M.genFor(s, next), carryCap = 4 * M.count(s, 'battery') + 2 * M.extra(s, 'battery') + 3 * M.count(s, 'grid') + 2 * M.extra(s, 'grid');
  const lamps = s.planted && !s.harvested && s.growth < 2 ? M.lampCost(s, M.trays(s)) : 0, C = M.cap(s);
  const mods = Object.entries(s.modules || {}).map(([pid, t]) => ({ pid, type: t, name: M.MODULES[t].name, place: M.lname(pid), level: M.lv(s, pid), cond: s.cond ? (s.cond[pid] == null ? 100 : s.cond[pid]) : null, broken: M.broken(s, pid) }));
  const rpMorning = M.count(s, 'lab') + M.extra(s, 'lab') + M.extra(s, 'alab');
  const rows = [
    { key: 'gen', name: 'Power generation', value: base + gen, unit: 'cells tomorrow morning', made: 'The base solar field gives ' + base + (dusty ? ' (dusty day)' : '') + '. Colony modules add ' + gen + '.', used: '', stored: '' },
    { key: 'use', name: 'Power consumption', value: lamps, unit: 'cells planned', made: '', used: (lamps ? 'Grow lights need ' + lamps + ' each day until harvest. ' : 'Nothing is booked. ') + 'The air maker costs ' + M.desc('air', s).cost.power + ', a rock scan 1, a rover trip ' + M.desc('explore:ice', s).cost.power + '.', stored: '' },
    { key: 'store', name: 'Stored energy', value: Math.min(carryCap, s.power), unit: 'of ' + carryCap + ' cells kept overnight', made: '', used: '', stored: carryCap ? 'Battery banks and power hubs keep up to ' + carryCap + ' unused cells for tomorrow.' : 'No battery bank or power hub: unused power is lost at night.' },
    { key: 'air', name: 'Air supply', value: s.air, unit: 'of ' + C, made: 'The air maker turns ' + M.desc('air', s).cost.power + ' power into ' + M.desc('air', s).gain.air + ' air.', used: 'The crew breathes ' + M.airNight(s) + ' each night. Outdoor jobs use a little more.', stored: 'Tanks hold ' + C + '.' },
    { key: 'food', name: 'Food supply', value: s.food, unit: 'of ' + C, made: 'A harvest gives ' + M.desc('harvest', s).gain.food + '.' + (M.ghxFood(s) ? ' Greenhouse wings add ' + M.ghxFood(s) + ' every night.' : ''), used: 'The crew eats ' + M.foodNight(s) + ' each night.', stored: 'Shelves hold ' + C + '.' }
  ];
  if (s.water != null) rows.push({ key: 'water', name: 'Water supply', value: s.water, unit: 'of ' + M.wcap(s), made: M.wellOut(s) ? 'Water extractors add ' + M.wellOut(s) + ' each morning.' : 'Nothing makes water yet. Build a water extractor or visit the Ice crater.', used: 'The crew and greenhouse wings use ' + M.waterNight(s) + ' each night.', stored: 'Tanks hold ' + M.wcap(s) + '.' });
  rows.push({ key: 'storage', name: 'Available storage', value: C, unit: 'air and food', made: '', used: '', stored: 'Starts at 100. Each storage depot adds 30, and 15 more per level.' });
  rows.push({ key: 'research', name: 'Research output', value: rpMorning, unit: 'points each morning', made: 'Research labs and upgraded sample labs add points every morning. Scans, trips, experiments and discoveries add more.', used: 'Technologies cost 2 or 4 points.', stored: 'You hold ' + (s.rp || 0) + ' points.' });
  const sc = M.score(s);
  rows.push({ key: 'sustain', name: 'Colony sustainability', value: sc.total, unit: 'of 100', made: sc.tier + '. Weakest part: ' + sc.weak + '.', used: '', stored: sc.tip });
  return { rows, modules: mods, nightAir: M.airNight(s), nightFood: M.foodNight(s), nightWater: s.water != null ? M.waterNight(s) : null };
}

/* ------------------------------------------------------------------ Pip: answers built from the real state
   Returns null when the question is not one of these, so the older built-in answers can try. */
function pipAnswer(s, q, ctx) {
  const t = String(q || '').toLowerCase(), young = M.young(s), day = M.today(s), c = ctx || {};
  const lvl = ['Calm', 'Watch', 'Storm'][day.risk];
  if (/what (should|do|can) i|what now|what next|today'?s plan|do today|plan/.test(t)) {
    if (s.sandbox) return 'Nothing can run out in this mode, so follow your curiosity. ' + (Object.keys(s.finds || {}).length < Object.keys(M.FINDS).length ? 'There are ' + (Object.keys(M.FINDS).length - Object.keys(s.finds || {}).length) + ' discoveries still to record. Drive the rover to a far site and use its instruments.' : 'You have recorded every discovery. Try the experiments in the Science lab.');
    const p = M.plan(s), todo = (s.gen || []).find(m => !missionDone(s, m));
    const first = p[0] ? 'First: ' + p[0].title + ' (' + p[0].cost.power + ' power, ' + p[0].cost.air + ' air, ' + p[0].cost.time + ' minutes). ' + p[0].why : (c.quest ? c.quest : 'The main jobs for today are done. Rest in the habitat when you are ready.');
    return 'It is Sol ' + s.sol + ' of ' + s.days.length + ', a ' + lvl + ' day. You have ' + s.power + ' power, ' + s.air + ' air, ' + s.food + ' food' + (s.water != null ? ', ' + s.water + ' water' : '') + ' and ' + (100 - s.minutes) + ' minutes of daylight. ' + first + (todo ? ' Side mission: ' + todo.name + '.' : '');
  }
  if (/power|energy|electric/.test(t) && /why|low|out|enough|gone/.test(t)) {
    const d = dashboard(s), g = d.rows[0], st = d.rows[2];
    return 'You have ' + s.power + ' power cells now. ' + g.made + ' That is ' + g.value + ' tomorrow. ' + st.stored + (M.dirty(s) && !s.cleaned ? ' Today the panels are dusty, which cut this morning’s power; brushing them gives ' + M.desc('clean', s).gain.power + ' back.' : '') + ' The biggest users are the air maker (' + M.desc('air', s).cost.power + '), building (' + M.desc('build:pad0:solar', s).cost.power + ' to 4) and rover trips (' + M.desc('explore:ice', s).cost.power + ').';
  }
  if (/water/.test(t)) {
    if (s.water == null) return 'This mission does not track water as a separate supply. Water is still part of the story: the air maker splits it to make oxygen, and a water extractor gives the air maker more to work with.';
    return 'Water is ' + s.water + ' of ' + M.wcap(s) + '. The crew uses ' + M.waterNight(s) + ' each night. ' + (M.wellOut(s) ? 'Your extractors add ' + M.wellOut(s) + ' each morning.' : 'Nothing is making water yet: build a water extractor or take the rover to the Ice crater.');
  }
  if (/cme|coronal|mass ejection|solar cloud/.test(t)) {
    const fact = day.date ? (day.cmeSpeed ? 'NASA’s DONKI record for today (' + day.date + ') lists a CME at ' + day.cmeSpeed + ' km/s.' : 'NASA’s DONKI record for today (' + day.date + ') lists no CME.') : 'This is a practice week, so I have no NASA record for today.';
    return (young ? 'A coronal mass ejection, or CME, is a giant cloud of hot gas that the Sun throws into space, a bit like a huge burp. Fast ones cross space in a day or two.' : 'A coronal mass ejection (CME) is a huge cloud of electrically charged gas and magnetic field thrown out by the Sun. Fast ones travel at over 1,500 km/s and can push fast particles ahead of them.') + ' ' + fact + ' In the game a CME at 1,500 km/s or faster makes a Watch day. That is our simplification, not a NASA warning.';
  }
  if (/flare/.test(t)) {
    const fact = day.date ? (day.flare ? 'NASA’s record for today lists a ' + day.flare + ' flare as the strongest.' : 'NASA’s record for today lists no flare.') : 'This is a practice week, so I have no NASA record for today.';
    return (young ? 'A solar flare is a sudden, very bright flash on the Sun. Its light reaches Mars in a few minutes.' : 'A solar flare is a sudden burst of light and X-rays from the Sun. Flares are graded A, B, C, M and X, and each letter is ten times stronger than the one before.') + ' ' + fact;
  }
  if (/discover|journal|found|find/.test(t)) {
    const f = Object.keys(s.finds || {}), sites = Object.keys(s.explored || {});
    if (!f.length && !sites.length && !s.samples.length) return 'Nothing is in the journal for this mission yet. Scan a rock near the base, or take the rover to a far site and use its instruments.';
    return 'On this mission you reached ' + (sites.map(k => M.SITES[k].name).join(', ') || 'no far sites yet') + ', collected ' + s.samples.length + ' samples and recorded ' + f.length + ' discoveries' + (f.length ? ': ' + f.slice(-4).map(k => M.FINDS[k].name).join(', ') + (f.length > 4 ? ' and more' : '') : '') + '.' + (c.journalTotal ? ' Your journal holds ' + c.journalTotal + ' entries across all your missions.' : '');
  }
  if (/where am i|where are we|location|which place/.test(t)) return c.place ? 'You are ' + c.place + '.' : 'You are at the landing site.';
  if (/repair|broken|condition|wear|maint/.test(t)) {
    if (!s.cond) return 'Modules do not wear out in this mission. In Colony Builder they do, and each repair costs 1 power, 1 air and 10 minutes.';
    const d = dashboard(s).modules, worst = d.slice().sort((a, b) => a.cond - b.cond)[0];
    return worst ? 'The module in the worst condition is the ' + worst.name + ' at ' + worst.place + ': ' + worst.cond + '%.' + (worst.broken ? ' It is offline until someone repairs it.' : worst.cond < 50 ? ' Repair it soon.' : ' That is fine for now.') + ' Dust storms wear modules twice as fast.' : 'Nothing is built yet, so nothing can wear out.';
  }
  if (/mission|objective|chapter|side quest/.test(t)) {
    const g = s.gen || []; if (!g.length) return 'The main goals are the storm shelter, a harvest, three samples and Earth’s reply. Open the Missions book to see them.';
    return g.map(m => (missionDone(s, m) ? 'Done: ' : 'To do: ') + m.name).join('. ') + '.';
  }
  if (/temperature|how cold|how hot|wind|pressure|visib/.test(t)) {
    const x = sensors(s, 0, 0, 0);
    return 'My sensors read ' + x.tempC + ', ' + x.pressurePa + ' (less than a hundredth of Earth’s air pressure), wind ' + x.windMs + ' and visibility ' + x.visKm + '. These are simulated game values in typical Mars ranges, not real measurements.';
  }
  if (/score|how am i doing|how are we doing/.test(t)) { const r = report(s); return 'Right now the mission scores ' + r.total + ' out of 100. The weakest part is ' + r.weak + '.'; }
  return null;
}

/* ------------------------------------------------------------------ Storm Watch Challenge */
const ACTIONS = ['Do the outdoor jobs today', 'Keep outdoor trips short and stay near the shelter', 'Finish the shelter and rest inside it'];
function challengeSet(D, seed, n, riskOf) {
  const r = rng((seed >>> 0) + 808), days = (D && D.days) || [], by = [[], [], []];
  days.forEach((d, i) => { if (d && d.date) by[riskOf(d)].push(i); });
  const out = [], want = n || 8;
  for (let k = 0; k < want; k++) {
    const pool = by[k % 3].length ? by[k % 3] : by.find(b => b.length); if (!pool) break;
    const d = days[pool.splice(Math.floor(r() * pool.length), 1)[0]];
    out.push({ day: d, level: riskOf(d), action: riskOf(d) });
  }
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/* ------------------------------------------------------------------ exploration journal (kept in the profile, across missions) */
function journalAdd(list, e) {
  if (!Array.isArray(list) || !e || !e.t || !e.id) return false;
  if (list.some(x => x.t === e.t && x.id === e.id)) return false;
  list.push({ t: String(e.t).slice(0, 12), id: String(e.id).slice(0, 60), name: String(e.name || '').slice(0, 80), text: String(e.text || '').slice(0, 900), extra: String(e.extra || '').slice(0, 400), sol: +e.sol || 0, when: String(e.when || '').slice(0, 24) });
  if (list.length > 400) list.splice(0, list.length - 400);
  return true;
}
const JOURNAL_KINDS = { site: 'Places', rock: 'Rock scans', ground: 'Ground scans', photo: 'Photographs', lab: 'Experiments', report: 'Mission reports', nasa: 'NASA observations viewed', tech: 'Technology' };

/* ------------------------------------------------------------------ saves
   v2 and v3 stored {state, checkpoint, position}. v4 wraps that in an envelope with a format number.
   Loading never throws: a damaged save is reported, not used, and never overwrites anything. */
const SAVE_FORMAT = 4;
function migrateSave(raw) {
  try {
    if (typeof raw === 'string') raw = JSON.parse(raw);
    if (!raw || typeof raw !== 'object') return { ok: false, reason: 'This is not a Little Mars save.' };
    const from = raw.format === SAVE_FORMAT ? 4 : (raw.state && raw.state.rp != null ? 3 : 2);
    if (raw.format != null && raw.format > SAVE_FORMAT) return { ok: false, reason: 'This save comes from a newer version of Little Mars.' };
    const st = raw.state;
    if (!st || st.version !== 5) return { ok: false, reason: 'This save is from a version too old to load.' };
    if (!M.normalize(st)) return { ok: false, reason: 'The save is damaged and could not be repaired.' };
    let cp = raw.checkpoint; if (cp && !M.normalize(cp)) cp = null;
    const pos = raw.position && isFinite(raw.position.x) && isFinite(raw.position.z) ? { x: clamp(+raw.position.x, -20, 20), z: clamp(+raw.position.z, -19, 19) } : { x: -3, z: 3 };
    if (!st.genDone || typeof st.genDone !== 'object') st.genDone = {};
    st.gen = st.gen.filter(m => m && typeof m.id === 'string' && Array.isArray(m.parts) && m.parts.every(p => p && CHECK[p.t]));
    return { ok: true, from, save: { format: SAVE_FORMAT, app: 'little-mars', savedAt: raw.savedAt || null, name: String(raw.name || '').slice(0, 30), state: st, checkpoint: cp || null, position: pos } };
  } catch (e) { return { ok: false, reason: 'The save could not be read.' }; }
}
/* ------------------------------------------------------------------ astronaut look (picked on the start screen, kept in the profile) */
const LOOK_COLORS = [['white', 'Moon white', '#eeece7'], ['red', 'Mars red', '#d9573f'], ['orange', 'Dust orange', '#f08a3c'], ['yellow', 'Sunny yellow', '#f2c230'], ['mint', 'Mint green', '#4fbf9a'], ['blue', 'Sky blue', '#4a8fd6'], ['purple', 'Grape purple', '#8a5bd0'], ['pink', 'Bubblegum pink', '#ee7fb0'], ['night', 'Midnight', '#34415c']];
const LOOK_VISORS = [['gold', 'Gold', '#d6a64a'], ['silver', 'Silver mirror', '#cfd6dd'], ['sky', 'Sky blue', '#5aa9e6'], ['rose', 'Rose', '#e88aa8'], ['lime', 'Lime', '#9ad94a'], ['violet', 'Violet', '#9b7be0']];
const LOOK_HATS = [['classic', 'Classic', '#efede8'], ['fox', 'Fox', '#e8863a'], ['cat', 'Cat', '#9aa3ad'], ['bunny', 'Bunny', '#f4efe9'], ['bear', 'Bear', '#a8754a'], ['panda', 'Panda', '#f4f4f1'], ['frog', 'Frog', '#6bbf5a'], ['dino', 'Dino', '#7fc06a'], ['owl', 'Owl', '#b99a6b'], ['unicorn', 'Unicorn', '#f3e6f6'], ['alien', 'Alien', '#9fe0a8']];
const LOOK_PATCHES = [['none', 'No patch'], ['star', 'Star'], ['heart', 'Heart'], ['rocket', 'Rocket'], ['planet', 'Planet']];
const LOOK_DEFAULT = { hat: 'classic', suit: 'white', trim: 'red', visor: 'gold', pack: 'white', patch: 'none' };
const LOOK_LISTS = { hat: LOOK_HATS, suit: LOOK_COLORS, trim: LOOK_COLORS, visor: LOOK_VISORS, pack: LOOK_COLORS, patch: LOOK_PATCHES };
// Only whitelisted ids survive, so a pasted or damaged save can never put odd text into the game.
function cleanLook(l) {
  const o = { ...LOOK_DEFAULT };
  if (l && typeof l === 'object') for (const k of Object.keys(LOOK_LISTS)) if (typeof l[k] === 'string' && LOOK_LISTS[k].some(e => e[0] === l[k])) o[k] = l[k];
  return o;
}
function randomLook(r) {
  const o = {};
  for (const k of Object.keys(LOOK_LISTS)) o[k] = LOOK_LISTS[k][Math.floor(r() * LOOK_LISTS[k].length)][0];
  return o;
}
function cleanProfile(p) {
  const o = { xp: 0, age: null, badges: {}, run: null, best: 0, ach: {}, journal: [], alertsDone: 0, fin: 0, exp: 0, look: cleanLook(null) };
  if (!p || typeof p !== 'object') return o;
  for (const k of ['xp', 'best', 'alertsDone', 'fin', 'exp']) if (typeof p[k] === 'number' && isFinite(p[k]) && p[k] >= 0) o[k] = Math.min(1e6, Math.floor(p[k]));
  if (typeof p.age === 'number' && p.age >= 5 && p.age <= 99) o.age = Math.floor(p.age);
  for (const k of ['badges', 'ach']) if (p[k] && typeof p[k] === 'object' && !Array.isArray(p[k])) for (const [a, b] of Object.entries(p[k]).slice(0, 200)) if (typeof b === 'number' && isFinite(b)) o[k][String(a).slice(0, 40)] = b;
  o.look = cleanLook(p.look);
  if (Array.isArray(p.journal)) for (const e of p.journal.slice(-400)) journalAdd(o.journal, e);
  if (Array.isArray(p.custom)) o.custom = p.custom.slice(0, 12).map(c => ({ name: String(c && c.name || 'My mission').slice(0, 30), items: Array.isArray(c && c.items) ? c.items.slice(0, 3).map(i => ({ tpl: String(i.tpl).slice(0, 20), arg: String(i.arg).slice(0, 20) })) : [] }));
  return o;
}
function exportBundle(profile, active, slots, now) {
  return JSON.stringify({ app: 'little-mars', kind: 'export', format: SAVE_FORMAT, exportedAt: now || null, profile, active: active || null, slots: slots || {} });
}
function importBundle(text) {
  if (typeof text !== 'string' || !text.trim()) return { ok: false, reason: 'The file is empty.' };
  if (text.length > 3e6) return { ok: false, reason: 'The file is too large to be a Little Mars export.' };
  let b; try { b = JSON.parse(text); } catch (e) { return { ok: false, reason: 'The file is not valid JSON.' }; }
  if (!b || b.app !== 'little-mars' || b.kind !== 'export') return { ok: false, reason: 'This file is not a Little Mars export.' };
  if (b.format > SAVE_FORMAT) return { ok: false, reason: 'This export comes from a newer version of Little Mars.' };
  const out = { ok: true, profile: cleanProfile(b.profile), active: null, slots: {}, skipped: 0 };
  if (b.active) { const r = migrateSave(b.active); if (r.ok) out.active = r.save; else out.skipped++; }
  for (const k of ['1', '2', '3']) if (b.slots && b.slots[k]) { const r = migrateSave(b.slots[k]); if (r.ok) out.slots[k] = r.save; else out.skipped++; }
  return out;
}

/* ------------------------------------------------------------------ performance profiles */
const PERF = {
  high: { name: 'High', note: 'For capable desktop computers.', pixelRatio: 1.75, shadow: 2048, particles: 1, detail: 1, anim: 1 },
  balanced: { name: 'Balanced', note: 'For ordinary laptops.', pixelRatio: 1.25, shadow: 1024, particles: 0.6, detail: 0.7, anim: 1 },
  performance: { name: 'Performance', note: 'For lower-powered hardware.', pixelRatio: 1, shadow: 512, particles: 0.3, detail: 0.4, anim: 0.5 }
};

root.Mars4 = { MODES, applyMode, lateEvents, DESIGNED, TEMPLATES, CHECK, makeMission, feasible, generate, missionDone, partsDone, tick, report,
  ROVER, SURFACES, driveStep, avoid, sensors, clock, dashboard, pipAnswer, ACTIONS, challengeSet, journalAdd, JOURNAL_KINDS,
  SAVE_FORMAT, migrateSave, cleanProfile, cleanLook, randomLook, LOOK: { DEFAULT: LOOK_DEFAULT, LISTS: LOOK_LISTS }, exportBundle, importBundle, PERF, rng };
if (typeof module !== 'undefined') module.exports = root.Mars4;
})(typeof window !== 'undefined' ? window : globalThis);
