/* ===== v4/missions.js: game modes, the title-screen menu, side missions and chapters, the Storm Watch Challenge,
   the Mission Creator and the score report =====
   A mode is only a way of starting a mission (M4.applyMode) plus, for some modes, a different test for winning (M.MODE_WIN).
   The Challenge is the one mode with no 3D mission: it is a short quiz on real archive days. */

/* ---------- title screen: a mode chooser and four more menu buttons ---------- */
{
  const start = $('start'), m = v4El('div', 'v4menu', `<button class="secondary v4modebtn" id="v4ModeBtn" aria-haspopup="dialog">Game mode: <b id="v4ModeName">Original Storm Watch</b> <span aria-hidden="true">▾</span></button>`);
  start.before(m);
  const more = v4El('div', 'v4menu2', `<div class="menu-row"><button class="secondary" id="v4JournalBtn">Exploration journal</button><button class="secondary" id="v4DbBtn">Science database</button></div><div class="menu-row"><button class="secondary" id="v4SaveBtn">Saved missions</button><button class="secondary" id="v4CreditsBtn">Credits</button></div>`);
  const rows = document.querySelectorAll('.welcome .menu-row'); rows[rows.length - 1].after(more);
  $('v4ModeBtn').onclick = v4ModeCard; $('v4JournalBtn').onclick = v4JournalCard; $('v4DbBtn').onclick = v4Database; $('v4CreditsBtn').onclick = v4Credits; $('v4SaveBtn').onclick = () => v4Saves();
  const h = document.querySelector('.welcome .wm'); if (h && !h.querySelector('.v4tag')) h.appendChild(v4El('span', 'v4tag', 'v4 · The Living Red Planet'));
}
function v4ModeLabel() { const md = M4.MODES[v4Mode]; $('v4ModeName').textContent = md.name + (v4Mode === 'custom' && v4Opts.custom ? ' (' + v4Opts.custom.length + ' objectives)' : v4Mode === 'explore' ? (v4Opts.supplies ? ' · supplies on' : ' · supplies off') : ''); $('start').textContent = v4Mode === 'challenge' ? 'Play the Storm Watch Challenge →' : v4Mode === 'lab' ? 'Open the Science Lab →' : 'Let’s land on Mars →'; }
function v4ModeCard() {
  const draw = () => {
    modalCard(`<h1>Game modes</h1><p>Every mode uses the same rules and the same Mars. The original mission is still here, unchanged.</p><div class="modelist" role="radiogroup" aria-label="Game mode">${Object.entries(M4.MODES).map(([k, md]) => `<button type="button" class="modecard ${v4Mode === k ? 'sel' : ''}" role="radio" aria-checked="${v4Mode === k}" data-mode="${k}"><span class="mtag">${md.tag}${md.sols && !md.ui && !md.sandbox && k !== 'explore' ? ' · ' + md.sols + ' sols' : ''}</span><b>${v4Mode === k ? '✓ ' : ''}${md.name}</b><small>${md.text}</small></button>`).join('')}</div>
${v4Mode === 'explore' ? `<label class="chk"><input type="checkbox" id="v4Sup" ${v4Opts.supplies ? 'checked' : ''}> <span><b>Use supplies in Free Exploration</b><small>On: air, food and water are used over 12 practice sols. Off: nothing runs out.</small></span></label>` : ''}
${v4Mode === 'custom' ? `<div class="card"><strong>${v4Opts.custom && v4Opts.custom.length ? 'Your mission has ' + v4Opts.custom.length + ' objective' + (v4Opts.custom.length > 1 ? 's' : '') : 'No objectives chosen yet'}</strong><p>Open the Mission Creator to choose up to three objectives.</p><button class="secondary" id="v4OpenCreator">Open the Mission Creator</button></div>` : ''}`, v4ModeLabel, 'Use this mode');
    document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { v4Mode = b.dataset.mode; if (v4Mode === 'custom' && !(v4Opts.custom && v4Opts.custom.length) && profile.custom.length) v4Opts.custom = profile.custom[profile.custom.length - 1].items; draw(); const n = document.querySelector('[data-mode="' + v4Mode + '"]'); if (n) n.focus(); });
    if ($('v4Sup')) $('v4Sup').onchange = e => { v4Opts.supplies = e.target.checked; };
    if ($('v4OpenCreator')) $('v4OpenCreator').onclick = v4Creator;
  };
  draw();
}
/* The Start button: the Challenge has no landing, and a custom mission needs at least one objective. */
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#start'); if (!b) return;
  if (v4Mode === 'challenge') { e.preventDefault(); e.stopImmediatePropagation(); v4Challenge(); return; }
  if (v4Mode === 'custom' && !(v4Opts.custom && v4Opts.custom.length)) { e.preventDefault(); e.stopImmediatePropagation(); v4Creator(); return; }
  if (v4Mode === 'lab' && !ageSel) setAge(profile.age || 10);
}, true);
function v4Database() {
  modalCard(`<h1>Science database</h1><p>What is real, what is simplified and where it comes from.</p>
<div class="card"><strong>Space weather: real NASA data</strong><p>Every Calm, Watch or Storm day comes from NASA’s DONKI records of solar flares, coronal mass ejections and particle events (${window.DONKI_DAILY ? window.DONKI_DAILY.range[0] + ' to ' + window.DONKI_DAILY.range[1] : 'archive not loaded'}). The NASA explorer in Mission control shows every day in the copy.</p></div>
<div class="card"><strong>Game levels: our simplification</strong><p>${SW.RULE} These levels are not NASA forecasts or safety warnings.</p></div>
<div class="card"><strong>Mars facts used in the game</strong><p>A sol is 24 hours 37 minutes. Air pressure is under 1% of Earth’s. Buried water ice, lava tubes, dry river channels, layered canyon walls and dust devils are all real features of Mars. A radio signal takes 3 to 22 minutes each way.</p></div>
<div class="card"><strong>Simulated, not measured</strong><p>The rover’s temperature, pressure, wind and visibility read-outs are game values in typical Mars ranges. Supplies, crop growth, shielding, module wear and work times are teaching models. The sites, the story and the mission alerts are made up.</p></div>
<div class="card"><strong>Experiments</strong><p>${Object.values(M.LABS).map(l => l.name).join(' · ')}. Each one states its question, its variables and the limits of its model.</p></div>
<p class="source-note">Read more (needs internet): <a href="https://ccmc.gsfc.nasa.gov/tools/DONKI/" target="_blank" rel="noopener">NASA DONKI ↗</a> · <a href="https://science.nasa.gov/mars/" target="_blank" rel="noopener">NASA Mars exploration ↗</a> · <a href="https://sdo.gsfc.nasa.gov/" target="_blank" rel="noopener">NASA Solar Dynamics Observatory ↗</a> · <a href="https://www.esa.int/Science_Exploration/Space_Science/Space_weather" target="_blank" rel="noopener">ESA space weather ↗</a>. The game never contacts these sites by itself.</p>`);
}
function v4Credits() {
  modalCard(`<h1>Credits</h1><div class="card"><strong>Little Mars v4: The Living Red Planet</strong><p>An independent educational game for ages 7 to 12. Not endorsed by NASA or ESA.</p></div>
<table class="data-table"><tr><td>Space-weather data</td><td>NASA CCMC DONKI (public data), bundled as a static archive</td></tr><tr><td>3D engine</td><td>Three.js 0.160.1, MIT licence (text included in the project)</td></tr><tr><td>Models and textures</td><td>Built in code for this game; no downloaded art</td></tr><tr><td>Sound and music</td><td>Made in the browser with Web Audio; no audio files</td></tr><tr><td>Voice</td><td>Your device’s own speech voice, if you switch read-aloud on</td></tr><tr><td>Privacy</td><td>No accounts, no tracking. Progress stays in this browser.</td></tr></table>`);
}

