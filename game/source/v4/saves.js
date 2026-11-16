/* ===== v4/saves.js: save slots, export and import, the new-game guard, and the v4 rows in Settings =====
   The autosave key and its shape are the same as in v2 and v3, so old saves load and a v4 autosave is still a plain
   {state, checkpoint, position} object. Slots hold v4 envelopes. Nothing here deletes or replaces a save without asking. */
const SLOT_KEY = 'little-mars-slots', AUTO_KEY = 'little-mars-3d-v4';
function v4Slots() { try { const s = JSON.parse(localStorage.getItem(SLOT_KEY) || '{}'), out = {}; for (const k of ['1', '2', '3']) if (s && s[k]) { const r = M4.migrateSave(s[k]); if (r.ok) out[k] = r.save; } return out; } catch (e) { return {}; } }
function v4PutSlots(s) { try { localStorage.setItem(SLOT_KEY, JSON.stringify(s)); return true; } catch (e) { return false; } }
/* The mission in progress: the live one once the game has started, otherwise the autosave found at load. */
function v4Current() { if (started && state && !state.done) return { state: structuredClone(state), checkpoint: checkpoint ? structuredClone(checkpoint) : null, position: { x: player.position.x, z: player.position.z } }; return saveData ? { state: saveData.state, checkpoint: saveData.checkpoint || null, position: saveData.position } : null; }
function v4SaveLine(sv) { const s = sv.state, md = M4.MODES[s.mode] || M4.MODES.storm; return `${md.name} · Sol ${s.sol} of ${s.days.length} · ${Object.keys(s.modules).length} modules · ${s.samples.length} samples${sv.savedAt ? ' · saved ' + esc(window.nyTime(sv.savedAt) || String(sv.savedAt).slice(0, 16).replace('T', ' ')) : ''}`; }

/* A save that cannot be read is set aside, never deleted and never loaded. */
{ let raw = null; try { raw = localStorage.getItem(AUTO_KEY); } catch (e) {}
  if (raw && !saveData) { const r = M4.migrateSave(raw); if (!r.ok) { try { localStorage.setItem(AUTO_KEY + '-damaged', raw); } catch (e) {} const n = $('ageNote'); if (n) n.insertAdjacentHTML('afterend', '<p class="agenote" role="status">A saved mission on this device could not be read. A copy was kept (Saved missions → Export) and nothing was lost by starting again.</p>'); } } }

