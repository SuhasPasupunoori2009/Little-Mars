/* ===== v4/rover.js: driving the rover yourself =====
   An optional second way to use the rover. The automated trips from the map still work exactly as before.
   Physics is M4.driveStep (model4.js, tested in Node). Reaching a far site and using an instrument go through the same
   M.apply rules as everything else, so they cost what the panels say they cost. Driving itself is free, like walking. */
const d4 = { keys: new Set(), marks: {}, beams: {}, yaw: 0, pitch: .36, dist: 9.5, drag: null, idle: 0, cam: new THREE.Vector3(), lastTrack: null, hudT: 0, hitT: 0, edgeT: 0, engine: false, lean: 0, nose: 0, target: null };
let siteWay = null; /* the far site the player marked in the colony panel; shown as a distance and direction while driving */
const d4Terrain = {
  height: heightAt, circles: w4.rocks, limit: 64,
  surface(x, z) {
    const S = M.SITES, r = Math.hypot(x, z);
    if (Math.hypot(x - S.ice.x, z - S.ice.z) < 7.5) return 'ice';
    if (x < -10 && x > -60 && Math.abs(z - (S.river.z + 5 * Math.sin((x - S.river.x) * .12))) < 2.4) return 'rock';
    if (r < 36) return 'packed';
    return fbm(x * .05 + 9, z * .05 + 2) > .55 ? 'sand' : fbm(x * .08, z * .08) > .6 ? 'rock' : 'packed';
  }
};
const d4Pos = k => { const D = M.FINDS[k], S = M.SITES[D.site]; return S ? [S.x + D.dx, S.z + D.dz] : [D.dx, D.dz]; };

/* Survey markers. Shape tells the kind without colour: a spinning gem for a rock, a ring on the ground for a ground scan,
   a frame for a photograph. A found spot swaps to a small flag. */
{
  const mk = { rock: glowM('#ffcf72', 2.6), ground: glowM('#7fd4ef', 2.6), photo: glowM('#c9a2ff', 2.6) };
  for (const [k, D] of Object.entries(M.FINDS)) {
    const [x, z] = d4Pos(k), g = group(x, z, null), todo = new THREE.Group(), done = new THREE.Group(); g.position.y = heightAt(x, z); g.add(todo, done);
    add(todo, cylG(.025, .025, 1.5, 5), MAT.grey, 0, .75, 0, 0, 0, 0, true);
    const icon = D.kind === 'rock' ? add(todo, new THREE.OctahedronGeometry(.24), mk.rock, 0, 1.75, 0, 0, 0, 0, true) : D.kind === 'ground' ? add(todo, torG(.8, .05, Math.PI * 2, 28), mk.ground, 0, .08, 0, Math.PI / 2, 0, 0, true) : add(todo, torG(.26, .035, Math.PI * 2, 4), mk.photo, 0, 1.75, 0, 0, 0, Math.PI / 4, true);
    if (D.kind === 'ground') add(todo, sphG(.09, 8), mk.ground, 0, 1.55, 0, 0, 0, 0, true);
    add(done, cylG(.025, .025, 1.2, 5), MAT.grey, 0, .6, 0, 0, 0, 0, true); add(done, new THREE.PlaneGeometry(.5, .3), MAT.flagDone, .27, 1.05, 0, 0, 0, 0, true);
    g.visible = false; d4.marks[k] = { g, todo, done, icon, x, z, kind: D.kind };
  }
  const bm = new THREE.MeshBasicMaterial({ color: '#ffd88a', transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide, fog: false });
  for (const [k, S] of Object.entries(M.SITES)) { const b = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.6, 26, 16, 1, true), bm); b.position.set(S.x, 13, S.z); b.visible = false; scene.add(b); d4.beams[k] = b; }
}
function d4Sync() {
  for (const [k, m] of Object.entries(d4.marks)) { const D = M.FINDS[k], open = !M.SITES[D.site] || !!state.explored[D.site], found = !!(state.finds && state.finds[k]); m.g.visible = started && (open || found); m.todo.visible = !found; m.done.visible = found; }
  for (const [k, b] of Object.entries(d4.beams)) b.visible = !!drv && !state.explored[k] && !M.lockText(state, 'explore:' + k);
}
function d4NearSite() { if (!drv) return null; for (const [k, S] of Object.entries(M.SITES)) if (Math.hypot(drv.v.x - S.x, drv.v.z - S.z) < 9.5) return k; return null; }

