/* ===== v4/look.js: the astronaut customizer on the start screen =====
   The choices live in profile.look as whitelisted ids (model4.js cleanLook). Colours and names come from M4.LOOK so the rules file
   stays the one list. The old red-and-gold classic look is the default, so old profiles look exactly as before. */
const LK = M4.LOOK.LISTS, LK_TABS = [['hat', 'Helmet'], ['suit', 'Suit'], ['trim', 'Trim'], ['visor', 'Visor'], ['pack', 'Backpack'], ['patch', 'Patch']];
const lkHex = (list, id) => (LK[list].find(e => e[0] === id) || LK[list][0])[2];
const lkName = (list, id) => (LK[list].find(e => e[0] === id) || LK[list][0])[1];
function lkHat(G, id, fur) {
  const F = SM({ color: fur, roughness: .8 }), P = SM({ color: '#f3a6b6', roughness: .8 }), K = SM({ color: '#2a2a30', roughness: .7 }), W = SM({ color: '#ffffff', roughness: .6 });
  const cone = (r, h, n = 6) => new THREE.ConeGeometry(r, h, n), two = f => { f(-1); f(1); };
  if (id === 'fox') { two(x => { add(G, cone(.1, .26, 4), F, x * .16, 2.17, -.03, 0, 0, -x * .35); add(G, cone(.05, .15, 4), P, x * .16, 2.15, .01, 0, 0, -x * .35); }); add(G, capG(.08, .3), F, 0, .95, -.5, 1.1, 0, 0); add(G, sphG(.07, 10), W, 0, .78, -.66); }
  else if (id === 'cat') { two(x => { add(G, cone(.09, .2, 3), F, x * .17, 2.16, -.02, 0, 0, -x * .3); add(G, cone(.045, .12, 3), P, x * .17, 2.15, .02, 0, 0, -x * .3); for (let i = 0; i < 2; i++) add(G, cylG(.006, .006, .22, 4), K, x * .27, 1.84 + i * .07, .13, 0, 0, Math.PI / 2 + x * (i - .5) * .5); }); add(G, capG(.045, .42), F, 0, 1.15, -.55, .5, 0, 0); }
  else if (id === 'bunny') { two(x => { add(G, capG(.07, .4), F, x * .12, 2.4, -.05, 0, 0, -x * .15); add(G, capG(.04, .34), P, x * .12, 2.4, -.01, 0, 0, -x * .15); }); add(G, sphG(.09, 10), W, 0, .95, -.5); }
  else if (id === 'bear' || id === 'panda') { const ear = id === 'panda' ? K : F; two(x => { add(G, sphG(.1, 12), ear, x * .2, 2.12, -.03); add(G, sphG(.055, 10), id === 'panda' ? K : P, x * .2, 2.12, .03); }); add(G, sphG(.08, 10), id === 'panda' ? W : F, 0, .95, -.5); }
  else if (id === 'frog') { two(x => { add(G, sphG(.11, 12), F, x * .15, 2.12, .05); add(G, sphG(.075, 10), W, x * .15, 2.17, .12); add(G, sphG(.035, 8), K, x * .15, 2.18, .18); }); }
  else if (id === 'dino') { const Y = SM({ color: '#e9b04a', roughness: .6 }); for (let i = 0; i < 5; i++) { const a = -.15 + i * .3; add(G, cone(.065 - i * .006, .15, 4), Y, 0, 1.9 + Math.cos(a) * .28, -.02 - Math.sin(a) * .28, -a); } add(G, cone(.12, .5, 6), F, 0, .95, -.55, -1.87, 0, 0); }
  else if (id === 'owl') { two(x => { add(G, cone(.07, .2, 4), F, x * .15, 2.16, 0, 0, 0, -x * .4); add(G, cone(.035, .1, 4), P, x * .15, 2.15, .03, 0, 0, -x * .4); }); }
  else if (id === 'unicorn') { add(G, cone(.06, .3, 8), SM({ color: '#f5d36a', roughness: .3, metalness: .6 }), 0, 2.3, .07, .25); two(x => add(G, cone(.06, .13, 4), F, x * .2, 2.12, -.04, 0, 0, -x * .5)); ['#ee7fb0', '#8a5bd0', '#4a8fd6'].forEach((c, i) => add(G, sphG(.075, 10), SM({ color: c, roughness: .8 }), 0, 2.08 - i * .13, -.24 - i * .04)); add(G, capG(.06, .3), SM({ color: '#8a5bd0', roughness: .8 }), 0, .98, -.5, .9, 0, 0); }
  else if (id === 'alien') { const g = glowM('#7fe6c8', 2.5); two(x => { add(G, cylG(.012, .012, .22, 5), K, x * .12, 2.25, 0, 0, 0, -x * .3); add(G, sphG(.05, 10), g, x * .17, 2.37, 0, 0, 0, 0, true); }); }
}
function lkPatch(G, id) {
  const M = c => SM({ color: c, roughness: .55 }), ext = (sh, c) => { const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .02, bevelEnabled: false }), M(c)); G.add(m); return m; };
  if (id === 'star') { const sh = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? .035 : .08; if (i) sh.lineTo(Math.cos(a) * r, Math.sin(a) * r); else sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); } ext(sh, '#f2c230'); }
  else if (id === 'heart') { const sh = new THREE.Shape(), x = 0, y = 0; sh.moveTo(x + .025, y + .025); sh.bezierCurveTo(x + .025, y + .025, x + .02, y, x, y); sh.bezierCurveTo(x - .03, y, x - .03, y + .035, x - .03, y + .035); sh.bezierCurveTo(x - .03, y + .055, x - .01, y + .077, x + .025, y + .095); sh.bezierCurveTo(x + .06, y + .077, x + .08, y + .055, x + .08, y + .035); sh.bezierCurveTo(x + .08, y + .035, x + .08, y, x + .05, y); sh.bezierCurveTo(x + .035, y, x + .025, y + .025, x + .025, y + .025); ext(sh, '#e5484d').geometry.translate(-.025, -.045, 0); }
  else if (id === 'rocket') { add(G, cylG(.03, .03, .09, 10), M('#f4f4f1'), 0, 0, .02); add(G, new THREE.ConeGeometry(.03, .06, 10), M('#e5484d'), 0, .075, .02); add(G, rbox(.03, .05, .015, .005), M('#e5484d'), -.04, -.03, .02); add(G, rbox(.03, .05, .015, .005), M('#e5484d'), .04, -.03, .02); add(G, sphG(.013, 8), glowM('#7fe6c8', 2), 0, .01, .05, 0, 0, 0, true); }
  else if (id === 'planet') { add(G, sphG(.05, 14), M('#f08a3c'), 0, 0, .03); add(G, torG(.075, .008), M('#8a5bd0'), 0, 0, .03, Math.PI / 2.4, .2, .4); }
}
function applyLook(av, l) {
  const m = av.mats;
  m.S.color.set(lkHex('suit', l.suit)); m.st.color.set(lkHex('trim', l.trim)); m.pk.color.set(lkHex('pack', l.pack)); m.vs.color.set(lkHex('visor', l.visor)); m.sh.color.set(lkHex('hat', l.hat));
  for (const gr of [av.hat, av.patch]) while (gr.children.length) { const c = gr.children[0]; gr.remove(c); if (c.geometry) c.geometry.dispose(); }
  lkHat(av.hat, l.hat, lkHex('hat', l.hat)); lkPatch(av.patch, l.patch);
}
profile.look = M4.cleanLook(profile.look); applyLook(avatar, profile.look);
{
  const panel = $('cust'), btn = $('custBtn'); let tab = 'hat', prevPitch = camPitchT;
  const draw = () => {
    $('custTabs').innerHTML = LK_TABS.map(([k, n]) => `<button type="button" role="tab" class="ctab" data-tab="${k}" aria-selected="${k === tab}">${n}</button>`).join('');
    $('custOpts').innerHTML = LK[tab].map(e => { const on = profile.look[tab] === e[0], sw = e[2] ? `<i class="csw" style="background:${e[2]}"></i>` : ''; return `<button type="button" role="radio" class="copt${on ? ' on' : ''}" aria-checked="${on}" data-id="${e[0]}" title="${e[1]}">${sw}<span>${e[1]}</span>${on ? '<b aria-hidden="true">✓</b>' : ''}</button>`; }).join('');
    $('custOpts').setAttribute('aria-label', LK_TABS.find(t => t[0] === tab)[1] + ' choices');
    $('custName').textContent = LK_TABS.map(([k, n]) => n + ': ' + lkName(k, profile.look[k])).join(' · ');
  };
  const apply = l => { profile.look = l; applyLook(avatar, l); saveProfile(); draw(); };
  $('custTabs').onclick = e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; draw(); $('custTabs').querySelector('[aria-selected="true"]').focus(); } };
  $('custOpts').onclick = e => { const b = e.target.closest('[data-id]'); if (b) { apply({ ...profile.look, [tab]: b.dataset.id }); $('custOpts').querySelector('.on').focus(); } };
  $('custSurprise').onclick = () => apply(M4.randomLook(Math.random));
  $('custReset').onclick = () => apply(M4.cleanLook(null));
  $('custL').onclick = () => { camTargetAngle -= .7; }; $('custR').onclick = () => { camTargetAngle += .7; };
  const open = () => { custOn = true; prevPitch = camPitchT; camPitchT = .3; camTargetAngle = player.rotation.y; document.body.classList.add('customizing'); panel.hidden = false; draw(); $('custTabs').querySelector('[aria-selected="true"]').focus(); };
  const close = () => { custOn = false; camPitchT = prevPitch; document.body.classList.remove('customizing'); panel.hidden = true; btn.focus(); };
  btn.onclick = open; $('custDone').onclick = close;
  panel.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); close(); } });
}