function v4Saves(note) {
  const cur = v4Current(), slots = v4Slots();
  modalCard(`<h1>Saved missions</h1><p>The game saves by itself as you play. Slots keep extra copies, and an export file moves everything to another device.</p>${note ? `<div class="feedback" role="status">${note}</div>` : ''}
<div class="card"><strong>Mission in progress (autosave)</strong><p>${cur ? v4SaveLine(cur) : 'None.'}</p></div>
${['1', '2', '3'].map(k => { const sv = slots[k]; return `<div class="card slot"><strong>Slot ${k}${sv && sv.name ? ': ' + esc(sv.name) : ''}</strong><p>${sv ? v4SaveLine(sv) : 'Empty.'}</p><div class="menu-row"><button class="secondary" data-ssave="${k}" ${cur ? '' : 'disabled'}>${sv ? 'Replace with current' : 'Save current here'}</button><button class="secondary" data-sload="${k}" ${sv ? '' : 'disabled'}>Load</button><button class="secondary" data-sdel="${k}" ${sv ? '' : 'disabled'}>Delete</button></div></div>`; }).join('')}
<div class="card"><strong>Export and import</strong><p>An export is one file with your commander profile, journal, autosave and slots. It contains no name or account, only game data.</p><div class="menu-row"><button class="secondary" id="svExport">Export to a file</button><button class="secondary" id="svImport">Import a file</button></div><input type="file" id="svFile" accept="application/json,.json" hidden aria-label="Choose a Little Mars export file"><div id="svConfirm" aria-live="polite"></div></div>`);
  const ask = (msg, yes, fn) => { $('svConfirm').innerHTML = `<div class="feedback miss"><b>Please confirm.</b> ${msg}</div><div class="menu-row"><button class="secondary" id="svYes">${yes}</button><button class="secondary" id="svNo">Cancel</button></div>`; $('svYes').onclick = fn; $('svNo').onclick = () => { $('svConfirm').innerHTML = ''; }; $('svYes').focus(); $('svConfirm').scrollIntoView({ block: 'nearest' }); };
  const put = k => { const s = v4Slots(); s[k] = { format: M4.SAVE_FORMAT, app: 'little-mars', savedAt: new Date().toISOString(), name: '', ...v4Current() }; v4Saves(v4PutSlots(s) ? 'Saved to slot ' + k + '.' : 'This browser would not store the save.'); };
  document.querySelectorAll('[data-ssave]').forEach(b => b.onclick = () => { const k = b.dataset.ssave; if (slots[k]) ask('Slot ' + k + ' already holds a mission. Replacing it cannot be undone.', 'Replace slot ' + k, () => put(k)); else put(k); });
  document.querySelectorAll('[data-sdel]').forEach(b => b.onclick = () => { const k = b.dataset.sdel; ask('Delete the mission in slot ' + k + '? This cannot be undone.', 'Delete slot ' + k, () => { const s = v4Slots(); delete s[k]; v4PutSlots(s); v4Saves('Slot ' + k + ' deleted.'); }); });
  const load = k => { const sv = v4Slots()[k]; if (!sv) return; try { localStorage.setItem(AUTO_KEY, JSON.stringify({ state: sv.state, checkpoint: sv.checkpoint, position: sv.position })); } catch (e) { return v4Saves('This browser would not load the save.'); } started = false; location.reload(); };
  document.querySelectorAll('[data-sload]').forEach(b => b.onclick = () => { const k = b.dataset.sload; if (cur) ask('Loading slot ' + k + ' replaces the mission in progress. Save it to a slot first if you want to keep it.', 'Load slot ' + k + ' anyway', () => load(k)); else load(k); });
  $('svExport').onclick = () => { const txt = M4.exportBundle(profile, cur ? { ...cur, savedAt: new Date().toISOString() } : null, v4Slots(), new Date().toISOString()); try { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = 'little-mars-save.json'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); $('svConfirm').innerHTML = '<div class="feedback" role="status">Export file made: little-mars-save.json (' + Math.round(txt.length / 1024) + ' KB).</div>'; } catch (e) { $('svConfirm').innerHTML = '<div class="feedback miss">This browser could not make a file.</div>'; } };
  $('svImport').onclick = () => $('svFile').click();
  $('svFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (!f) return; if (f.size > 3e6) return v4Saves('That file is too large to be a Little Mars export.'); const rd = new FileReader(); rd.onerror = () => v4Saves('The file could not be read.'); rd.onload = () => v4Import(String(rd.result)); rd.readAsText(f); };
}
/* Import: check the file first, say what is in it, and only then (after a yes) put it in place. The current autosave is never replaced. */
function v4Import(text) {
  const r = M4.importBundle(text); if (!r.ok) return v4Saves('<b>Not imported.</b> ' + esc(r.reason));
  const n = Object.keys(r.slots).length + (r.active ? 1 : 0);
  modalCard(`<h1>Import this file?</h1><div class="card"><strong>What the file holds</strong><p>Commander: ${r.profile.xp} XP (Level ${M.levelOf(r.profile.xp).level}), ${r.profile.journal.length} journal entries, ${Object.keys(r.profile.badges).length} badges. Saved missions: ${n}.${r.skipped ? ' ' + r.skipped + ' damaged save' + (r.skipped > 1 ? 's were' : ' was') + ' skipped.' : ''}</p></div><div class="feedback miss"><b>This replaces the commander profile and journal on this device</b> (now ${profile.xp} XP, ${profile.journal.length} entries) and fills the save slots from the file. Your mission in progress is kept.</div><button class="secondary" id="imYes">Yes, import it</button>`, () => v4Saves(), 'Cancel');
  $('imYes').onclick = () => { const s = v4Slots(); for (const k of ['1', '2', '3']) if (r.slots[k]) s[k] = r.slots[k]; if (r.active) { const free = ['1', '2', '3'].find(k => !s[k]); if (free) s[free] = { ...r.active, name: 'Imported autosave' }; } v4PutSlots(s);
    const keepRun = profile.run; for (const k of Object.keys(profile)) delete profile[k]; Object.assign(profile, r.profile, { run: keepRun }); profile.custom = profile.custom || []; saveProfile(); renderBand(); if (state) state.level = M.levelOf(profile.xp).level; v4Saves('Imported. Profile, journal and slots now come from the file.'); };
}

/* Starting a new mission while an unfinished one is saved: ask first. */
let v4NewOK = false;
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('#start'); if (!b || v4NewOK || !saveData || !ageSel || v4Mode === 'challenge') return;
  if (v4Mode === 'custom' && !(v4Opts.custom && v4Opts.custom.length)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const go = () => { v4NewOK = true; if (modalClose) modalClose(); $('start').click(); }, slots = v4Slots(), free = ['1', '2', '3'].find(k => !slots[k]);
  modalCard(`<h1>You have a mission in progress</h1><div class="card"><strong>Saved mission</strong><p>${v4SaveLine(saveData)}</p></div><p>Starting a new mission replaces this autosave. What would you like to do?</p><button class="secondary" id="ngKeep" ${free ? '' : 'disabled'}>${free ? 'Keep it in slot ' + free + ', then start a new mission' : 'All three slots are full'}</button><button class="secondary" id="ngResume">Continue the saved mission instead</button><button class="secondary" id="ngDrop">Start new and let the old one go</button>`, null, 'Back');
  $('ngKeep').onclick = () => { const s = v4Slots(); s[free] = { format: M4.SAVE_FORMAT, app: 'little-mars', savedAt: new Date().toISOString(), name: 'Kept before a new mission', state: saveData.state, checkpoint: saveData.checkpoint || null, position: saveData.position }; if (v4PutSlots(s)) go(); };
  $('ngResume').onclick = () => { if (modalClose) modalClose(); $('resume').click(); };
  $('ngDrop').onclick = go;
}, true);

