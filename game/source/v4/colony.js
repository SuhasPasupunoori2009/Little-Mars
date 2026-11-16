/* ===== v4/colony.js: the Colony tab in Mission control =====
   A dashboard of every supply (how it is made, used and stored), the state of each module, and a build planner that
   shows what a module would change before the player confirms it. Numbers come from M4.dashboard; actions go through
   conApply, the same path the other console tabs use. */
CON_TABS.push(['colony', 'Colony', 'C']);
let col4 = { pad: null, type: null };
const col4Status = (v, lo, crit) => v <= crit ? '<span class="st bad">✖ Critical</span>' : v <= lo ? '<span class="st warn">⚠ Low</span>' : '<span class="st ok">✓ Good</span>';

function colonyHTML4() {
  const d = M4.dashboard(state), row = k => d.rows.find(r => r.key === k), C = M.cap(state);
  const gauge = (r, max, status) => `<article class="dcard"><header><h4>${r.name}</h4>${status || ''}</header><p class="dval"><b>${r.value}</b> <span>${r.unit}</span></p>${max ? `<div class="lb-bar ${r.key === 'water' ? 'water' : ''}" role="img" aria-label="${r.value} of ${max}"><i style="width:${clamp(r.value / max * 100, 0, 100)}%"></i></div>` : ''}<dl>${r.made ? `<dt>Made</dt><dd>${r.made}</dd>` : ''}${r.used ? `<dt>Used</dt><dd>${r.used}</dd>` : ''}${r.stored ? `<dt>Stored</dt><dd>${r.stored}</dd>` : ''}</dl></article>`;
  const nights = (have, use) => use > 0 ? Math.floor(have / use) : 99, w = row('water');
  const last = Math.min(nights(state.air, d.nightAir), nights(state.food, d.nightFood), w ? nights(state.water, d.nightWater) : 99), left = state.days.length - state.sol + 1;
  let h = `<p class="con-lead">Everything the colony makes, uses and stores. ${state.sandbox ? 'Supplies are switched off in this mode, so nothing here can run out.' : `At tonight’s rates your scarcest supply lasts <b>${last >= 99 ? 'the whole mission' : last + ' more night' + (last === 1 ? '' : 's')}</b>; the mission has ${left} night${left === 1 ? '' : 's'} left.`}</p>`;
  h += `<div class="dash">${gauge(row('gen'), 0)}${gauge(row('use'), 0)}${gauge(row('store'), 0)}${gauge(row('air'), C, col4Status(state.air, d.nightAir * 2, d.nightAir))}${gauge(row('food'), C, col4Status(state.food, d.nightFood * 2, d.nightFood))}${w ? gauge(w, M.wcap(state), col4Status(state.water, d.nightWater * 2, d.nightWater)) : ''}${gauge(row('storage'), 0)}${gauge(row('research'), 0)}${gauge(row('sustain'), 100)}</div>`;
  /* modules */
  h += `<h3>Buildings</h3>`;
  if (!d.modules.length) h += `<p class="con-small">Nothing is built yet. Use the planner below, or walk to a pad.</p>`;
  else h += `<div class="sunwrap"><table class="suntable modtable"><caption>Every module, its level and its condition</caption><thead><tr><th scope="col">Pad</th><th scope="col">Module</th><th scope="col">Level</th><th scope="col">Condition</th><th scope="col">What it does</th><th scope="col">Actions</th></tr></thead><tbody>${d.modules.map(m => {
    const up = 'upgrade:' + m.pid, rp = 'repair:' + m.pid, uw = M.reason(state, up), a = M.desc(up, state);
    return `<tr><th scope="row">${m.place}</th><td><b>${m.name}</b></td><td>${m.level} of 3${m.level < 3 ? `<small>Next: ${M.UPTEXT[m.type]}</small>` : ''}</td><td>${m.cond == null ? 'No wear in this mission' : m.cond + '% ' + (m.broken ? '<span class="st bad">✖ Offline</span>' : m.cond < 50 ? '<span class="st warn">⚠ Worn</span>' : '<span class="st ok">✓ Good</span>')}</td><td>${M.MODULES[m.type].short}</td><td class="acts">${m.level < 3 ? `<button class="tbtn" data-dact="${up}" ${uw ? 'disabled title="' + esc(uw) + '"' : ''}>Upgrade · ${a.cost.power} power</button>` : ''}${m.cond != null && m.cond < 100 ? `<button class="tbtn" data-dact="${rp}" ${M.reason(state, rp) ? 'disabled' : ''}>Repair · 1 power</button>` : ''}<button class="tbtn ghost" data-walk4="${m.pid}">Walk there</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
  /* build planner */
  const pads = M.locations.filter(l => l.pad && !state.modules[l.id]), open = pads.filter(l => M.padOpen(state, l.id));
  h += `<h3>Build planner</h3>`;
  if (!pads.length) h += `<p class="con-small">All six pads are in use.</p>`;
  else {
    if (!col4.pad || !open.some(l => l.id === col4.pad)) col4.pad = open.length ? open[0].id : null;
    h += `<p class="con-small">Choose a pad and a module to see what it would change. Nothing is spent until you confirm.</p><div class="mchips" role="group" aria-label="Empty pads">${pads.map(l => { const ok = M.padOpen(state, l.id); return `<button class="mchip ${col4.pad === l.id ? 'sel' : ''}" data-cpad="${l.id}" aria-pressed="${col4.pad === l.id}" ${ok ? '' : 'disabled'}>${ICO(l.id)}<span>${l.name}${ok ? '' : ' · opens at ' + M.PADS[l.id].need + ' modules'}</span></button>`; }).join('')}</div>`;
    if (col4.pad) {
      h += `<p class="con-small"><b>${M.lname(col4.pad)}:</b> ${M.PADS[col4.pad].note}</p><div class="modgrid">${Object.entries(M.MODULES).map(([t, mo]) => { const lock = M.lockText(state, 'build:' + col4.pad + ':' + t); return `<button class="modpick ${col4.type === t ? 'sel' : ''} ${lock ? 'lock' : ''}" data-ctype="${t}" aria-pressed="${col4.type === t}"><b>${mo.name}</b><small>${lock ? 'Opens at Level ' + M.needLevel('build:pad0:' + t) : mo.short}</small></button>`; }).join('')}</div>`;
      if (col4.type) h += col4Preview(col4.pad, col4.type);
    }
  }
  const hist = state.hist || [];
  h += `<h3>Construction history</h3>${hist.length ? `<ol class="histlist">${hist.map(x => `<li><b>Sol ${x.sol}</b> ${esc(x.what)}</li>`).join('')}</ol>` : '<p class="con-small">Nothing built yet on this mission.</p>'}`;
  return h;
}
/* What would this module change? Build it on a copy of the state and compare the dashboards. */
function col4Preview(pid, t) {
  const id = 'build:' + pid + ':' + t, a = M.desc(id, state), why = M.reason(state, id), adv = M.advice(state, id), mo = M.MODULES[t];
  let diff = '';
  if (!why) {
    const c = structuredClone(state); M.apply(c, id); const A = M4.dashboard(state), B = M4.dashboard(c), ch = [];
    for (const r of B.rows) { const o = A.rows.find(x => x.key === r.key); if (o && o.value !== r.value && !['air', 'food', 'water'].includes(r.key)) ch.push(`${r.name}: ${o.value} → <b>${r.value}</b>`); }
    if (A.nightAir !== B.nightAir) ch.push(`Air used each night: ${A.nightAir} → <b>${B.nightAir}</b>`);
    if (M.desc('air', c).gain.air !== M.desc('air', state).gain.air) ch.push(`Air maker output: ${M.desc('air', state).gain.air} → <b>${M.desc('air', c).gain.air}</b>`);
    if (M.desc('harvest', c).gain.food !== M.desc('harvest', state).gain.food) ch.push(`Harvest: ${M.desc('harvest', state).gain.food} → <b>${M.desc('harvest', c).gain.food}</b> food`);
    if (M.ghxFood(c) !== M.ghxFood(state)) ch.push(`Food grown each night: ${M.ghxFood(state)} → <b>${M.ghxFood(c)}</b>`);
    if (state.water != null && M.wellOut(c) !== M.wellOut(state)) ch.push(`Water each morning: ${M.wellOut(state)} → <b>${M.wellOut(c)}</b>`);
    diff = ch.length ? `<ul class="difflist">${ch.map(x => `<li>${x}</li>`).join('')}</ul>` : `<p class="con-small">Its effect shows when you use it: ${mo.short.toLowerCase()}.</p>`;
  }
  return `<div class="card2 preview" id="colPreview"><strong>Preview: ${mo.name} at ${M.lname(pid)}</strong><p>${mo.text}</p><p><b>Cost:</b> ${costText(a)}. After building you would have ${state.power - a.cost.power} power, ${state.air - a.cost.air} air and ${state.minutes + a.cost.time}/100 minutes used.</p>${diff}<p class="con-small">Upgrades later: ${M.UPTEXT[t]} per level.</p>${adv ? `<div class="card2 warn"><strong>Pip:</strong> ${adv}</div>` : ''}${why ? `<div class="card2 warn">${why}</div>` : ''}<button class="tbtn big" id="colConfirm" ${why ? 'disabled' : ''}>Confirm: build the ${mo.name} here</button></div>`;
}
function colonyBind4() {
  document.querySelectorAll('[data-cpad]').forEach(b => b.onclick = () => { col4.pad = b.dataset.cpad; renderConsole(); const n = document.querySelector('[data-cpad="' + col4.pad + '"]'); if (n) n.focus(); });
  document.querySelectorAll('[data-ctype]').forEach(b => b.onclick = () => { col4.type = b.dataset.ctype; renderConsole(); const p = $('colPreview'); if (p) { p.scrollIntoView({ block: 'nearest' }); const c = $('colConfirm'); (c && !c.disabled ? c : document.querySelector('[data-ctype="' + col4.type + '"]')).focus(); } });
  if ($('colConfirm')) $('colConfirm').onclick = () => { const pid = col4.pad, t = col4.type; if (conApply('build:' + pid + ':' + t, buildMsg('build:' + pid + ':' + t))) { col4.type = null; } };
  document.querySelectorAll('[data-dact]').forEach(b => b.onclick = () => { const id = b.dataset.dact, t = state.modules[id.split(':')[1]]; conApply(id, id.startsWith('upgrade:') ? M.MODULES[t].name + ' upgraded: ' + M.UPTEXT[t] + '.' : M.MODULES[t].name + ' repaired. It is back to full condition.'); });
  document.querySelectorAll('[data-walk4]').forEach(b => b.onclick = () => { const id = b.dataset.walk4; closeConsole(); goTo(id); });
}
CON_HTML.colony = colonyHTML4; CON_BIND.colony = colonyBind4;
