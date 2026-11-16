/* ===== v4/world.js: the land, the weather you can see, and a colony that looks lived in =====
   Everything here is scenery or a picture of the game state. It reads the state; it never changes it.
   Repeated shapes are instanced and materials are shared so the extra scenery costs few draw calls. */

/* Terrain carving, added to heightAt() in game.js. Called while the ground is being built, so it may use only its
   arguments and smooth(). It cuts a winding canyon north of the Canyon rim site, with stepped (terraced) walls. */
function v4Carve(x, z) {
  const cz = -47 + Math.sin(x * .045) * 4, d = Math.abs(z - cz), half = 11 + 3 * Math.sin(x * .07 + 1);
  if (d > half + 7 || x < -95 || x > 110) return 0;
  const along = smooth(-95, -60, x) * (1 - smooth(75, 110, x)), wall = 1 - smooth(half - 1, half + 6, d);
  return -17 * (Math.floor(wall * 3.999) / 4 * .4 + wall * .6) * along;
}

const w4 = { rocks: [], lights: [], beacons: {}, build: [], dunes: null, far: null, dust2: null, streaks: [], frost: [], sock: null, shadow: null, night: [], roverDust: null, dustAmt: 0, pipFans: [], yaw: null, devilT: 0, obsDomes: [], spin: [] };
{
  const rockA = SM({ color: '#6a5446', roughness: .96, map: grainTex, bumpMap: grainTex, bumpScale: 2.5, envMapIntensity: .2 });
  const rockB = SM({ color: '#8d674f', roughness: 1, map: grainTex, bumpMap: grainTex, bumpScale: 2.5, envMapIntensity: .2 });
  const sandM = SM({ color: '#a8815f', roughness: 1, map: grainTex, envMapIntensity: .15 });
  const d = new THREE.Object3D();
  const inst = (geo, m, list, shadow) => { const im = new THREE.InstancedMesh(geo, m, list.length); list.forEach((p, i) => { d.position.set(p[0], p[1], p[2]); d.scale.set(p[3], p[4], p[5]); d.rotation.set(p[7] || 0, p[6] || 0, p[8] || 0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = !!shadow; im.receiveShadow = true; scene.add(im); return im; };
  const solid = (x, z, r) => w4.rocks.push({ x, z, r });

  /* Distance: a ring of hazy mountains and flat-topped mesas, so the land has a far, a middle and a near. */
  { const L = []; for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283 + hash(k, 5) * .2, r = 215 + hash(k, 6) * 95, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 26 + hash(k, 7) * 30; L.push([x, heightAt(x, z) - 4, z, s, 14 + hash(k, 8) * 22, s * (.7 + hash(k, 9) * .5), hash(k, 4) * 6]); }
    w4.far = inst(lump(2, .55, 21), SM({ color: '#7b5b49', roughness: 1, envMapIntensity: .1 }), L, false); }
  { const L = []; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283 + 1.1 + hash(k, 15) * .4, r = 105 + hash(k, 16) * 70, x = Math.cos(a) * r, z = Math.sin(a) * r, s = 13 + hash(k, 17) * 13; if (Math.abs(z + 47) < 34 && x > -95 && x < 110) continue; L.push([x, heightAt(x, z) + 4, z, s, 9 + hash(k, 18) * 8, s * (.8 + hash(k, 19) * .4), hash(k, 14) * 6]); }
    inst(new THREE.CylinderGeometry(.82, 1.2, 1, 9), SM({ color: '#8a5c44', roughness: 1, map: grainTex, envMapIntensity: .12 }), L, true); }
  /* Middle distance: crescent dunes lined up with the wind. */
  { const L = []; for (let k = 0; k < 46; k++) { const a = 1.6 + hash(k, 31) * 3.6, r = 44 + Math.pow(hash(k, 32), 1.4) * 90, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(z + 47) < 26) continue; const s = 6 + hash(k, 33) * 7; L.push([x, heightAt(x, z) - .15, z, s, .9 + hash(k, 34) * .9, s * .42, .5 + hash(k, 35) * .5]); }
    w4.dunes = inst(new THREE.SphereGeometry(1, 16, 8), sandM, L, false); }

  /* ---- Environment B: Ice crater. A broken crater wall and patches of frost. ---- */
  { const S = M.SITES.ice, L = []; for (let k = 0; k < 24; k++) { const a = .9 + k / 24 * 4.5, r = 8.6 + hash(k, 41) * 1.2, x = S.x + Math.cos(a) * r, z = S.z + Math.sin(a) * r, s = 1.2 + hash(k, 42) * 1.3; L.push([x, s * .35, z, s * 1.2, s * (.9 + hash(k, 43)), s, hash(k, 44) * 6]); solid(x, z, s * .9); }
    inst(lump(2, .5, 31), rockA, L, true);
    const frostM = new THREE.MeshStandardMaterial({ color: '#dff3fa', roughness: .25, transparent: true, opacity: .55, depthWrite: false, emissive: '#3f8fb0', emissiveIntensity: .15 });
    frostM.map = softTex;   /* soft edges instead of a hard plastic-looking disc */
    for (let k = 0; k < 7; k++) {
      const a = hash(k, 45) * 6.283, r = 1.5 + hash(k, 46) * 5.5, rad = .7 + hash(k, 47) * 1.1, cx = S.x + Math.cos(a) * r, cz = S.z + Math.sin(a) * r;
      /* a small grid whose points are lifted onto the bowl, so no edge sinks into the slope or hangs in the air */
      const g = new THREE.PlaneGeometry(rad * 2, rad * 1.2, 8, 6); g.rotateX(-Math.PI / 2); const pa = g.attributes.position;
      for (let v = 0; v < pa.count; v++) pa.setY(v, heightAt(cx + pa.getX(v), cz + pa.getZ(v)) + .06);
      g.computeVertexNormals(); const m = new THREE.Mesh(g, frostM); m.position.set(cx, 0, cz); m.renderOrder = 2; scene.add(m);
    }
  }

  /* ---- Environment C: Lava tube. A rocky mound with a dark cave mouth, a collapsed skylight and a dim light inside. ---- */
  { const S = M.SITES.lava, g = group(S.x + 3.5, S.z - 4.5, null), L = [];
    for (let k = 0; k < 11; k++) { const a = k / 11 * 6.283, r = 3 + hash(k, 51) * 2.2, s = 2 + hash(k, 52) * 1.6; L.push([g.position.x + Math.cos(a) * r, s * .5, g.position.z + Math.sin(a) * r * .8 - 1.5, s * 1.3, s * (.9 + hash(k, 53) * .5), s * 1.2, hash(k, 54) * 6]); }
    L.push([g.position.x, 2.6, g.position.z - 1.6, 5.2, 2.6, 4.4, .4]); inst(lump(2, .45, 41), rockA, L, true); solid(g.position.x, g.position.z - 1.5, 5.6);
    add(g, new THREE.TorusGeometry(1.9, .75, 8, 14, Math.PI), rockB, 0, 0, 2.4, 0, 0, 0);
    add(g, new THREE.CircleGeometry(1.85, 20), new THREE.MeshBasicMaterial({ color: '#070404' }), 0, .9, 2.25, 0, 0, 0, true).scale.y = .95;
    for (let k = 0; k < 6; k++) add(g, new THREE.ConeGeometry(.12 + hash(k, 55) * .1, .5 + hash(k, 56) * .5, 5), rockA, -1.2 + k * .48, 1.75 - Math.abs(k - 2.5) * .22, 2.5, Math.PI, 0, 0);
    const lamp = new THREE.PointLight(0x7fc8ff, 0, 14, 1.6); lamp.position.set(0, 1.2, 3.4); g.add(lamp); w4.lights.push({ l: lamp, base: 1.2, night: 9 }); glow(g, 0, 1, 2.6, '#6fb6ff', 2.2, .25); }

  /* ---- Environment D: Dry riverbed. A winding channel of darker sediment, pale sand bars, banks and rounded pebbles. ---- */
  { const S = M.SITES.river, cz = x => S.z + 5 * Math.sin((x - S.x) * .12), pts = [], idx = [], N = 48;
    for (let i = 0; i <= N; i++) { const x = -60 + i * (50 / N), wdt = 2.1 + Math.sin(i * .5) * .5, z = cz(x); pts.push(x, .04, z - wdt, x, .04, z + wdt); if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const bed = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#8a7766', roughness: 1, transparent: true, opacity: .92, depthWrite: false })); bed.receiveShadow = true; scene.add(bed);
    const bank = [], peb = [], bars = [];
    for (let k = 0; k < 70; k++) { const x = -59 + hash(k, 61) * 48, side = k % 2 ? 1 : -1, s = .35 + hash(k, 62) * .55; bank.push([x, s * .25, cz(x) + side * (2.9 + hash(k, 63) * .6), s * 1.6, s * .7, s, hash(k, 64) * 6]); }
    for (let k = 0; k < 130; k++) { const x = -58 + hash(k, 65) * 46, s = .07 + hash(k, 66) * .13; peb.push([x, s * .5, cz(x) + (hash(k, 67) - .5) * 3.2, s * 1.3, s * .7, s, hash(k, 68) * 6]); }
    for (let k = 0; k < 6; k++) { const x = -54 + k * 7.5, s = 1.4 + hash(k, 69); bars.push([x, .02, cz(x) + (k % 2 ? .8 : -.8), s * 1.8, .09, s * .5, .2]); }
    inst(lump(1, .35, 51), rockB, bank, false); inst(new THREE.SphereGeometry(1, 8, 6), SM({ color: '#9a8b80', roughness: .7 }), peb, false); inst(new THREE.SphereGeometry(1, 12, 6), SM({ color: '#8f7a63', roughness: 1 }), bars, false); }

  /* ---- The dead river. The Dry riverbed site is the head of an old river valley. It runs north, down the canyon wall, and
     along the canyon floor, so the trench reads as a valley cut by water long ago. Pale cracked silt, sand bars, rounded stones. ---- */
  { const S = M.SITES.river, fl = x => -47 + Math.sin(x * .045) * 4, P = [[S.x, S.z - 2], [S.x + 2, S.z - 10], [S.x - 1, S.z - 19], [S.x + 2, S.z - 27], [S.x, S.z - 31]];
    for (let x = S.x + 3; x <= 60; x += 3) P.push([x, fl(x) + Math.sin(x * .16) * 2.2]);
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const at = s => { let i = 1; while (i < P.length - 1 && L[i] < s) i++; const k = (s - L[i - 1]) / (L[i] - L[i - 1] || 1); return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * k, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * k]; };
    const total = L[L.length - 1], N = Math.round(total / .8), pts = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) { const s = i / N * total, a = at(s), b = at(Math.min(total, s + .5)), dx = b[0] - a[0], dz = b[1] - a[1], ln = Math.hypot(dx, dz) || 1, wob = Math.sin(s * .35) * 1.1, wd = (s < 30 ? 1.5 : 2.6) + Math.sin(s * .21) * .5, cx = a[0] - dz / ln * wob, cz = a[1] + dx / ln * wob;
      for (const sd of [-1, 1]) { const x = cx - dz / ln * wd * sd, z = cz + dx / ln * wd * sd; pts.push(x, heightAt(x, z) + .07, z); uv.push(s / 7, sd < 0 ? 0 : 1); } if (i < N) { const q = i * 2; idx.push(q, q + 1, q + 2, q + 1, q + 3, q + 2); } }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const crack = canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#6f5d4c'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(52,38,30,.6)'; c.lineWidth = 1.2; for (let k = 0; k < 11; k++) { const x = hash(k, 91) * w, y = hash(k, 92) * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(k, 93) - .5) * 70, y + (hash(k, 94) - .5) * 70); c.lineTo(x + (hash(k, 95) - .5) * 90, y + (hash(k, 96) - .5) * 60); c.stroke(); } });
    crack.wrapS = crack.wrapT = THREE.RepeatWrapping;
    const bed = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: crack, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); bed.receiveShadow = true; scene.add(bed);
    const peb = [], bars = [], stones = [];
    for (let k = 0; k < 160; k++) { const s = hash(k, 97) * total, a = at(s), x = a[0] + (hash(k, 98) - .5) * 4.5, z = a[1] + (hash(k, 99) - .5) * 4.5, r = .07 + hash(k, 100) * .14; peb.push([x, heightAt(x, z) + r * .4, z, r * 1.3, r * .7, r, hash(k, 101) * 6]); }
    for (let k = 0; k < 14; k++) { const s = (k + .5) / 14 * total, a = at(s), x = a[0] + (k % 2 ? 1 : -1) * .9, z = a[1], w = 1.4 + hash(k, 102) * 1.2; bars.push([x, heightAt(x, z) + .1, z, w * 1.8, .12, w * .55, hash(k, 103) * 3]); }
    for (let k = 0; k < 26; k++) { const s = hash(k, 104) * total, a = at(s), side = k % 2 ? 1 : -1, x = a[0] + side * (3.3 + hash(k, 105) * 1.6), z = a[1] + (hash(k, 106) - .5) * 2, r = .45 + hash(k, 107) * .7; stones.push([x, heightAt(x, z) + r * .3, z, r * 1.3, r * .8, r, hash(k, 108) * 6]); }
    inst(new THREE.SphereGeometry(1, 8, 6), SM({ color: '#9a8b80', roughness: .7 }), peb, false); inst(new THREE.SphereGeometry(1, 12, 6), SM({ color: '#85705b', roughness: 1 }), bars, false); inst(lump(1, .35, 57), rockB, stones, true); }

  /* ---- Craters. The terrain already has real bowls (see craters in game.js). This adds what makes them read as impact craters:
     a ring of boulders on the raised rim and rocks thrown outwards, thicker on one side as if from a slanted hit. ---- */
  { const cl = craters.concat([{ x: M.SITES.ice.x, z: M.SITES.ice.z, r: 9.5 }]), rim = [], ejecta = [];
    cl.forEach((c, i) => { const nr = Math.round(8 + c.r * .9), side = hash(i, 111) * 6.283;
      for (let k = 0; k < nr; k++) { const a = k / nr * 6.283 + hash(i * 40 + k, 112) * .3, rr = c.r * (1 + (hash(i * 40 + k, 113) - .4) * .14), x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr, s = (.25 + hash(i * 40 + k, 114) * .55) * Math.min(1.6, .6 + c.r / 14); if (Math.hypot(x, z) < 40 && c !== cl[cl.length - 1]) continue; rim.push([x, heightAt(x, z) + s * .25, z, s * 1.3, s * .8, s, hash(i * 40 + k, 115) * 6]); }
      for (let k = 0; k < nr; k++) { const a = side + (hash(i * 40 + k, 116) - .5) * 2.6, rr = c.r * (1.25 + hash(i * 40 + k, 117) * 1.7), x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr, s = .12 + hash(i * 40 + k, 118) * .3; if (Math.hypot(x, z) < 40 || (Math.abs(z + 47) < 20 && x > -95 && x < 110)) continue; ejecta.push([x, heightAt(x, z) + s * .3, z, s * 1.2, s * .7, s, hash(i * 40 + k, 119) * 6]); } });
    inst(lump(1, .4, 63), rockA, rim, true); inst(lump(0, .4, 64), rockB, ejecta, false); }

  /* ---- Environment E: Canyon rim. Layered rock pillars and edge markers above the canyon. ---- */
  { const S = M.SITES.canyon, cols = ['#8a4a30', '#b9774e', '#6e3a28', '#cf9a6a', '#93553a'], mats = cols.map(c => SM({ color: c, roughness: .95, map: grainTex }));
    const rimZ = x => { let z = S.z - 3; while (z > S.z - 12 && v4Carve(x, z - 2.6) > -.03) z -= .5; return z; };   /* the last flat ground before the canyon wall starts */
    for (let k = 0; k < 7; k++) { const x = S.x - 15 + k * 5 + hash(k, 71) * 2, z = rimZ(x) + 1.2, g = group(x, z, null), n = 4 + Math.floor(hash(k, 73) * 3); let lo = heightAt(x, z); for (let q = 0; q < 8; q++) lo = Math.min(lo, heightAt(x + Math.cos(q * .785) * 1.6, z + Math.sin(q * .785) * 1.6));   /* lowest ground under the base, so no side hangs in the air */
      g.position.y = lo - .15; const h0 = heightAt(x, z) - lo + .35; add(g, new THREE.CylinderGeometry(1.25, 1.5, h0, 8), mats[k % 5], 0, h0 / 2, 0); let y = h0;
      for (let j = 0; j < n; j++) { const h = .5 + hash(k * 9 + j, 74) * .6, r = (1.1 - j * .12) * (.8 + hash(k * 9 + j, 75) * .5); add(g, new THREE.CylinderGeometry(r * .9, r, h, 8), mats[(k + j) % 5], 0, y + h / 2, 0, 0, hash(j, k) * 3, 0); y += h; }
      add(g, lump(1, .4, 60 + k), mats[(k + 2) % 5], 0, y + .35, 0).scale.set(1.25, .5, 1.1); solid(x, z, 1.3); }
    for (const dx of [-9, 0, 9]) { const mz = rimZ(S.x + dx) + 2.4, g = group(S.x + dx, mz, null); g.position.y = heightAt(S.x + dx, mz); add(g, cylG(.05, .05, 1.3, 6), MAT.grey, 0, .65, 0); add(g, rbox(.34, .34, .04, .02), MAT.orange, 0, 1.3, 0, 0, 0, Math.PI / 4); } }

  /* ---- Environment F: Old lander site. A faded parachute, the backshell, scattered panels and the old wheel tracks. ---- */
  { const S = M.SITES.probe, g = group(S.x + 6, S.z + 5, null);
    const chute = canvasTex(128, 128, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? '#d9cdbd' : '#c97a4a'; c.beginPath(); c.moveTo(w / 2, h / 2); c.arc(w / 2, h / 2, w, k * Math.PI / 4, (k + 1) * Math.PI / 4); c.fill(); } c.fillStyle = 'rgba(150,110,80,.35)'; c.fillRect(0, 0, w, h); });
    const cm = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), SM({ map: chute, roughness: 1, side: THREE.DoubleSide })); cm.scale.set(1, .13, .8); cm.position.y = .03; cm.rotation.y = .7; cm.receiveShadow = true; g.add(cm);
    add(g, new THREE.ConeGeometry(1.5, 1.1, 16, 1, true), SM({ color: '#b9b1a4', roughness: .8, side: THREE.DoubleSide }), -6.5, .5, 2.5, 1.9, .4, .3);
    for (let k = 0; k < 6; k++) add(g, rbox(.5 + hash(k, 81) * .6, .04, .4 + hash(k, 82) * .4, .01), k % 2 ? MAT.foil : MAT.grey, -9 + hash(k, 83) * 6, .05, -6 + hash(k, 84) * 7, 0, hash(k, 85) * 3, hash(k, 86) * .3);
    const tm = new THREE.MeshBasicMaterial({ color: '#5a3324', transparent: true, opacity: .3, depthWrite: false });
    for (const o of [-.6, .6]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(9, .3), tm); t.rotation.x = -Math.PI / 2; t.rotation.z = .5; t.position.set(-10, .03, -3 + o); g.add(t); }
    solid(S.x, S.z, 1.6); }

  /* ---- Environment A: Landing zone extras. Cargo crates by the lander and a windsock that shows the wind. ---- */
  { const g = group(LAND[0] + 5.5, LAND[1] + 1.5, null); for (const [x, y, z, s] of [[0, .4, 0, .8], [.95, .4, .2, .8], [.45, 1.15, .1, .7], [-1, .3, .9, .6]]) { add(g, rbox(s, s, s, .05), MAT.foil, x, y, z, 0, x, 0); add(g, rbox(s * 1.02, .06, s * 1.02, .01), MAT.orange, x, y, z, 0, x, 0); } solid(g.position.x, g.position.z, 1.6); solid(LAND[0], LAND[1], 4.2);
    const p = group(3.2, -1.2, null); add(p, cylG(.04, .05, 3.2, 6), MAT.grey, 0, 1.6, 0); const sock = new THREE.Group(); sock.position.y = 3.1; p.add(sock);
    add(sock, new THREE.CylinderGeometry(.2, .09, 1.3, 10, 1, true), SM({ color: '#e8743a', roughness: .9, side: THREE.DoubleSide }), .7, 0, 0, 0, 0, Math.PI / 2); add(sock, torG(.2, .02), MAT.grey, .05, 0, 0, 0, Math.PI / 2, 0); w4.sock = sock; }
  for (const l of M.locations) if (l.id !== 'rover') solid(l.x, l.z, l.r);

  /* ---- Weather you can see: a second, nearer layer of blowing dust and fast streaks along the ground in a dust storm. ---- */
  { const n = 520, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = (hash(i, 91) - .5) * 90; pos[i * 3 + 1] = hash(i, 92) * 7; pos[i * 3 + 2] = (hash(i, 93) - .5) * 90; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    w4.dust2 = new THREE.Points(geo, new THREE.PointsMaterial({ map: softTex, color: '#d9b48e', size: 1.7, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true })); w4.dust2.frustumCulled = false; w4.dust2.visible = false; scene.add(w4.dust2);
    for (let k = 0; k < 18; k++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex, color: '#e2bf9a', transparent: true, opacity: 0, depthWrite: false })); s.scale.set(9, .5, 1); s.position.set((hash(k, 94) - .5) * 80, .4 + hash(k, 95) * 1.6, (hash(k, 96) - .5) * 80); s.visible = false; scene.add(s); w4.streaks.push(s); } }
  /* Cold snap: a thin sheet of frost on the packed ground of the base. */
  { const fm = new THREE.MeshBasicMaterial({ color: '#dceaf2', transparent: true, opacity: 0, depthWrite: false, map: softTex }); for (let k = 0; k < 9; k++) { const m = new THREE.Mesh(new THREE.CircleGeometry(3 + hash(k, 97) * 3, 18), fm); m.rotation.x = -Math.PI / 2; m.position.set((hash(k, 98) - .5) * 34, .05, (hash(k, 99) - .5) * 30); m.visible = false; scene.add(m); w4.frost.push(m); } w4.frostM = fm; }

  /* ---- A soft contact shadow under the astronaut, and warm lights that come on at night. ---- */
  { const m = new THREE.Mesh(new THREE.CircleGeometry(.55, 20), new THREE.MeshBasicMaterial({ map: softTex, color: '#000', transparent: true, opacity: .34, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = .03; scene.add(m); w4.shadow = m; }
  for (const [x, y, z, c, s] of [[HOME.x, 1.6, HOME.z + 2.6, '#ffd9a0', 5], [7, 1.4, -4, '#ff9fe0', 4.5], [0, 1.2, -4, '#9fe8ff', 3], [-4, 1.3, -9.2, '#ffc890', 3.4], [12, 1.4, 6.8, '#b5b7ff', 3]]) { const sp = glow(scene, x, y, z, c, s, 0); w4.night.push(sp); }
  { const l = new THREE.PointLight(0xffd2a0, 0, 26, 1.4); l.position.set(HOME.x + 1, 3.2, HOME.z + 4); scene.add(l); w4.lights.push({ l, base: 0, night: 14 }); }

  /* ---- The seven v4 colony modules. Each is added to every pad next to the v3 models, so the same sync code shows it. ---- */
  const make = (g) => {
    const o = {}, mk = () => { const q = new THREE.Group(); q.visible = false; g.add(q); return q; }; let q;
    q = o.well = mk(); { add(q, rbox(3, .14, 2.2, .05), MAT.slab, 0, .23, 0); add(q, cylG(.5, .6, 1.5, 16), MAT.white, -.7, 1.05, 0); add(q, torG(.52, .05), MAT.teal, -.7, 1.3, 0, Math.PI / 2); add(q, cylG(.09, .09, 2.6, 8), MAT.grey, .8, 1.5, 0); const dr = new THREE.Group(); dr.position.set(.8, .6, 0); add(dr, new THREE.ConeGeometry(.2, .6, 8), MAT.dark, 0, 0, 0, Math.PI); add(dr, torG(.16, .04), MAT.orange, 0, .3, 0, Math.PI / 2); q.add(dr); q.userData.fan = dr; add(q, capG(.3, .7), MAT.silver, .1, .75, .7, 0, 0, Math.PI / 2); add(q, rbox(.5, .3, .05, .02), glowM('#6fc3ff', 2.4), -.7, .9, .56, 0, 0, 0, true); }
    q = o.ghx = mk(); { add(q, rbox(3.3, .14, 2.3, .05), MAT.slab, 0, .23, 0); const gl = add(q, new THREE.CylinderGeometry(1, 1, 3, 20, 1, false, 0, Math.PI), MAT.glass, 0, .3, 0, 0, 0, Math.PI / 2, true); gl.rotation.set(Math.PI / 2, 0, Math.PI / 2); for (const x of [-1.45, 0, 1.45]) add(q, torG(1.01, .04, Math.PI, 16), MAT.cream, x, .3, 0, 0, Math.PI / 2, 0); for (const x of [-.9, 0, .9]) for (const z of [-.4, .4]) add(q, sphG(.2, 8), MAT.leaf[(Math.abs(x * 3 + z * 5) | 0) % 3], x, .62, z, 0, 0, 0, true); add(q, rbox(2.8, .05, .08, .02), glowM('#ff6fd8', 2.2), 0, 1.22, 0, 0, 0, 0, true); }
    q = o.grid = mk(); { add(q, rbox(3, .14, 2, .05), MAT.slab, 0, .23, 0); for (const x of [-.9, 0, .9]) { add(q, rbox(.7, 1.5, .8, .06), MAT.dark, x, 1.05, -.2); add(q, rbox(.5, .08, .04, .02), glowM('#8fe6c0', 2.6), x, 1.5, .22, 0, 0, 0, true); add(q, rbox(.5, .08, .04, .02), glowM('#ffcf72', 2.2), x, 1.3, .22, 0, 0, 0, true); } add(q, cylG(.05, .05, 2.4, 6), MAT.grey, 1.3, 1.5, .6); add(q, rbox(.8, .05, .05, .01), MAT.grey, 1.3, 2.6, .6); for (const x of [.95, 1.65]) add(q, sphG(.07, 8), MAT.teal, x, 2.6, .6); }
    q = o.med = mk(); { add(q, rbox(3, .14, 2.2, .05), MAT.slab, 0, .23, 0); add(q, capG(.8, 1.3), MAT.white, 0, 1.1, 0, 0, 0, Math.PI / 2); const rm = SM({ color: '#d6453a', roughness: .5 }); add(q, rbox(.6, .18, .04, .02), rm, 0, 1.2, .81); add(q, rbox(.18, .6, .04, .02), rm, 0, 1.2, .81); add(q, torG(.815, .05), rm, -.7, 1.1, 0, 0, Math.PI / 2); add(q, rbox(.5, .4, .4, .05), MAT.silver, 1.2, .5, .5); glow(q, 0, 1.2, 1.1, '#ffd0c8', 1.5, .3); }
    q = o.obs = mk(); { add(q, rbox(2.6, .14, 2.6, .05), MAT.slab, 0, .23, 0); add(q, cylG(1, 1.05, .9, 20), MAT.cream, 0, .75, 0); const dome = new THREE.Group(); dome.position.y = 1.2; q.add(dome); add(dome, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.silver, 0, 0, 0); add(dome, rbox(.34, .9, .5, .03), MAT.dark, 0, .55, .72, -.6); add(dome, cylG(.12, .14, .7, 10), MAT.grey, 0, .75, .7, .95); q.userData.dome = dome; w4.obsDomes.push(dome); }
    q = o.ccentre = mk(); { add(q, rbox(3, .14, 2.2, .05), MAT.slab, 0, .23, 0); add(q, rbox(1.9, 1.1, 1.5, .1), MAT.cream, -.3, .85, 0); for (const x of [-.8, -.3, .2]) add(q, rbox(.3, .24, .04, .02), glowM('#b5b7ff', 2.4), x, 1, .76, 0, 0, 0, true); const ds = new THREE.Group(); ds.position.set(1, 1.5, 0); add(ds, cylG(.05, .07, 1.2, 8), MAT.grey, 0, -.5, 0); add(ds, new THREE.LatheGeometry([V2(0, 0), V2(.3, .04), V2(.6, .16), V2(.85, .34)], 20), SM({ color: '#e6ddc8', roughness: .45, metalness: .25, side: THREE.DoubleSide }), 0, .1, 0, -.8); q.add(ds); q.userData.fan = ds; add(q, cylG(.02, .02, 1.6, 5), MAT.grey, -1, 2.1, -.4); add(q, sphG(.05, 8), commsBeaconShared, -1, 2.92, -.4, 0, 0, 0, true); }
    q = o.alab = mk(); { add(q, rbox(3.2, .14, 2.2, .05), MAT.slab, 0, .23, 0); add(q, capG(.75, 1.5), MAT.white, 0, 1.05, 0, 0, 0, Math.PI / 2); add(q, torG(.765, .05), MAT.orange, .5, 1.05, 0, 0, Math.PI / 2); add(q, cylG(.3, .3, .5, 12), MAT.dark, -1.2, .55, .6); add(q, cylG(.1, .1, .9, 8), MAT.silver, -1.2, 1.2, .6); for (const x of [-.4, .1, .6]) add(q, rbox(.3, .22, .04, .02), glowM('#7fe6c8', 2.4), x, 1.2, .74, -.2, 0, 0, true); add(q, rbox(.8, .5, .6, .05), MAT.foil, 1.15, .5, -.5); }
    return o;
  };
  const okM = glowM('#8fe6c0', 2.4), wornM = glowM('#ffb060', 2.6), deadM = glowM('#ff4a4a', 4);
  for (const [pid, pm] of Object.entries(padMods)) {
    const g = stationGroups[pid]; Object.assign(pm.mods, make(g));
    /* status mast: a light and a shape that changes with the module's condition (round = good, diamond = worn, cross = offline) */
    const b = new THREE.Group(); b.position.set(-1.6, 0, 1.6); b.visible = false; g.add(b); add(b, cylG(.03, .03, 1.1, 6), MAT.grey, 0, .65, 0);
    const lamp = add(b, sphG(.11, 10), okM, 0, 1.25, 0, 0, 0, 0, true), dia = add(b, new THREE.OctahedronGeometry(.16), wornM, 0, 1.25, 0, 0, 0, 0, true), crs = new THREE.Group(); crs.position.y = 1.25; b.add(crs); add(crs, rbox(.42, .09, .09, .02), deadM, 0, 0, 0, 0, 0, Math.PI / 4, true); add(crs, rbox(.42, .09, .09, .02), deadM, 0, 0, 0, 0, 0, -Math.PI / 4, true);
    /* scaffold shown while a module is being built */
    const sc = new THREE.Group(); sc.visible = false; g.add(sc); for (const sx of [-1.5, 1.5]) for (const sz of [-1.5, 1.5]) add(sc, cylG(.035, .035, 3, 6), MAT.grey, sx, 1.6, sz); for (const y of [1.2, 2.9]) { add(sc, rbox(3, .05, .05, .01), MAT.orange, 0, y, 1.5); add(sc, rbox(3, .05, .05, .01), MAT.orange, 0, y, -1.5); add(sc, rbox(.05, .05, 3, .01), MAT.orange, 1.5, y, 0); add(sc, rbox(.05, .05, 3, .01), MAT.orange, -1.5, y, 0); }
    const arm = new THREE.Group(); arm.position.set(1.5, 3.1, 1.5); sc.add(arm); add(arm, rbox(2.4, .08, .08, .02), MAT.dark, -1.1, 0, 0); add(arm, cylG(.012, .012, 1, 4), MAT.grey, -2.1, -.5, 0); add(arm, rbox(.3, .2, .3, .03), MAT.foil, -2.1, -1.05, 0);
    w4.beacons[pid] = { b, lamp, dia, crs, sc, arm, t: 0 };
  }
  w4.deadM = deadM;

  /* ---- Rover: more of a science vehicle. Suspension arms, a camera mast, a robot arm, antennas, a power unit and a film of dust. ---- */
  { const R = rover;
    for (const z of [-.62, .62]) { add(R, rbox(1.05, .07, .07, .02), MAT.grey, -.42, .62, z, 0, 0, .28); add(R, rbox(1.05, .07, .07, .02), MAT.grey, .42, .62, z, 0, 0, -.28); add(R, sphG(.08, 8), MAT.dark, 0, .76, z); }
    const mast = new THREE.Group(); mast.position.set(.55, 1.6, -.38); R.add(mast); add(mast, cylG(.035, .045, .95, 8), MAT.grey, 0, .47, 0); const head = new THREE.Group(); head.position.y = 1; mast.add(head); add(head, rbox(.42, .2, .22, .04), MAT.white, 0, 0, 0); for (const z of [-.11, .11]) { add(head, cylG(.055, .055, .08, 10), MAT.dark, .22, 0, z, 0, 0, Math.PI / 2); add(head, sphG(.04, 8), MAT.visor, .26, 0, z); } w4.mast = head;
    const arm = new THREE.Group(); arm.position.set(1.05, .9, .42); R.add(arm); add(arm, sphG(.07, 8), MAT.grey, 0, 0, 0); const a1 = new THREE.Group(); arm.add(a1); add(a1, rbox(.6, .07, .07, .02), MAT.silver, .3, 0, 0); const a2 = new THREE.Group(); a2.position.x = .6; a1.add(a2); add(a2, rbox(.5, .06, .06, .02), MAT.silver, .25, 0, 0); add(a2, cylG(.1, .1, .12, 10), MAT.dark, .52, 0, 0, 0, 0, Math.PI / 2); add(a2, sphG(.04, 8), glowM('#7fe6c8', 3), .6, 0, 0, 0, 0, 0, true); a1.rotation.z = 1.2; a2.rotation.z = -2.3; w4.arm = { a1, a2, t: 0 };
    const hg = new THREE.Group(); hg.position.set(-.55, 1.72, .32); R.add(hg); add(hg, cylG(.025, .025, .3, 6), MAT.grey, 0, .15, 0); add(hg, new THREE.LatheGeometry([V2(0, 0), V2(.14, .02), V2(.27, .08), V2(.36, .17)], 16), SM({ color: '#ecebe6', roughness: .4, metalness: .3, side: THREE.DoubleSide }), 0, .3, 0, -.6, 0, .3);
    add(R, cylG(.012, .012, 1.1, 5), MAT.grey, -1.05, 1.9, -.4); add(R, sphG(.03, 6), MAT.orange, -1.05, 2.46, -.4);
    add(R, cylG(.17, .17, .55, 12), MAT.dark, -1.32, 1.02, 0, 0, 0, Math.PI / 2 - .5); for (let k = 0; k < 6; k++) add(R, rbox(.5, .02, .2, .005), MAT.grey, -1.34 - Math.sin(.5) * 0, 1.02 + Math.sin(k * 1.047) * .21, Math.cos(k * 1.047) * .21, k * 1.047, 0, -.5);
    add(R, rbox(.05, .05, 1.1, .01), MAT.dark, 1.2, 1.02, 0); for (const z of [-.3, 0, .3]) add(R, sphG(.045, 8), glowM('#fff0c8', 3), 1.23, 1.02, z, 0, 0, 0, true);
    const dm = new THREE.MeshStandardMaterial({ color: '#a8795a', roughness: 1, transparent: true, opacity: 0, depthWrite: false }); w4.roverDust = dm; add(R, rbox(1.9, .9, 1.25, .26), dm, -.1, 1.18, 0, 0, 0, 0, true); add(R, rbox(1.34, .03, 1.04, .01), dm, -.3, 1.7, 0, 0, 0, 0, true); }

  /* ---- Pip: fan blades that really turn inside the two pods. ---- */
  for (const x of [-.5, .5]) { const f = new THREE.Group(); f.position.set(x, 1.8, 0); pip.add(f); for (let k = 0; k < 3; k++) add(f, rbox(.2, .012, .05, .005), MAT.grey, Math.cos(k * 2.094) * .06, 0, Math.sin(k * 2.094) * .06, 0, -k * 2.094, .25, true); f.traverse(o => { o.userData.pip = true; }); w4.pipFans.push(f); }
}

/* Scenery density follows the performance profile. */
function w4Detail(P) {
  if (w4.dunes) { w4.duneMax = w4.duneMax || w4.dunes.count; w4.dunes.count = Math.min(w4.duneMax, Math.max(8, Math.round(w4.duneMax * P.detail))); }   /* never more than were built */
  if (w4.dust2) w4.dust2.geometry.setDrawRange(0, Math.round(520 * P.particles));
  w4.streakN = Math.round(18 * P.particles); w4.lightsOn = P.anim >= 1; w4.anim = P.anim;
}
function w4Reset() { for (const b of Object.values(w4.beacons)) { b.sc.visible = false; b.t = 0; } w4.dustAmt = 0; }

/* A module is going up: scaffold and a small crane for a few seconds while the module rises. */
function w4Construct(pid) { const b = w4.beacons[pid]; if (!b || RM()) return; b.t = 3.2; b.sc.visible = true; const g = padMods[pid].mods[state.modules[pid]]; if (g) g.scale.setScalar(.05); if (state.hist && state.hist.filter(h => /^Built/.test(h.what)).length === 1) c4Play('First colony construction', stationGroups[pid].position.x, stationGroups[pid].position.z, 9, 'A new module rises on ' + M.lname(pid) + '.'); }

function w4Sync() {
  for (const [pid, b] of Object.entries(w4.beacons)) {
    const t = state.modules[pid], c = t && state.cond ? (state.cond[pid] == null ? 100 : state.cond[pid]) : null;
    b.b.visible = c != null; if (c == null) continue;
    b.lamp.visible = c >= 50; b.dia.visible = c > 0 && c < 50; b.crs.visible = c <= 0;
    const lbl = labelNodes[pid] && labelNodes[pid].querySelector('span'); if (lbl) lbl.textContent = M.MODULES[t].name + (c <= 0 ? ' ✖ offline' : c < 50 ? ' ⚠ worn' : '');
  }
}

/* Every frame: weather layers, night lights, moving parts, the astronaut's small movements and Pip's fans. */
function w4Frame(dt, moving) {
  const rm = RM(), ev = started ? M.eventOf(state) : null, wind = ev === 'dust' ? 1 : ev === 'devil' ? .55 : .18;
  /* layered dust and ground streaks in a dust storm */
  const d2 = w4.dust2, op = hazeV * .5; d2.visible = op > .01; d2.material.opacity = op;
  if (d2.visible && !rm) { const p = d2.geometry.attributes.position, cx = drv ? drv.v.x : 0, cz = drv ? drv.v.z : 0, n = d2.geometry.drawRange.count === Infinity ? p.count : d2.geometry.drawRange.count; for (let i = 0; i < n; i++) { let x = p.getX(i) + dt * 15, y = p.getY(i) + Math.sin(elapsed * 2 + i) * dt * .6; if (x > cx + 45) x -= 90; if (x < cx - 45) x += 90; let z = p.getZ(i); if (z > cz + 45) z -= 90; if (z < cz - 45) z += 90; p.setXYZ(i, x, Math.max(.1, y), z); } p.needsUpdate = true; }
  w4.streaks.forEach((s, i) => { const on = hazeV > .05 && i < (w4.streakN == null ? 18 : w4.streakN) && !rm; s.visible = on; if (!on) return; s.material.opacity = hazeV * .28; s.position.x += dt * (26 + i % 5 * 4); if (s.position.x > 45) s.position.x = -45; });
  w4.frost.forEach(m => { m.visible = coldV > .02; }); w4.frostM.opacity = coldV * .38;
  /* windsock: droops in calm air, stands out and flutters in wind */
  if (w4.sock) { w4.sock.rotation.z = rm ? -.5 * (1 - wind) : -.9 * (1 - wind) + Math.sin(elapsed * (3 + wind * 9)) * .06 * (1 + wind * 2); w4.sock.rotation.y = rm ? 0 : Math.sin(elapsed * .4) * .25; }
  /* the dust devil brushes the solar field as it passes */
  if (devil.visible && !rm) { w4.devilT -= dt; const L = stationGroups.solar.position; if (w4.devilT <= 0 && Math.hypot(devil.position.x - L.x, devil.position.z - L.z) < 5) { w4.devilT = .5; puff(L.x + (Math.random() - .5) * 4, L.z + (Math.random() - .5) * 4, 3, 1.2, .8); } }
  /* lights come on as night falls */
  w4.night.forEach(s => { s.material.opacity = nightV * .75; }); for (const L of w4.lights) L.l.intensity = w4.lightsOn === false ? 0 : L.base + (L.night - L.base) * nightV;
  /* moving parts on v4 modules, pad status masts and construction */
  if (!rm && !paused) { w4.obsDomes.forEach(dm => { if (dm.parent.visible) dm.rotation.y += dt * .15; }); }
  for (const [pid, b] of Object.entries(w4.beacons)) {
    if (b.crs.visible) w4.deadM.emissiveIntensity = elapsed % 1 < .5 ? 5 : .4; if (b.dia.visible && !rm) b.dia.rotation.y += dt * 2;
    if (b.t > 0) { b.t -= dt; const k = clamp(1 - b.t / 3.2, 0, 1), g = padMods[pid].mods[state.modules[pid]]; if (g) g.scale.setScalar(Math.max(.05, 1 - Math.pow(1 - k, 3))); b.arm.rotation.y = Math.sin(elapsed * 1.6) * .9; if (Math.random() < dt * 5) puff(stationGroups[pid].position.x + (Math.random() - .5) * 2.5, stationGroups[pid].position.z + (Math.random() - .5) * 2.5, 1, .6, .5); if (b.t <= 0) { b.sc.visible = false; if (g) g.scale.setScalar(1); } }
  }
  /* rover dust: builds up while driving or in a dust storm, and a dust devil blows it off */
  if (ev === 'dust') w4.dustAmt = Math.min(1, w4.dustAmt + dt * .02); if (ev === 'devil') w4.dustAmt = Math.max(0, w4.dustAmt - dt * .2);
  w4.roverDust.opacity = w4.dustAmt * .55;
  if (w4.mast && !rm) w4.mast.rotation.y = drv ? clamp(-drv.v.steer * 1.4, -.8, .8) : Math.sin(elapsed * .3) * .5;
  if (w4.arm.t > 0) { w4.arm.t -= dt; const k = Math.sin(clamp(1 - w4.arm.t / 2.2, 0, 1) * Math.PI); w4.arm.a1.rotation.z = 1.2 - k * 1.5; w4.arm.a2.rotation.z = -2.3 + k * 1.6; }
  /* astronaut: contact shadow, smooth turning, a small idle sway and a raised hand while using a station */
  w4.shadow.visible = player.visible && !cine; w4.shadow.position.set(player.position.x, .03, player.position.z);
  if (!rm && player.visible && !cine) {
    if (w4.yaw == null) w4.yaw = player.rotation.y; let dy = player.rotation.y - w4.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); w4.yaw += dy * Math.min(1, dt * 11); player.rotation.y = w4.yaw;
    if (!moving) { const br = Math.sin(elapsed * 1.3) * .035, busy = $('panel').classList.contains('open') && selected; avatar.arms[0].rotation.x = br; avatar.arms[1].rotation.x = busy ? -1.05 + Math.sin(elapsed * 3) * .06 : -br; avatar.legs[0].rotation.x = 0; avatar.legs[1].rotation.x = 0; avatar.pose(); player.position.y = Math.abs(br) * .15; } else player.position.y = Math.abs(Math.sin(elapsed * 10)) * .035;
  }
  /* Pip: fans spin, faster when Pip is excited; a gentle float */
  const sp = pipMood === 'cheer' || pipMood === 'alert' ? 34 : 18; if (!rm) { w4.pipFans.forEach((f, i) => { f.rotation.y += dt * sp * (i ? -1 : 1); }); if (!pipAct && !cine) pip.position.y += Math.sin(elapsed * 2.1) * .0016; }
}

/* ---------- short v4 cinematics: an orbit round something that matters, with a caption. Always skippable. ---------- */
function c4Play(title, x, z, dist, caption) {
  if (RM() || cine || cine4) return false;
  let o = $('v4cine'); if (!o) { o = v4El('div', 'v4cine', '<div class="v4cine-cap" id="v4cineCap" role="status" aria-live="polite"></div><button class="cine-skip" id="v4cineSkip">Skip ▸ <kbd>Esc</kbd></button>'); o.id = 'v4cine'; document.body.appendChild(o); $('v4cineSkip').onclick = c4End; }
  cine4 = { t: 0, len: 5.2, x, z, dist, a0: camAngle }; $('v4cineCap').innerHTML = '<b>' + esc(title) + '</b><span>' + esc(caption) + '</span>'; o.style.display = 'block'; document.body.classList.add('v4cine'); keys.clear(); route = []; return true;
}
function c4End() { if (!cine4) return; cine4 = null; const o = $('v4cine'); if (o) o.style.display = 'none'; document.body.classList.remove('v4cine'); }
function c4Frame(dt) { const c = cine4; c.t += dt; const k = c.t / c.len, a = c.a0 + k * 2.2, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, r = c.dist * (1.25 - .25 * e); camera.position.set(c.x + Math.sin(a) * r, 2.2 + r * .42, c.z + Math.cos(a) * r); camera.lookAt(c.x, 1.4, c.z); if (c.t >= c.len) c4End(); }