/* ---------- getting in and out ---------- */
function d4Build() {
  if ($('v4drive')) return;
  const o = v4El('div', 'v4drive', `<div class="d4top"><b>ROVER · DIRECT DRIVE</b><span id="d4Where" role="status" aria-live="polite"></span><button class="d4btn" id="d4Exit">Leave the rover <kbd>Esc</kbd></button></div>
<div class="d4left"><div class="d4g" aria-label="Rover read-outs"><div><small>Speed</small><b id="d4Speed">0.0</b><i>m/s</i></div><div><small>Ground</small><b id="d4Surf">Packed soil</b></div><div><small>Slope</small><b id="d4Slope">level</b></div><div><small>Heading</small><b id="d4Head">E</b></div><div><small>Driven</small><b id="d4Dist">0 m</b></div></div>
<div class="d4sens" aria-label="Environment sensors"><h4>Environment sensors <small>game simulation, not measurements</small></h4><dl><dt>Temperature</dt><dd id="d4T"></dd><dt>Air pressure</dt><dd id="d4P"></dd><dt>Wind</dt><dd id="d4W"></dd><dt>Visibility</dt><dd id="d4V"></dd><dt>Sun today</dt><dd id="d4S"></dd></dl><small id="d4Src"></small></div>
<label class="d4chk"><input type="checkbox" id="d4Avoid"> Steering assist: steer round rocks ahead</label></div>
<div class="d4mid"><div class="d4prompt" id="d4Prompt" role="status" aria-live="polite"></div><button class="d4use" id="d4Use" hidden><kbd>E</kbd><span id="d4UseTxt">Use instrument</span></button><div class="d4card" id="d4Card" aria-live="polite"></div></div>
<div class="d4pad" aria-label="Touch driving controls"><button data-d4="w" class="up" aria-label="Drive forward">▲</button><button data-d4="a" class="left" aria-label="Steer left">◀</button><button data-d4="s" class="down" aria-label="Reverse">▼</button><button data-d4="d" class="right" aria-label="Steer right">▶</button><button data-d4=" " class="brk" aria-label="Brake">Brake</button></div>`);
  o.id = 'v4drive'; o.hidden = true; document.body.appendChild(o);
  $('d4Exit').onclick = () => v4Drive(false); $('d4Use').onclick = d4Use;
  $('d4Avoid').checked = acc.avoid; $('d4Avoid').onchange = e => { acc.avoid = e.target.checked; applyAcc(); };
  o.querySelectorAll('[data-d4]').forEach(b => { b.onpointerdown = e => { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) {} d4.keys.add(b.dataset.d4); }; b.onpointerup = b.onpointercancel = b.onpointerleave = () => d4.keys.delete(b.dataset.d4); });
}
function v4Drive(on, silent) {
  if (on) {
    if (drv || !started || state.done || trip || cine || paused || $('night').style.display === 'flex') return;
    d4Build(); closePanel(); if (consoleOpen) closeConsole(); route = []; routeStation = null; routeLine.visible = false; destinationRing.visible = false; keys.clear(); d4.keys.clear();
    const R = stationGroups.rover.position; drv = { v: { x: R.x, z: R.z, heading: 0, speed: 0, steer: 0 }, dist: 0, last: null };
    d4.yaw = 0; d4.pitch = .36; d4.dist = 9.5; d4.idle = 0; d4.cam.set(R.x - 9, 5, R.z); d4.lastTrack = null; d4.target = null;
    puff(player.position.x, player.position.z, 6, 1, .6); player.visible = false; $('v4drive').hidden = false; $('d4Card').innerHTML = ''; document.body.classList.add('v4driving'); d4Sync(); d4HUD();
    say('You are driving. W A S D or the arrows to drive, Space to brake, E to use an instrument, Esc to get out. ' + (Object.keys(state.explored).length ? 'Yellow, blue and purple markers show things to study.' : 'Follow a beam of light to reach a far site.'), true, 'cheer');
    canvas.focus({ preventScroll: true });
  } else {
    if (!drv) return; const far = Math.hypot(drv.v.x - stationGroups.rover.position.x, drv.v.z - stationGroups.rover.position.z) > 6;
    drv = null; d4.keys.clear(); rover.position.set(0, 0, 0); rover.rotation.set(0, 0, 0); player.visible = true; w4.yaw = null;
    if ($('v4drive')) $('v4drive').hidden = true; document.body.classList.remove('v4driving'); if (d4.engine) { d4.engine = false; Story.audio.rover(false); }
    d4Sync(); if (!silent) { say(far ? 'The rover’s autopilot drove it back to the dock. You are on foot again.' : 'Parked at the dock. You are on foot again.'); focusBack($('ctrlBtn')); save(); }
  }
}