/* ---------- side missions and chapters in the Mission book ---------- */
function v4JournalHTML() {
  const g = state.gen || [], md = M4.MODES[state.mode] || M4.MODES.storm;
  let h = `<h3>${state.mode === 'story' ? 'Chapters' : state.mode === 'custom' ? 'Your objectives' : 'Side missions'} · ${md.name}</h3>`;
  if (state.mode === 'story') h += `<p class="source-note">Win with the four main goals and at least four chapters.</p>`;
  if (state.mode === 'builder') h += `<p class="source-note">Win with five modules standing and a sustainability score of 60 or more. Now: ${Object.keys(state.modules).length} modules, score ${M.score(state).total}.</p>`;
  if (state.mode === 'custom') h += `<p class="source-note">Win by finishing every objective before the last sol ends.</p>`;
  if (state.sandbox) h += `<p class="source-note">Free play has no way to lose. Discoveries: ${Object.keys(state.finds || {}).length} of ${Object.keys(M.FINDS).length}. Experiments: ${Object.keys(state.labs || {}).length} of ${Object.keys(M.LABS).length}.</p>`;
  h += g.length ? `<ul class="progress-list bonus">${g.map(m => { const dn = M4.missionDone(state, m); return `<li class="${dn ? 'done' : ''}"><span>${dn ? '✓' : '○'}</span><div><b>${esc(m.name)}</b> <em>${esc(m.cat)} · ${m.xp} XP</em><small>${esc(m.text)}${m.why ? ' ' + esc(m.why) : ''}</small></div></li>`; }).join('')}</ul>` : `<p class="source-note">No extra missions in this mode.</p>`;
  h += `<div class="menu-row"><button class="secondary" id="v4OpenJournal">Exploration journal (${profile.journal.length})</button><button class="secondary" id="v4OpenColony">Colony dashboard</button></div>`;
  return h;
}
function v4JournalBind() { if ($('v4OpenJournal')) $('v4OpenJournal').onclick = () => openConsole('journal'); if ($('v4OpenColony')) $('v4OpenColony').onclick = () => openConsole('colony'); }