/* ---------- Settings: voice, performance, steering assist, saves ---------- */
function v4SettingsHTML() {
  const pr = v4PerfRead();
  return `<h3 class="sethead">Pip’s voice</h3><label class="setrow"><b>Speaking speed <output id="o_vr">${acc.vr}%</output></b><input type="range" id="a_vr" min="60" max="140" step="10" value="${acc.vr}" aria-label="Speaking speed"></label><label class="setrow"><b>Voice volume <output id="o_vv">${acc.vv ? acc.vv + '%' : 'muted'}</output></b><input type="range" id="a_vv" min="0" max="100" step="10" value="${acc.vv}" aria-label="Voice volume"></label><div class="menu-row"><button class="secondary" id="vTest">Hear a sample</button><button class="secondary" id="vStop">Stop speaking</button></div><p class="source-note">Pip’s words always appear on screen as well, so nothing depends on hearing them. Read-aloud uses your device’s own voice and needs no internet.</p>
<h3 class="sethead">Graphics performance</h3><div class="seg perfseg" role="radiogroup" aria-label="Graphics performance">${[['auto', 'Automatic'], ['high', 'High'], ['balanced', 'Balanced'], ['performance', 'Performance']].map(([k, n]) => `<button type="button" role="radio" aria-checked="${acc.perf === k}" class="${acc.perf === k ? 'on' : ''}" data-perf="${k}">${n}</button>`).join('')}</div><p class="source-note" id="perfNote">${acc.perf === 'auto' ? 'Automatic starts at High and steps down by itself if frames are slow.' : M4.PERF[acc.perf].note + ' Shadows ' + M4.PERF[acc.perf].shadow + ' px, scenery ' + Math.round(M4.PERF[acc.perf].detail * 100) + '%, particles ' + Math.round(M4.PERF[acc.perf].particles * 100) + '%.'}</p><p class="source-note" id="perfRead" role="status">${pr ? 'Measured on this device just now: about ' + pr.fps + ' frames a second (average ' + pr.avgMs + ' ms a frame, slowest ' + pr.worstMs + ' ms, over ' + Math.round(pr.frames) + ' frames).' : 'Frame rate: not enough frames measured yet.'}</p>
<h3 class="sethead">Rover and saves</h3><label class="chk"><input type="checkbox" id="accAvoid" ${acc.avoid ? 'checked' : ''}> <span><b>Steering assist</b><small>When driving the rover, steer gently round rocks straight ahead.</small></span></label><button class="secondary" id="setSaves">Saved missions, export and import</button>`;
}
function v4Settings() {
  for (const k of ['vr', 'vv']) { const e = $('a_' + k); if (e) e.oninput = ev => { acc[k] = +ev.target.value; $('o_' + k).textContent = k === 'vv' && !acc[k] ? 'muted' : acc[k] + '%'; applyAcc(); }; }
  if ($('vTest')) $('vTest').onclick = () => { const was = narration; narration = true; v4Speak('Hello commander. This is how I sound.'); narration = was; };
  if ($('vStop')) $('vStop').onclick = v4StopSpeak;
  document.querySelectorAll('[data-perf]').forEach(b => b.onclick = () => { acc.perf = b.dataset.perf; applyAcc(); v4ApplyPerf(); document.querySelectorAll('[data-perf]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); $('perfNote').textContent = acc.perf === 'auto' ? 'Automatic starts at High and steps down by itself if frames are slow.' : M4.PERF[acc.perf].note; $('perfRead').textContent = 'Measuring with the new setting…'; });
  if ($('accAvoid')) $('accAvoid').onchange = e => { acc.avoid = e.target.checked; applyAcc(); if ($('d4Avoid')) $('d4Avoid').checked = acc.avoid; };
  if ($('setSaves')) $('setSaves').onclick = () => v4Saves();
}

v4ApplyPerf(); v4ModeLabel();
/* Test and classroom-demo handle, only with #debug at the end of the address (same rule as v3). */
if (location.hash === '#debug') window.__lm4 = { M4, scene, w4, get drv() { return drv; }, drive: v4Drive, use: d4Use, perf: v4PerfRead, setMode: (m, o) => { v4Mode = m; if (o) Object.assign(v4Opts, o); v4ModeLabel(); }, get mode() { return v4Mode; }, keys: d4.keys, get profile() { return profile; }, slots: v4Slots, sync: () => { syncWorld(); updateHUD(); }, heightAt, cine: () => !!cine4, endCine: c4End, find: () => d4Find(), marks: d4.marks, tick: v4MissionTick, challenge: v4Challenge, creator: v4Creator, saves: v4Saves, importText: v4Import };