/* ---------- what E would do here ---------- */
function d4Find() {
  const v = drv.v; let best = null, bd = 1e9;
  for (const [k, m] of Object.entries(d4.marks)) { if (state.finds && state.finds[k]) continue; const d = Math.hypot(v.x - m.x, v.z - m.z); if (d < 3.6 && d < bd) { bd = d; best = { t: 'find', id: 'find:' + k, k }; } }
  if (best && M.SITES[M.FINDS[best.k].site] && !state.explored[M.FINDS[best.k].site]) best = null;
  if (best) return best;
  for (const [k, S] of Object.entries(M.SITES)) if (!state.explored[k] && Math.hypot(v.x - S.x, v.z - S.z) < 8) return { t: 'explore', id: 'explore:' + k, k };
  const R = stationGroups.rover.position; if (Math.hypot(v.x - R.x, v.z - R.z) < 3.5 && drv.dist > 4) return { t: 'dock' };
  return null;
}
function d4Use() {
  if (!drv || paused) return; const tg = d4Find(); if (!tg) { say('Nothing to use here. Drive to a marker or a beam of light.'); return; }
  if (tg.t === 'dock') { v4Drive(false); return; }
  if (Math.abs(drv.v.speed) > 1.2) { say('Stop the rover first. Hold Space to brake.'); return; }
  const why = M.reason(state, tg.id); if (why) { say(why, true, 'worry'); beep(false); return; }
  const a = M.desc(tg.id, state), r = M.apply(state, tg.id); if (!r.ok) { say(r.reason); return; }
  const bn = checkMissions(); if (state.crew) { const ci = (state.sol - 1) % 2; state.crew.acts[ci]++; bn.forEach(g => { state.crew.xp[ci] += g.xp; }); }
  v3After(tg.id, r); v4After(tg.id, r); syncWorld(true); updateHUD(); save(); beep();
  if (tg.t === 'explore') { const S = M.SITES[tg.k]; say(S.found, true, 'cheer'); $('d4Card').innerHTML = `<h4>${S.name} reached ✓</h4><p>${S.found}</p><p class="d4small">${S.text}</p><p class="d4small">Three markers are now set out here: a rock to scan, a spot for the ground scanner and a view to photograph.</p>`; c4Play('Discovery: ' + S.name, S.x, S.z, 12, S.found); }
  else { const D = M.FINDS[tg.k]; w4.arm.t = 2.2; say(D.name + ' recorded. +' + a.gain.rp + ' research point' + (a.gain.rp > 1 ? 's' : '') + '.', true, 'cheer');
    $('d4Card').innerHTML = `<h4>${{ rock: 'Rock scanner', ground: 'Ground scanner', photo: 'Camera' }[D.kind]}: ${D.name} ✓</h4>${D.kind === 'rock' ? `<dl><dt>Classification</dt><dd>${D.cls}</dd><dt>Colour and texture</dt><dd>${D.look}</dd><dt>Possible minerals</dt><dd>${D.made}</dd></dl>` : ''}<p>${D.text}</p><p class="d4small">Reward: +${a.gain.rp} research · saved to your journal. ${bn.length ? bn.map(g => 'Mission complete: ' + g.name + '.').join(' ') : ''}</p>`; }
}