/* ---------- the score report on the results card: every part comes with its reason ---------- */
function v4ReportHTML() {
  const r = M4.report(state), g = state.gen || [];
  return `<div class="card v4report"><strong>Mission score: ${r.total} / 100 · ${r.grade}</strong><table class="data-table">${r.parts.map(p => `<tr><td>${p.name}<br><b>${p.pts} / ${p.max}</b></td><td>${p.why}</td></tr>`).join('')}</table><p class="source-note">Lowest part: ${r.weak}. Careful planning scores higher than speed: outdoor work during a solar storm costs points.</p>${g.length ? `<p class="source-note"><b>${state.mode === 'story' ? 'Chapters' : 'Missions'}:</b> ${g.map(m => (M4.missionDone(state, m) ? '✓ ' : '○ ') + esc(m.name)).join(' · ')}</p>` : ''}</div>`;
}

/* ---------- Storm Watch Challenge ---------- */
function v4Challenge() {
  const D = window.DONKI_DAILY, rounds = M4.challengeSet(D, Math.floor(Math.random() * 99999), 8, SW.riskOf);
  if (!rounds.length) { modalCard(`<h1>Storm Watch Challenge</h1><div class="feedback miss">The NASA archive is not in this copy of the game, so there are no real days to show. The challenge never uses made-up data.</div>`); return; }
  let i = 0, score = 0, step = 0, first = null; const W = ['Calm', 'Watch', 'Storm'], SH = ['●', '◆', '▲'];
  Story.audio.enable(sound); 
  const show = () => {
    if (i >= rounds.length) return fin(); const r = rounds[i], d = r.day;
    const table = `<table class="data-table"><tr><td>Date</td><td>${SW.fmtDate(d.date)}</td></tr><tr><td>Strongest flare</td><td>${esc(d.flare || 'none recorded')}</td></tr><tr><td>Fastest CME</td><td>${d.cmeSpeed ? d.cmeSpeed + ' km/s' : 'none recorded'}</td></tr><tr><td>Particle event</td><td>${d.sep ? 'Yes' : 'none recorded'}</td></tr></table><p class="source-note">Real NASA DONKI observations from the bundled archive.</p>`;
    const q = step === 0 ? `<p><b>Which game level is this day?</b></p><div class="chal-o">${W.map((w, k) => `<button class="secondary qo" data-ans="${k}">${SH[k]} ${w}</button>`).join('')}</div>` : `<div class="feedback ${first === r.level ? '' : 'miss'}"><b>${first === r.level ? 'Correct.' : 'Not this time.'}</b> It is a ${SH[r.level]} ${W[r.level]} day because ${hxWhy(d)}.</div><p><b>What would a careful crew do today?</b></p><div class="chal-o">${M4.ACTIONS.map((a, k) => `<button class="secondary qo" data-ans="${k}">${a}</button>`).join('')}</div>`;
    modalCard(`<h1>Storm Watch Challenge</h1><p class="qcount">Day ${i + 1} of ${rounds.length} · Score ${score}</p>${table}${q}<details class="ladder"><summary>Remind me of the rule</summary><p class="source-note">${SW.RULE}</p></details>`, null, 'Stop the challenge');
    document.querySelectorAll('.qo').forEach(b => b.onclick = () => { const k = +b.dataset.ans;
      if (step === 0) { first = k; if (k === r.level) score++; beep(k === r.level); step = 1; show(); }
      else { const ok = k === r.action; if (ok) score++; beep(ok); step = 0; i++;
        modalCard(`<h1>${ok ? 'Good call.' : 'A safer choice exists.'}</h1><div class="feedback ${ok ? '' : 'miss'}">On a ${W[r.level]} day the careful choice is: <b>${M4.ACTIONS[r.action]}</b>. ${['Calm days are for outdoor work, because it costs the least Safety then.', 'On Watch days outdoor work costs four times more Safety, so crews keep trips short.', 'On Storm days outdoor work costs ten times more Safety. Shelter first.'][r.level]}</div>`, show, i >= rounds.length ? 'See my score →' : 'Next day →'); } });
    const f = document.querySelector('.qo'); if (f) f.focus();
  };
  const fin = () => {
    const max = rounds.length * 2, best = Math.max(profile.chBest || 0, score), firstTime = !profile.chDone; let xp = 0;
    if (score > (profile.chBest || 0)) { xp = (score - (profile.chBest || 0)) * 3; profile.xp += xp; } profile.chBest = best; profile.chDone = (profile.chDone || 0) + 1; saveProfile(); renderBand();
    M4.journalAdd(profile.journal, { t: 'report', id: 'challenge' + profile.chDone, name: 'Storm Watch Challenge: ' + score + ' / ' + max, text: 'Read ' + rounds.length + ' real NASA days: ' + rounds.map(r => r.day.date).join(', ') + '.', sol: 0, when: '' }); saveProfile();
    Story.audio.sfx(score >= max * .75 ? 'levelup' : 'ok');
    modalCard(`<h1>Challenge complete: ${score} / ${max}</h1><div class="feedback">${score === max ? 'Perfect. You read every day like a mission planner.' : score >= max * .75 ? 'Strong work. You can read the Sun’s moods.' : 'A good start. Open the NASA explorer in Mission control to practise on any day.'}</div><p>${xp ? '+' + xp + ' XP for a new best score. ' : ''}Best so far: ${best} / ${max}.${firstTime ? ' Saved to your journal.' : ''}</p><button class="secondary" id="chAgain">Play again with new days</button>`, null, 'Back to the title screen');
    $('chAgain').onclick = v4Challenge;
  };
  show();
}