function d4HUD() {
  if (!drv || !$('v4drive')) return; const v = drv.v, sn = M4.sensors(state, v.x, v.z, heightAt(v.x, v.z)), L = drv.last || {};
  $('d4Speed').textContent = Math.abs(v.speed).toFixed(1) + (v.speed < -.05 ? ' R' : ''); $('d4Surf').textContent = L.surface || 'Packed soil';
  const sl = Math.round(Math.atan(L.slope || 0) * 57.3); $('d4Slope').textContent = Math.abs(sl) < 2 ? 'level' : (sl > 0 ? 'up ' : 'down ') + Math.abs(sl) + '°';
  $('d4Head').textContent = ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][((Math.round(v.heading / (Math.PI / 4)) % 8) + 8) % 8]; $('d4Dist').textContent = Math.round(drv.dist) + ' m';
  $('d4T').textContent = sn.tempC; $('d4P').textContent = sn.pressurePa; $('d4W').textContent = sn.windMs + ' · ' + sn.windWord; $('d4V').textContent = sn.visKm; $('d4S').textContent = sn.sun + ' (game level)'; $('d4Src').textContent = 'Sun: ' + sn.sunSource + '.';
  const ns = d4NearSite(); $('d4Where').textContent = ns ? M.SITES[ns].name + (state.explored[ns] ? ' · explored ✓' : ' · not explored yet') : Math.hypot(v.x, v.z) < 24 ? 'Landing zone' : 'Open ground · ' + Math.round(Math.hypot(v.x, v.z)) + ' m from the habitat';
  const tg = d4Find(), u = $('d4Use'); d4.target = tg;
  if (siteWay && state.explored[siteWay]) siteWay = null;
  if (!tg) { u.hidden = true; let w = ''; if (siteWay) { const S = M.SITES[siteWay], ax = Math.atan2(-(S.z - v.z), S.x - v.x); w = 'Marked trip: ' + S.name + ', ' + Math.round(Math.hypot(S.x - v.x, S.z - v.z)) + ' m ' + ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][((Math.round(ax / (Math.PI / 4)) % 8) + 8) % 8]; } $('d4Prompt').textContent = w; }
  else if (tg.t === 'dock') { u.hidden = false; $('d4UseTxt').textContent = 'Park and get out'; $('d4Prompt').textContent = 'Rover dock'; }
  else { const a = M.desc(tg.id, state), why = M.reason(state, tg.id); u.hidden = false; $('d4UseTxt').textContent = a.title; $('d4Prompt').textContent = (why ? '⚠ ' + why : 'Costs ' + costText(a)); }
}