/* ---------- Mission Creator ---------- */
function v4Creator() {
  const ps = M.initial(1, SW.storyWeek().days); ps.level = M.levelOf(profile.xp).level; ps.water = null;
  const TP = Object.entries(M4.TEMPLATES).map(([k, T]) => ({ k, label: T.label, cat: T.cat, args: T.args(ps) })).filter(t => t.args.length).concat(M4.DESIGNED.filter(d => M4.feasible(ps, d)).map(d => ({ k: d.id, label: d.name, cat: d.cat, args: [''] })));
  const argName = (k, a) => M.SITES[a] ? M.SITES[a].name : M.MODULES[a] ? M.MODULES[a].name : M.TECH_CATS[a] ? M.TECH_CATS[a] : '';
  let items = (v4Opts.custom || []).filter(i => TP.some(t => t.k === i.tpl)).slice(0, 3), name = '';
  const draw = (note) => {
    modalCard(`<h1>Mission Creator</h1><p>Build a five-sol mission from the game’s own objectives. You win by finishing all of them. Only things your commander level has unlocked are offered.</p>${note ? `<div class="feedback">${note}</div>` : ''}
<div class="card"><strong>Objectives (${items.length} of 3)</strong>${items.length ? `<ol class="crlist">${items.map((it, i) => { const m = M4.makeMission(ps, it.tpl, it.arg, i); return `<li><div><b>${m ? esc(m.name) : it.tpl}</b><small>${m ? esc(m.text) : ''}</small></div><button class="small-btn" data-crdel="${i}" aria-label="Remove objective ${i + 1}">Remove</button></li>`; }).join('')}</ol>` : '<p>None yet. Add one below.</p>'}</div>
${items.length < 3 ? `<div class="card"><strong>Add an objective</strong><label class="weekpick">Kind<select id="crTpl">${TP.map(t => `<option value="${t.k}">${t.cat}: ${t.label}</option>`).join('')}</select></label><label class="weekpick" id="crArgWrap">Which one<select id="crArg"></select></label><button class="secondary" id="crAdd">Add this objective</button></div>` : ''}
<label class="weekpick">Mission name<input id="crName" maxlength="30" placeholder="My mission" value="${esc(name)}" autocomplete="off"></label>
<button class="secondary" id="crSave" ${items.length ? '' : 'disabled'}>Save this mission</button>
${profile.custom.length ? `<h3>Saved missions</h3><ol class="crlist">${profile.custom.map((c, i) => `<li><div><b>${esc(c.name)}</b><small>${c.items.length} objective${c.items.length > 1 ? 's' : ''}</small></div><span><button class="small-btn" data-crload="${i}">Use</button> <button class="small-btn" data-crkill="${i}">Delete</button></span></li>`).join('')}</ol>` : ''}`, () => { v4Opts.custom = items.slice(); if (items.length) v4Mode = 'custom'; v4ModeLabel(); }, items.length ? 'Play this mission mode' : 'Back');
    const fill = () => { const t = TP.find(x => x.k === $('crTpl').value), a = $('crArg'); a.innerHTML = t.args.map(x => `<option value="${x}">${argName(t.k, x) || 'Standard'}</option>`).join(''); $('crArgWrap').hidden = t.args.length < 2; };
    if ($('crTpl')) { $('crTpl').onchange = fill; fill(); $('crAdd').onclick = () => { name = $('crName').value; const it = { tpl: $('crTpl').value, arg: $('crArg').value }; if (items.some(x => x.tpl === it.tpl && x.arg === it.arg)) return draw('That objective is already in the mission.'); items.push(it); draw(); }; }
    $('crName').oninput = e => { name = e.target.value; };
    document.querySelectorAll('[data-crdel]').forEach(b => b.onclick = () => { items.splice(+b.dataset.crdel, 1); draw(); });
    $('crSave').onclick = () => { profile.custom.push({ name: (name.trim() || 'My mission').slice(0, 30), items: items.slice() }); if (profile.custom.length > 12) profile.custom.shift(); saveProfile(); draw('Saved on this device.'); };
    document.querySelectorAll('[data-crload]').forEach(b => b.onclick = () => { const c = profile.custom[+b.dataset.crload]; items = c.items.filter(i => TP.some(t => t.k === i.tpl)).slice(0, 3); name = c.name; draw('Loaded “' + esc(c.name) + '”.'); });
    document.querySelectorAll('[data-crkill]').forEach(b => b.onclick = () => { const i = +b.dataset.crkill; if (b.dataset.sure) { profile.custom.splice(i, 1); saveProfile(); draw('Deleted.'); } else { b.dataset.sure = '1'; b.textContent = 'Really delete?'; } });
  };
  draw();
}