/* ---------- every frame while driving ---------- */
function d4Frame(dt) {
  if (!drv) return; if (paused || state.done || $('night').style.display === 'flex') { if (state.done) v4Drive(false, true); return; }
  const K = d4.keys, v = drv.v, inp = { throttle: (K.has('w') || K.has('arrowup') ? 1 : 0) - (K.has('s') || K.has('arrowdown') ? 1 : 0), steer: (K.has('a') || K.has('arrowleft') ? 1 : 0) - (K.has('d') || K.has('arrowright') ? 1 : 0), brake: K.has(' ') };
  if (cine4) { inp.throttle = 0; inp.steer = 0; inp.brake = true; }
  if (acc.avoid && inp.throttle > 0 && !inp.steer) inp.steer = M4.avoid(v, w4.rocks);
  const px = v.x, pz = v.z, steps = dt > .034 ? 2 : 1; let res = null, moved = 0;
  for (let i = 0; i < steps; i++) { res = M4.driveStep(v, inp, dt / steps, d4Terrain); moved += res.moved; }
  /* the canyon is not for driving into: stop at the edge */
  if (heightAt(v.x, v.z) < -2.2) { v.x = px; v.z = pz; v.speed = 0; moved = 0; if (elapsed - d4.edgeT > 6) { d4.edgeT = elapsed; say('That is the canyon edge. The rover will not drive over it. Enjoy the view instead.', true, 'worry'); } }
  drv.last = res; drv.dist += moved;
  if (res.hit && elapsed - d4.hitT > 1.2) { d4.hitT = elapsed; beep(false); puff(v.x, v.z, 4, .8, .6); }
  /* place the rover model: it is a child of the rover station, so positions are relative to the dock */
  const S = stationGroups.rover.position, y = heightAt(v.x, v.z), rm = RM();
  d4.nose += ((Math.atan(res.slope) - clamp(res.accel, -6, 6) * .008) - d4.nose) * Math.min(1, dt * 6); d4.lean += ((-v.steer * v.speed * .035) - d4.lean) * Math.min(1, dt * 5);
  rover.position.set(v.x - S.x, y, v.z - S.z); rover.rotation.set(rm ? 0 : d4.lean, v.heading, rm ? Math.atan(res.slope) : d4.nose);
  const spin = moved / .36 * Math.sign(v.speed || 1); roverWheels.forEach(w => { w.rotation.y -= spin; });
  if (moved > 0 && (!d4.lastTrack || Math.hypot(v.x - d4.lastTrack[0], v.z - d4.lastTrack[1]) > .62)) { d4.lastTrack = [v.x, v.z]; dropTrack(v.x, v.z, v.heading); }
  w4.dustAmt = Math.min(1, w4.dustAmt + moved * (res.surface === 'Loose sand' ? .004 : .0012));
  if (!rm && Math.abs(v.speed) > 2.5 && Math.random() < dt * 9) puff(v.x - Math.cos(v.heading) * 1.1, v.z + Math.sin(v.heading) * 1.1, 1, .5, .5);
  if (sound && Math.abs(v.speed) > 1 && res.surface !== 'Loose sand' && (d4.crunchT = (d4.crunchT || 0) - dt) < 0) { d4.crunchT = .42; Story.audio.sfx('crunch'); }
  const eng = Math.abs(v.speed) > .25; if (eng !== d4.engine) { d4.engine = eng; Story.audio.rover(eng && sound); }
  /* chase camera: behind the rover, moved by dragging; it drifts back behind when left alone */
  d4.idle += dt; if (d4.idle > 2.5 && !d4.drag && Math.abs(v.speed) > .5) d4.yaw += (0 - d4.yaw) * Math.min(1, dt * 1.5);
  const h = v.heading + d4.yaw, cp = Math.cos(d4.pitch), tx = v.x - Math.cos(h) * d4.dist * cp, tz = v.z + Math.sin(h) * d4.dist * cp, ty = Math.max(heightAt(tx, tz) + 1, y + 1.4 + d4.dist * Math.sin(d4.pitch));
  if (rm) d4.cam.set(tx, ty, tz); else d4.cam.lerp(tmpV.set(tx, ty, tz), Math.min(1, dt * 5));
  if (!cine4) { camera.position.copy(d4.cam); camera.lookAt(v.x, y + 1.3, v.z); }
  for (const m of Object.values(d4.marks)) if (m.g.visible && m.todo.visible && !rm) { if (m.kind === 'ground') m.icon.scale.setScalar(1 + Math.sin(elapsed * 3) * .12); else m.icon.rotation.y += dt * 1.6; }
  d4.hudT -= dt; if (d4.hudT <= 0) { d4.hudT = .2; d4HUD(); }
}

/* ---------- input: keys are taken before the walking and console handlers see them ---------- */
window.addEventListener('keydown', e => {
  if (cine4 && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); c4End(); return; }
  if (!drv || ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
  if ($('night').style.display === 'flex' || paused) return;
  const k = e.key.toLowerCase();
  if (k === 'escape') { e.preventDefault(); e.stopPropagation(); v4Drive(false); return; }
  if (k === 'e') { e.preventDefault(); e.stopPropagation(); if (!e.repeat) d4Use(); return; }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) { e.preventDefault(); e.stopPropagation(); d4.keys.add(k); return; }   /* preventDefault also stops Space from pressing a focused button */
  if (['m', 'r', 'l', 'n', 'c', 'j', 'h', 'p'].includes(k)) { e.stopPropagation(); }   /* console and Pip shortcuts wait until the player is on foot */
}, true);
window.addEventListener('keyup', e => { d4.keys.delete(e.key.toLowerCase()); }, true);
window.addEventListener('blur', () => d4.keys.clear());
canvas.addEventListener('pointerdown', e => { if (drv) d4.drag = [e.clientX, e.clientY]; });
window.addEventListener('pointermove', e => { if (!drv || !d4.drag) return; d4.yaw -= (e.clientX - d4.drag[0]) * .006; d4.pitch = clamp(d4.pitch + (e.clientY - d4.drag[1]) * .004, .1, 1.15); d4.drag = [e.clientX, e.clientY]; d4.idle = 0; });
window.addEventListener('pointerup', () => { d4.drag = null; });
canvas.addEventListener('wheel', e => { if (drv) d4.dist = clamp(d4.dist + e.deltaY * .01, 5, 18); }, { passive: true });
