// Time Machine Challenge — screens and game flow.
// MODE → COIN → DRAFT → TRADE → GRADE → ERA → PLAN → FINALS → RESULTS

import { loadPlayers } from './data.js';
import * as Sim from './sim.js';
import * as CPU from './cpu.js';
import { recapFor } from './recaps.js';

const { ERAS, POSITIONS, LABELS } = Sim;
const $app = document.getElementById('app');
let DB = null;
let S = null; // current game state (null = mode select)
let lastScreen = null;
const timers = { tick: null, veto: null };

const ERA_SHORT = { '80s': "'80s", '90s': "'90s", '00s': "'00s", '10s': "'10s", '20s': "'20s" };
const LEVEL_HINT = {
  easy: 'Takes the best OVR on the board. Random era, default game plan.',
  normal: 'Drafts for fit and picks the era that suits its roster. Adjusts after losses.',
  legend: 'Counter-drafts you, picks the era that hurts you most, and counters your plan every game.',
};
const LEVER_LABEL = { offense: 'Offense', defense: 'Defense', tempo: 'Tempo', rotation: 'Rotation', primary: 'Crunch-time option', stopper: 'Stopper' };
const LEVER_OPTS = { offense: Sim.OFFENSES, defense: Sim.DEFENSES, tempo: Sim.TEMPOS, rotation: Sim.ROTATIONS };

// ---------- Settings (per-device convenience) ----------
const SETTINGS_KEY = 'tmc.settings';
function loadSettings() { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) ?? {}; } catch { return {}; } }
function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* private mode */ } }
const settings = { mode: 'cpu', level: 'normal', timer: 30, nameA: '', nameB: '', ...loadSettings() };

// ---------- Rivalry record (localStorage, this device) ----------
const RIVAL_KEY = 'tmc.rivalry';
function loadRivalry() { try { return JSON.parse(localStorage.getItem(RIVAL_KEY)) ?? {}; } catch { return {}; } }
function saveRivalry(all) { try { localStorage.setItem(RIVAL_KEY, JSON.stringify(all)); } catch { /* private mode */ } }
const norm = (s) => s.trim().toLowerCase();
const rivalKey = (names) => [norm(names.A), norm(names.B)].sort().join('|');
const getRivalry = (names) => loadRivalry()[rivalKey(names)] ?? null;
function recordRivalry(names, winnerSide, result, era) {
  const all = loadRivalry();
  const k = rivalKey(names);
  const r = all[k] ?? { names: {}, wins: {}, finals: 0 };
  for (const s of ['A', 'B']) { r.names[norm(names[s])] = names[s]; r.wins[norm(names[s])] ??= 0; }
  r.wins[norm(names[winnerSide])]++;
  r.finals++;
  r.last = { winner: names[winnerSide], result, era, at: Date.now() };
  all[k] = r;
  saveRivalry(all);
  return r;
}
const rivalryText = (r, a, b) => `${a} ${r.wins[norm(a)] ?? 0} – ${b} ${r.wins[norm(b)] ?? 0}`;

// ---------- Challenge link (rosters + era + plans + seed in the URL hash) ----------
const b64e = (s) => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (ch) => ch.charCodeAt(0)));
function planCode(t, p) {
  const roster = allOf(t);
  return [Sim.OFFENSES.indexOf(p.offense), Sim.DEFENSES.indexOf(p.defense), Sim.TEMPOS.indexOf(p.tempo), Sim.ROTATIONS.indexOf(p.rotation),
    roster.findIndex((c) => c.id === p.primary), roster.findIndex((c) => c.id === p.stopper)].join('');
}
function planDecode(t, code) {
  const d = [...code].map(Number);
  const roster = allOf(t);
  const plan = { offense: Sim.OFFENSES[d[0]], defense: Sim.DEFENSES[d[1]], tempo: Sim.TEMPOS[d[2]], rotation: Sim.ROTATIONS[d[3]], primary: roster[d[4]]?.id, stopper: roster[d[5]]?.id };
  if (Object.values(plan).some((v) => !v)) throw new Error('bad plan');
  return plan;
}
function challengeURL() {
  const payload = {
    v: 1, n: [S.names.A, S.names.B], m: S.mode, l: S.level, e: S.era, s: S.seed, h: S.seedTeam,
    r: ['A', 'B'].map((s) => allOf(team(s)).map((c) => c.id)),
    g: S.games.map((g) => [planCode(team('A'), g.plans.A), planCode(team('B'), g.plans.B)]),
  };
  return `${location.origin}${location.pathname}#c=${b64e(JSON.stringify(payload))}`;
}
function parseChallenge(hash) {
  try {
    const p = JSON.parse(b64d(hash.replace(/^#c=/, '')));
    if (p.v !== 1 || !ERAS.includes(p.e) || !['A', 'B'].includes(p.h)) return null;
    const mk = (ids, name) => {
      const cs = ids.map((id) => DB.byId.get(id));
      if (cs.length !== 7 || cs.some((c) => !c)) throw new Error('unknown card');
      const t = { name, starters: Object.fromEntries(cs.slice(0, 5).map((c) => [c.pos, c])), bench: cs.slice(5) };
      if (POSITIONS.some((pos) => !t.starters[pos])) throw new Error('bad lineup');
      return t;
    };
    const teams = { A: mk(p.r[0], p.n[0]), B: mk(p.r[1], p.n[1]) };
    const gamePlans = p.g.map(([a, b]) => ({ A: planDecode(teams.A, a), B: planDecode(teams.B, b) }));
    if (!gamePlans.length) return null;
    return { names: { A: String(p.n[0]).slice(0, 14), B: String(p.n[1]).slice(0, 14) }, mode: p.m, level: p.l, era: p.e, seed: String(p.s), seedTeam: p.h, teams, gamePlans };
  } catch { return null; }
}
const clearHash = () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); };

// ---------- Arcade FX ----------
function stamp(text, kind = '') {
  const el = document.createElement('div');
  el.className = `stamp ${kind}`;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.createElement('canvas');
  cv.className = 'confetti';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');
  const W = (cv.width = innerWidth), H = (cv.height = innerHeight);
  const colors = ['#ee7a2b', '#2ef2ff', '#ff3ea5', '#ffe14d', '#7dff4a', '#b57bff'];
  const bits = Array.from({ length: 160 }, () => ({
    x: Math.random() * W, y: -20 - Math.random() * H * 0.5, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 3,
    s: 5 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const frame = (now) => {
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.vy += 0.04; b.r += b.vr;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
    }
    if (now - t0 < 3200) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}

// ---------- Helpers ----------
const other = (side) => (side === 'A' ? 'B' : 'A');
const isHuman = (side) => S.mode === 'pvp' || side === 'A';
const nm = (side) => S.names[side];
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const lastName = (n) => { const p = n.split(' '); return p.length > 1 && /^(Jr\.|Sr\.|II|III)$/.test(p.at(-1)) ? p.at(-2) : p.at(-1); };
const haptic = (ms = 18) => { try { if (navigator.userActivation?.hasBeenActive ?? true) navigator.vibrate?.(ms); } catch { /* unsupported */ } };
const rngFor = (...parts) => Sim.makeRng([S.seed, ...parts].join('|'));
const card = (id) => DB.byId.get(id);
function later(ms, fn) { const s = S; return setTimeout(() => { if (S === s) fn(); }, ms); }
function clearTimers() { clearInterval(timers.tick); clearInterval(timers.veto); timers.tick = timers.veto = null; }
const chip = (act, v, label, on, extra = '') => `<button class="chip ${on ? 'on' : ''}" data-act="${act}" data-v="${esc(v)}" ${extra}>${label}</button>`;
const team = (side) => S.teams[side];
const allOf = (t) => [...POSITIONS.map((p) => t.starters[p]), ...t.bench];

function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = msg;
  el.className = 'show';
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = ''), 2600);
}

// ---------- Card views ----------
const STAT_PILLS = [['three', '3PT'], ['def', 'DEF'], ['play', 'PLY'], ['inside', 'INS'], ['rebounding', 'REB'], ['clutch', 'CLU']];
const tier = (v) => (v >= 90 ? 't1' : v >= 80 ? 't2' : v >= 65 ? 't3' : 't4');
function cardHTML(c, { act = '', sel = false, disabled = false, compact = false, note = '' } = {}) {
  return `<button class="pcard pos-${c.pos} ${sel ? 'sel' : ''} ${compact ? 'compact' : ''}" ${act ? `data-act="${act}" data-id="${c.id}"` : ''} ${disabled ? 'disabled' : ''}>
    <span class="jersey"><span class="jnum">${c.ovr}</span><span class="jpos">${c.pos}</span></span>
    <span class="pinfo">
      <span class="pname">${esc(c.name)}</span>
      <span class="pmeta"><span class="era-badge era-${c.era}">${ERA_SHORT[c.era]}</span>${note ? `<span class="pnote">${note}</span>` : ''}</span>
      ${compact ? '' : `<span class="pstats">${STAT_PILLS.map(([k, l]) => `<span class="st ${tier(c[k])}"><b>${l}</b>${c[k]}</span>`).join('')}</span>`}
    </span></button>`;
}

function slotCell(label, c) {
  return `<div class="slot ${c ? `filled pos-${c.pos}` : ''}"><span class="slot-l">${label}</span>${c ? `<span class="slot-e era-${c.era}">${ERA_SHORT[c.era]}</span><span class="slot-n">${esc(lastName(c.name))}</span>` : '<span class="slot-n">—</span>'}</div>`;
}
function miniRoster(side, active = false) {
  const r = S.draft && !S.teams ? S.draft.rosters[side] : team(side);
  const D = S.draft;
  const badges = D && S.screen === 'draft'
    ? `<span class="badge ${D.reroll[side] ? 'used' : ''}" title="Re-roll">↻</span><span class="badge ${D.veto[side] ? 'used' : ''}" title="Veto">✋</span>`
    : '';
  return `<div class="mini ${active ? 'active' : ''}">
    <div class="mini-head"><span class="mini-name">${esc(nm(side))}</span>${S.eraControl === side ? '<span class="tag">ERA CONTROL</span>' : ''}${badges}</div>
    <div class="mini-row">${POSITIONS.map((p) => slotCell(p, r.starters[p])).join('')}${slotCell('6th', r.bench[0])}${slotCell('7th', r.bench[1])}</div>
  </div>`;
}
const planSummary = (t, p) => `${LABELS[p.offense]} · ${LABELS[p.defense]} · ${LABELS[p.tempo]} tempo · ${LABELS[p.rotation]} · Crunch: ${esc(lastName(card(p.primary)?.name ?? '?'))} · Stopper: ${esc(lastName(card(p.stopper)?.name ?? '?'))}`;

function topBar(title) {
  return `<div class="topbar"><span class="tb-title">${title}</span><button class="tb-quit" data-act="quit" aria-label="Quit game">✕</button></div>`;
}

// ---------- Render ----------
function render() {
  if (S?.handoff) { $app.innerHTML = viewHandoff(); return; }
  const screen = S ? S.screen : 'mode';
  $app.innerHTML = VIEWS[screen]();
  if (screen !== lastScreen) { window.scrollTo(0, 0); lastScreen = screen; $app.firstElementChild?.classList.add('enter'); }
  if (screen === 'draft') updateTimerBar();
}

function handoff(to, msg, then) {
  S.handoff = { to, msg, then };
  clearTimers();
  render();
}
function viewHandoff() {
  const h = S.handoff;
  return `<div class="handoff"><div class="ho-inner">
    <div class="ho-icon">📱</div>
    <h2>Pass to ${esc(nm(h.to))}</h2>
    <p>${esc(h.msg)}</p>
    <p class="hint">No peeking, ${esc(nm(other(h.to)))}.</p>
    <button class="btn primary big" data-act="handoffGo">I'm ${esc(nm(h.to))} — ready</button>
  </div></div>`;
}

// ---------- MODE ----------
function viewMode() {
  const s = settings;
  return `<div class="screen mode">
    <header class="hero"><div class="hero-ball">🏀</div><h1>Time Machine<br>Challenge</h1><p class="sub">Draft one star from every decade. Pick the era. Win the Finals.</p></header>
    <section class="panel">
      <h3>Opponent</h3>
      <div class="chips">${chip('setMode', 'cpu', 'vs CPU', s.mode === 'cpu')}${chip('setMode', 'pvp', 'vs Player', s.mode === 'pvp')}</div>
      ${s.mode === 'cpu'
        ? `<h3>CPU level</h3><div class="chips">${CPU.LEVELS.map((l) => chip('setLevel', l, CPU.LEVEL_LABEL[l], s.level === l)).join('')}</div><p class="hint">${LEVEL_HINT[s.level]}</p>`
        : '<p class="hint">Pass-and-play on one phone. Game plans stay hidden.</p>'}
      <h3>${s.mode === 'cpu' ? 'Your name' : 'Names'}</h3>
      <input id="nameA" class="input" maxlength="14" autocomplete="off" placeholder="${s.mode === 'cpu' ? 'You' : 'Player 1'}" value="${esc(s.nameA)}">
      ${s.mode === 'pvp' ? `<input id="nameB" class="input" maxlength="14" autocomplete="off" placeholder="Player 2" value="${esc(s.nameB)}">` : ''}
      <h3>Pick timer</h3>
      <div class="chips">${[30, 60, 0].map((t) => chip('setTimer', t, t ? `${t}s` : 'Off', s.timer === t)).join('')}</div>
    </section>
    ${rivalryBoard()}
    <p class="press-start">▶ PRESS TIP OFF ◀</p>
    <div class="dock"><button class="btn primary big" data-act="start">Tip off</button></div>
  </div>`;
}

function rivalryBoard() {
  const rows = Object.values(loadRivalry()).sort((a, b) => (b.last?.at ?? 0) - (a.last?.at ?? 0)).slice(0, 6);
  if (!rows.length) return '';
  return `<section class="panel rivalry">
    <h3>Rivalry board</h3>
    ${rows.map((r) => {
      const [a, b] = Object.values(r.names);
      const wa = r.wins[norm(a)] ?? 0, wb = r.wins[norm(b)] ?? 0;
      return `<div class="riv-row"><span class="riv-name ${wa > wb ? 'lead' : ''}">${esc(a)}</span><span class="riv-score">${wa}<i>–</i>${wb}</span><span class="riv-name ${wb > wa ? 'lead' : ''}">${esc(b)}</span></div>
        ${r.last ? `<p class="riv-last">Last: ${esc(r.last.winner)} won ${esc(r.last.result)} in the ${ERA_SHORT[r.last.era] ?? ''}</p>` : ''}`;
    }).join('')}
    <button class="btn small ghost" data-act="resetRivalry">Reset records</button>
  </section>`;
}

function newGame() {
  const names = settings.mode === 'cpu'
    ? { A: settings.nameA.trim() || 'You', B: `CPU ${CPU.LEVEL_LABEL[settings.level]}` }
    : { A: settings.nameA.trim() || 'Player 1', B: settings.nameB.trim() || 'Player 2' };
  return { screen: 'coin', mode: settings.mode, level: settings.level, timer: settings.timer, names, seed: Sim.newSeed(), coin: { stage: 'call' } };
}

// ---------- COIN ----------
function viewCoin() {
  const c = S.coin;
  let body = '';
  if (c.stage === 'call') {
    body = `<p class="lead">${esc(nm('A'))}, call it in the air.</p>
      <div class="coin"><span>?</span></div>
      <div class="row2"><button class="btn primary" data-act="call" data-v="heads">Heads</button><button class="btn primary" data-act="call" data-v="tails">Tails</button></div>`;
  } else if (c.stage === 'flipping') {
    body = `<p class="lead">${esc(nm('A'))} called ${c.call}…</p><div class="coin flipping"><span>🏀</span></div>`;
  } else {
    const w = c.winner;
    body = `<p class="lead">It's <b>${c.result}</b>. ${esc(nm(w))} won the flip!</p><div class="coin done"><span>${c.result === 'heads' ? 'H' : 'T'}</span></div>`;
    if (isHuman(w)) {
      body += `<p>${esc(nm(w))}, choose:</p>
        <button class="btn primary big" data-act="coinChoose" data-v="first">Take the first pick</button>
        <button class="btn big" data-act="coinChoose" data-v="defer">Defer — pick the Finals era</button>
        <p class="hint">Deferring gives ${esc(nm(other(w)))} the first pick, but you choose which decade the Finals are played in, after the draft.</p>`;
    } else {
      body += `<p class="lead">${esc(nm(w))} ${c.cpuChoice === 'first' ? 'takes the first pick.' : 'defers — it will choose the Finals era.'}</p>
        <div class="dock"><button class="btn primary big" data-act="coinChoose" data-v="${c.cpuChoice}">To the draft</button></div>`;
    }
  }
  return `<div class="screen">${topBar('Coin flip')}<div class="center">${body}</div></div>`;
}

// ---------- DRAFT ----------
const pickerAt = (i) => (i % 2 === 0 ? S.first : other(S.first));
const picker = () => pickerAt(S.draft.pick);
const isFree = () => S.draft.pick >= 10;
const ownsPlayer = (side, playerId) => {
  const r = S.draft.rosters[side];
  return [...Object.values(r.starters), ...r.bench].some((c) => c.playerId === playerId);
};
function legalCards(side, slot, { ignoreBlocked = false } = {}) {
  const D = S.draft;
  return DB.cards
    .filter((c) => !D.taken.has(c.id) && !ownsPlayer(side, c.playerId) && (ignoreBlocked || !D.blocked.has(c.playerId))
      && (!slot || (c.era === slot.era && c.pos === slot.pos)))
    .sort((a, b) => b.ovr - a.ovr || a.name.localeCompare(b.name));
}
function openCombos(side) {
  const r = S.draft.rosters[side];
  const usedE = new Set(Object.values(r.starters).map((c) => c.era));
  const out = [];
  for (const e of ERAS) for (const p of POSITIONS) {
    if (usedE.has(e) || r.starters[p]) continue;
    if (legalCards(side, { era: e, pos: p }).length) out.push({ era: e, pos: p });
  }
  return out;
}
function deal(side, exclude) {
  const D = S.draft;
  const all = openCombos(side);
  const pool = all.filter((c) => !exclude || c.era !== exclude.era || c.pos !== exclude.pos);
  const list = pool.length ? pool : all;
  const r = rngFor('deal', D.pick, D.deals++);
  return list[Math.floor(r() * list.length)];
}

function startDraft() {
  S.draft = {
    pick: 0, deals: 0, taken: new Set(), blocked: new Set(), selected: null, slot: null, pending: null, vetoedThisPick: false,
    rosters: { A: { starters: {}, bench: [] }, B: { starters: {}, bench: [] } },
    reroll: { A: false, B: false }, veto: { A: false, B: false }, filters: { era: null, pos: null }, deadline: 0,
  };
  S.teams = null;
  S.screen = 'draft';
  beginPick();
}

function beginPick() {
  const D = S.draft;
  clearTimers();
  D.blocked = new Set();
  D.selected = null;
  D.pending = null;
  D.vetoedThisPick = false;
  D.filters = { era: null, pos: null };
  if (D.pick >= 14) return finishDraft();
  D.slot = isFree() ? null : deal(picker());
  render();
  continuePick();
}
function continuePick() {
  const side = picker();
  if (isHuman(side)) startPickTimer();
  else later(900, cpuTurn);
}

function startPickTimer() {
  const D = S.draft;
  clearInterval(timers.tick);
  if (!S.timer) { D.deadline = 0; return; }
  D.deadline = Date.now() + S.timer * 1000;
  timers.tick = setInterval(() => {
    updateTimerBar();
    if (Date.now() >= D.deadline) {
      clearInterval(timers.tick);
      const side = picker();
      const opts = legalCards(side, D.slot);
      const c = (D.selected && card(D.selected)) || opts[0];
      toast(`Time! Auto-drafted ${c.name}`);
      makePick(side, c);
    }
  }, 250);
}
function updateTimerBar() {
  const D = S?.draft;
  const fill = document.getElementById('timer-fill');
  const txt = document.getElementById('timer-txt');
  if (!fill || !D?.deadline) return;
  const left = Math.max(0, D.deadline - Date.now());
  fill.style.width = `${(100 * left) / (S.timer * 1000)}%`;
  fill.classList.toggle('low', left < 8000);
  txt.textContent = `${Math.ceil(left / 1000)}s`;
}

function cpuCtx(side) {
  const D = S.draft;
  const opp = other(side);
  const oppRoster = D.rosters[opp];
  const oppEras = new Set(Object.values(oppRoster.starters).map((c) => c.era));
  return {
    roster: D.rosters[side], slot: D.slot, options: legalCards(side, D.slot), eraControl: S.eraControl === side,
    oppCanUse: (c) => !ownsPlayer(opp, c.playerId) && (isFree() ? oppRoster.bench.length < 2 : !oppEras.has(c.era) && !oppRoster.starters[c.pos]),
    oppOptions: (c) => legalCards(opp, isFree() ? null : { era: c.era, pos: c.pos }, { ignoreBlocked: true }),
  };
}
function cpuTurn() {
  const D = S.draft;
  const side = picker();
  if (D.slot && !D.reroll[side] && !D.vetoedThisPick) {
    const bestHere = legalCards(side, D.slot)[0];
    const bestOpen = openCombos(side).map((c) => legalCards(side, c)[0]).filter(Boolean);
    if (CPU.wantsReroll(S.level, bestHere, bestOpen)) {
      D.reroll[side] = true;
      D.slot = deal(side, D.slot);
      toast(`${nm(side)} used its re-roll`);
      stamp('RE-ROLL!');
      render();
      later(800, () => makePick(side, CPU.choosePick(S.level, cpuCtx(side))));
      return;
    }
  }
  makePick(side, CPU.choosePick(S.level, cpuCtx(side)));
}

function place(side, c) {
  const r = S.draft.rosters[side];
  if (isFree()) r.bench.push(c); else r.starters[c.pos] = c;
  S.draft.taken.add(c.id);
}
function unplace(side, c) {
  const r = S.draft.rosters[side];
  if (isFree()) r.bench = r.bench.filter((x) => x.id !== c.id); else delete r.starters[c.pos];
  S.draft.taken.delete(c.id);
}

function makePick(side, c) {
  const D = S.draft;
  clearTimers();
  const alternatives = legalCards(side, D.slot).filter((x) => x.playerId !== c.playerId);
  place(side, c);
  haptic();
  const opp = other(side);
  if (!D.veto[opp] && alternatives.length) {
    if (isHuman(opp)) {
      D.pending = { side, card: c, deadline: Date.now() + 6000 };
      render();
      timers.veto = setInterval(() => {
        const el = document.getElementById('veto-left');
        const left = Math.max(0, D.pending.deadline - Date.now());
        if (el) el.textContent = `${Math.ceil(left / 1000)}s`;
        if (left <= 0) { clearInterval(timers.veto); advancePick(); }
      }, 200);
      return;
    }
    if (CPU.wantsVeto(S.level, c, alternatives[0])) {
      toast(`${nm(opp)} VETOED ${c.name}!`);
      haptic(60);
      return doVeto(opp, side, c);
    }
  }
  if (!isHuman(side)) toast(`${nm(side)} drafts ${c.name}`);
  advancePick();
}
function doVeto(vetoer, side, c) {
  const D = S.draft;
  clearTimers();
  D.veto[vetoer] = true;
  stamp('VETOED!', 'bad');
  unplace(side, c);
  D.blocked.add(c.playerId);
  D.pending = null;
  D.vetoedThisPick = true;
  D.selected = null;
  render();
  continuePick();
}
function advancePick() {
  const D = S.draft;
  clearTimers();
  D.pending = null;
  D.pick++;
  beginPick();
}

function viewDraft() {
  const D = S.draft;
  const side = picker();
  const human = isHuman(side);
  const round = Math.floor(D.pick / 2) + 1;
  const free = isFree();
  let opts = legalCards(side, D.slot);
  if (free) {
    if (D.filters.era) opts = opts.filter((c) => c.era === D.filters.era);
    if (D.filters.pos) opts = opts.filter((c) => c.pos === D.filters.pos);
  }
  const slotTitle = free
    ? `<span class="deal-free">${D.pick < 12 ? '6th Man' : '7th Man'}</span><span class="deal-sub">Any era · any position</span>`
    : `<span class="deal-era era-${D.slot.era}">${ERA_SHORT[D.slot.era]}</span><span class="deal-pos">${D.slot.pos}</span>`;
  const canReroll = human && !free && !D.reroll[side] && !D.vetoedThisPick && !D.pending && openCombos(side).length > 1;
  const sel = D.selected && card(D.selected);
  const pend = D.pending;

  return `<div class="screen draft">
    ${topBar(`Draft · Pick ${D.pick + 1} of 14`)}
    <div class="sticky-rosters">${miniRoster('A', side === 'A')}${miniRoster('B', side === 'B')}</div>
    <div class="deal-banner">
      <div class="deal-who">${human ? (S.mode === 'cpu' ? "You're on the clock" : `${esc(nm(side))}, you're on the clock`) : `${esc(nm(side))} is on the clock…`}<span class="deal-round">Round ${round}</span></div>
      <div class="deal-slot">${slotTitle}</div>
      ${human && S.timer ? '<div class="timer"><div id="timer-fill" class="timer-fill"></div><span id="timer-txt" class="timer-txt"></span></div>' : ''}
      ${canReroll ? '<button class="btn small ghost" data-act="reroll">↻ Re-roll slot (1 per draft)</button>' : ''}
      ${D.vetoedThisPick ? '<p class="hint warn">Pick vetoed — choose again from the same slot.</p>' : ''}
    </div>
    ${free ? `<div class="filters">
      <div class="chips scroll">${chip('fEra', '', 'All eras', !D.filters.era)}${ERAS.map((e) => chip('fEra', e, ERA_SHORT[e], D.filters.era === e)).join('')}</div>
      <div class="chips scroll">${chip('fPos', '', 'All pos', !D.filters.pos)}${POSITIONS.map((p) => chip('fPos', p, p, D.filters.pos === p)).join('')}</div>
    </div>` : ''}
    <div class="cards">${opts.length ? opts.map((c) => cardHTML(c, { act: human && !pend ? 'select' : '', sel: c.id === D.selected, disabled: !human || !!pend })).join('') : '<p class="hint">No players match those filters.</p>'}</div>
    ${human && sel && !pend ? `<div class="dock"><button class="btn primary big" data-act="draftSel">Draft ${esc(sel.name)}</button></div>` : ''}
    ${pend ? `<div class="veto-sheet">
      <p><b>${esc(nm(other(pend.side)))}</b>: veto ${esc(nm(pend.side))}'s pick of <b>${esc(pend.card.name)}</b>? <span id="veto-left" class="veto-left">6s</span></p>
      <p class="hint">One veto per draft. They pick again from the same slot.</p>
      <div class="row2"><button class="btn danger" data-act="veto">✋ Veto</button><button class="btn" data-act="allow">Let it ride</button></div>
    </div>` : ''}
  </div>`;
}

function finishDraft() {
  clearTimers();
  const D = S.draft;
  S.teams = {
    A: { name: nm('A'), starters: { ...D.rosters.A.starters }, bench: [...D.rosters.A.bench] },
    B: { name: nm('B'), starters: { ...D.rosters.B.starters }, bench: [...D.rosters.B.bench] },
  };
  S.trade = { order: [S.first, other(S.first)], idx: 0, stage: null, give: null, get: null, offer: null, log: [] };
  S.screen = 'trade';
  stepTrade();
}

// ---------- TRADE ----------
function stepTrade() {
  const T = S.trade;
  T.give = T.get = T.offer = null;
  if (T.idx >= 2) { S.screen = 'grade'; render(); return; }
  const side = T.order[T.idx];
  const opp = other(side);
  if (isHuman(side)) {
    T.stage = 'build';
    render();
    return;
  }
  const offer = CPU.tradeOffer(S.level, team(side), team(opp));
  if (offer) { T.offer = { from: side, give: offer.give, get: offer.get }; T.stage = 'respond'; }
  else { T.stage = 'result'; T.msg = `${nm(side)} passes on making a trade offer.`; }
  render();
}

function viewTrade() {
  const T = S.trade;
  const side = T.order[T.idx];
  const opp = other(side);
  let body = '';
  if (T.stage === 'build') {
    const pairs = CPU.legalTrades(team(side), team(opp));
    const givable = new Set(pairs.map((p) => p.give.id));
    const partners = T.give ? pairs.filter((p) => p.give.id === T.give).map((p) => p.get) : [];
    body = `<p class="lead">${esc(nm(side))}: send <b>one</b> 1-for-1 offer to ${esc(nm(opp))}, or skip.</p>
      <p class="hint">Starters can only be swapped for a player from the same era and position, so both lineups stay legal. Bench players can be swapped for any bench player.</p>
      <h3>1. Pick a player to send</h3>
      <div class="cards">${allOf(team(side)).map((c) => cardHTML(c, { act: givable.has(c.id) ? 'tGive' : '', sel: c.id === T.give, disabled: !givable.has(c.id), compact: true, note: team(side).starters[c.pos]?.id === c.id ? 'Starter' : 'Bench' })).join('')}</div>
      ${T.give ? `<h3>2. Pick who you want back</h3><div class="cards">${partners.map((c) => cardHTML(c, { act: 'tGet', sel: c.id === T.get, compact: true })).join('') || '<p class="hint">No legal partner for that player.</p>'}</div>` : ''}
      <div class="dock row2"><button class="btn" data-act="tSkip">Skip trade</button><button class="btn primary" data-act="tSend" ${T.give && T.get ? '' : 'disabled'}>Send offer</button></div>`;
  } else if (T.stage === 'respond') {
    const o = T.offer;
    const to = other(o.from);
    body = `<p class="lead"><b>${esc(nm(o.from))}</b> offers a trade to <b>${esc(nm(to))}</b>:</p>
      <h3>${esc(nm(to))} gets</h3>${cardHTML(o.give)}
      <h3>${esc(nm(to))} sends</h3>${cardHTML(o.get)}
      <div class="dock row2"><button class="btn" data-act="tDecline">Decline</button><button class="btn primary" data-act="tAccept">Accept</button></div>`;
  } else {
    body = `<p class="lead">${esc(T.msg)}</p><div class="dock"><button class="btn primary big" data-act="tNext">Continue</button></div>`;
  }
  return `<div class="screen">${topBar('Trade window')}<div class="sticky-rosters">${miniRoster('A')}${miniRoster('B')}</div><div class="pad">${body}</div></div>`;
}

function applySwap(from, give, get) {
  const to = other(from);
  S.teams[from] = CPU.applyTrade(team(from), give, get);
  S.teams[to] = CPU.applyTrade(team(to), get, give);
}

// ---------- GRADE ----------
function viewGrade() {
  const g = { A: Sim.draftGrade(team('A')), B: Sim.draftGrade(team('B')) };
  const block = (side) => `<div class="grade-card">
    <div class="grade-head"><span class="grade-name">${esc(nm(side))}</span><span class="grade-letter g-${g[side].grade[0]}">${g[side].grade}</span></div>
    <p class="hint">Best era: <b>${ERA_SHORT[g[side].bestEra]}</b> · Worst: <b>${ERA_SHORT[g[side].worstEra]}</b> · ${esc(g[side].notes.join(', '))}</p>
    <div class="cards">${allOf(team(side)).map((c, i) => cardHTML(c, { compact: true, note: i < 5 ? 'Starter' : i === 5 ? '6th Man' : '7th Man' })).join('')}</div>
  </div>`;
  return `<div class="screen">${topBar('Draft grades')}<div class="pad">
    <p class="lead">The draft is in the books. Grades are era-neutral; the Finals era hasn't been picked yet.</p>
    ${block('A')}${block('B')}
    <div class="dock"><button class="btn primary big" data-act="toEra">${esc(nm(S.eraControl))} picks the era →</button></div>
  </div></div>`;
}

// ---------- ERA ----------
const eraValue = (t, E) => Sim.talent(t, E) + Sim.chemistry(t, E).value;
function viewEra() {
  const side = S.eraControl;
  const opp = other(side);
  if (!isHuman(side)) {
    if (!S.cpuEra) S.cpuEra = CPU.chooseEra(S.level, team(side), team(opp), rngFor('era'));
    const E = S.cpuEra;
    return `<div class="screen">${topBar('Era selection')}<div class="center">
      <p class="lead">${esc(nm(side))} sends the Finals back to the…</p>
      <div class="era-reveal era-${E}">${ERA_SHORT[E]}</div>
      <p>${esc(Sim.ERA_INFO[E].blurb)}</p>
      <div class="dock"><button class="btn primary big" data-act="pickEra" data-v="${E}">Set game plans</button></div></div></div>`;
  }
  const home = (t, E) => allOf(t).slice(0, 5).find((c) => c.era === E);
  return `<div class="screen">${topBar('Era selection')}<div class="pad">
    <p class="lead">${esc(nm(side))}, choose the decade the Finals are played in.</p>
    <p class="hint">Each team's player from that decade gets a home-era boost. Everyone else adapts: shooters thrive later, bigs without range struggle, small guards take a beating in the physical '90s.</p>
    ${ERAS.map((E) => {
      const edge = eraValue(team(side), E) - eraValue(team(opp), E);
      return `<button class="era-opt era-${E}" data-act="pickEra" data-v="${E}">
        <span class="era-big">${ERA_SHORT[E]}</span>
        <span class="era-txt"><span>${esc(Sim.ERA_INFO[E].blurb)}</span>
        <span class="hint">Home boost: ${esc(home(team(side), E)?.name ?? '—')} vs ${esc(home(team(opp), E)?.name ?? '—')}</span></span>
        <span class="era-edge ${edge >= 0 ? 'pos' : 'neg'}">${edge >= 0 ? '+' : ''}${edge.toFixed(1)}</span>
      </button>`;
    }).join('')}
    <p class="hint">Edge = your projected team strength minus theirs in that era, before game plans.</p>
  </div></div>`;
}

// ---------- PLAN ----------
function startPlans() {
  S.screen = 'plan';
  S.plans = { A: null, B: null };
  if (S.mode === 'cpu') {
    S.plans.B = CPU.choosePlan(S.level, team('B'), team('A'), S.era);
    S.planSide = 'A';
    S.planDraft = Sim.defaultPlan(team('A'));
    render();
  } else {
    S.planSide = 'A';
    S.planDraft = Sim.defaultPlan(team('A'));
    handoff('A', 'Set your secret game plan.', () => {});
  }
}
function viewPlan() {
  const side = S.planSide;
  const t = team(side);
  const p = S.planDraft;
  const group = (lever) => `<h3>${LEVER_LABEL[lever]}</h3><div class="chips">${LEVER_OPTS[lever].map((o) => chip('setLever', o, LABELS[o], p[lever] === o, `data-lever="${lever}"`)).join('')}</div>`;
  const people = (lever) => `<h3>${LEVER_LABEL[lever]}</h3><p class="hint">${lever === 'primary' ? 'Gets the ball in crunch time. Clutch rating matters.' : 'Your best defender, assigned to their go-to scorer.'}</p>
    <div class="chips">${allOf(t).map((c) => chip('setLever', c.id, `${esc(lastName(c.name))} <small>${lever === 'primary' ? `CLU ${c.clutch}` : `DEF ${c.def}`}</small>`, p[lever] === c.id, `data-lever="${lever}"`)).join('')}</div>`;
  return `<div class="screen">${topBar(`Game plan · ${esc(nm(side))}`)}<div class="pad">
    <p class="lead">Finals era: <span class="era-badge era-${S.era}">${ERA_SHORT[S.era]}</span> ${esc(Sim.ERA_INFO[S.era].blurb)}</p>
    <p class="hint">Your opponent can't see this. You can change one lever after each game.</p>
    ${group('offense')}${group('defense')}${group('tempo')}${group('rotation')}${people('primary')}${people('stopper')}
    <div class="dock"><button class="btn primary big" data-act="lockPlan">Lock in plan</button></div>
  </div></div>`;
}
function lockPlan() {
  const side = S.planSide;
  S.plans[side] = { ...S.planDraft };
  if (S.mode === 'pvp' && side === 'A') {
    S.planSide = 'B';
    S.planDraft = Sim.defaultPlan(team('B'));
    handoff('B', 'Set your secret game plan.', () => {});
    return;
  }
  startFinals();
}

// ---------- FINALS ----------
function startFinals() {
  S.screen = 'finals';
  S.games = [];
  S.usedRecaps = new Set();
  S.seedTeam = S.forceSeedTeam ?? Sim.higherSeed(team('A'), team('B'), S.era, S.plans, S.coinWinner);
  S.fin = { stage: 'pre' };
  S.recorded = false;
  if (S.mode === 'pvp' && !S.replay) handoff('A', `Game plans are locked. Gather round for Game 1 — ${nm(S.seedTeam)} has home court.`, () => {});
  else render();
}
function playNext() {
  const g = Sim.playGame(team('A'), team('B'), S.era, S.games, S.plans, S.seed, S.seedTeam);
  g.recap = recapFor(g, { names: S.names, era: S.era, teams: S.teams, prevPlans: S.games.at(-1)?.plans }, S.usedRecaps);
  S.games.push(g);
  return g;
}
function cpuAdjust() {
  if (S.mode !== 'cpu') return null;
  const last = S.games.at(-1);
  const r = CPU.adjustPlan(S.level, team('B'), team('A'), S.era, S.plans.B, S.plans.A, last.winner !== 'B');
  S.plans.B = r.plan;
  return r.changed;
}
function seriesPips(side, shown) {
  const w = shown?.seriesAfter[side] ?? 0;
  return `<span class="pips">${[0, 1, 2, 3].map((i) => `<i class="${i < w ? 'on' : ''}"></i>`).join('')}</span>`;
}
function scoreboardHTML(g, live) {
  const qs = g ? g.quarters : [[0, 0], [0, 0], [0, 0], [0, 0]];
  // While live, OT columns stay hidden until the game actually gets there (no spoilers).
  const hide = (i) => (live && i >= 4 ? ` class="otc${i}" style="display:none"` : '');
  const head = qs.map((_, i) => `<th${hide(i)}>${i < 4 ? i + 1 : `OT${qs.length > 5 ? i - 3 : ''}`}</th>`).join('');
  const row = (k, side) => qs.map((q, i) => `<td id="q${i}${side}"${hide(i)}>${live ? '' : q[k]}</td>`).join('');
  const n = g ? g.n : S.games.length + 1;
  const home = Sim.homeFor(n, S.seedTeam);
  return `<div class="scoreboard" data-act="skipAnim">
    <div class="sb-title">GAME ${n} · ${ERA_SHORT[S.era]} FINALS · <span id="sb-q">${live ? 'Q1' : g ? 'FINAL' : 'TIP-OFF'}</span></div>
    <div class="sb-row"><span class="sb-team">${esc(nm('A'))}${home === 'A' ? ' <small>HOME</small>' : ''}</span><span class="led" id="sbA">${g && !live ? g.score.A : 0}</span></div>
    <div class="sb-row"><span class="sb-team">${esc(nm('B'))}${home === 'B' ? ' <small>HOME</small>' : ''}</span><span class="led" id="sbB">${g && !live ? g.score.B : 0}</span></div>
    <table class="qtable"><tr><th></th>${head}</tr><tr><td>${esc(lastName(nm('A')))}</td>${row(0, 'A')}</tr><tr><td>${esc(lastName(nm('B')))}</td>${row(1, 'B')}</tr></table>
  </div>`;
}
function viewFinals() {
  const F = S.fin;
  const g = S.games.at(-1);
  const n = S.games.length + (F.stage === 'pre' ? 1 : 0);
  const shown = F.stage === 'playing' ? S.games.at(-2) : g; // don't spoil the game in progress
  const header = `<div class="series-head"><span>${esc(nm('A'))} ${seriesPips('A', shown)}</span><span class="vs">${shown ? `${shown.seriesAfter.A}–${shown.seriesAfter.B}` : '0–0'}</span><span>${seriesPips('B', shown)} ${esc(nm('B'))}</span></div>`;
  let body = '';
  if (F.stage === 'pre') {
    body = `${scoreboardHTML(null, false)}
      ${F.note ? `<p class="hint">${esc(F.note)}</p>` : ''}
      <div class="dock row2"><button class="btn" data-act="simEnd">Sim to end</button><button class="btn primary" data-act="playGame">Play Game ${n}</button></div>`;
  } else if (F.stage === 'playing') {
    body = `${scoreboardHTML(g, true)}<p class="hint center-t">Tap the scoreboard to skip</p>`;
  } else if (F.stage === 'post') {
    const over = Sim.seriesOver(S.games);
    const top = (side) => g.top[side];
    body = `${scoreboardHTML(g, false)}
      <div class="recap"><p class="recap-line">${esc(g.recap.line)}</p>${g.recap.line2 ? `<p class="recap-series">${esc(g.recap.line2)}</p>` : ''}
        ${g.recap.pbp.length ? `<div class="pbp-box"><span class="pbp-title">Quarter by quarter</span>${g.recap.pbp.map((l) => `<p class="pbp">${esc(l)}</p>`).join('')}</div>` : ''}</div>
      <div class="tops">
        <div><b>${esc(nm('A'))}</b>: ${esc(top('A').name)} ${top('A').pts} pts, ${top('A').reb} reb, ${top('A').ast} ast</div>
        <div><b>${esc(nm('B'))}</b>: ${esc(top('B').name)} ${top('B').pts} pts, ${top('B').reb} reb, ${top('B').ast} ast</div>
      </div>
      <details class="scout"><summary>Scouting report — plans used in Game ${g.n}</summary>
        <p><b>${esc(nm('A'))}</b>: ${planSummary(team('A'), g.plans.A)}</p><p><b>${esc(nm('B'))}</b>: ${planSummary(team('B'), g.plans.B)}</p></details>
      <div class="dock ${over ? '' : 'row2'}">${over
        ? '<button class="btn primary big" data-act="toResults">Series over — see results</button>'
        : `<button class="btn" data-act="simEnd">Sim to end</button>${S.replay
          ? `<button class="btn primary" data-act="replayNext">Game ${g.n + 1} ▶</button>`
          : `<button class="btn primary" data-act="toAdjust">Adjust & Game ${g.n + 1}</button>`}`}</div>`;
  } else if (F.stage === 'adjust') {
    body = viewAdjust();
  }
  return `<div class="screen">${topBar(`${S.replay ? 'Replay' : 'The Finals'} · ${ERA_SHORT[S.era]}`)}${header}<div class="pad">${body}</div></div>`;
}

function animateGame(g, onDone) {
  let qi = 0, skip = false, finished = false;
  const done = () => { if (finished) return; finished = true; onDone(); };
  const elA = () => document.getElementById('sbA');
  const elB = () => document.getElementById('sbB');
  const cum = (i) => g.quarters.slice(0, i + 1).reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]);
  S.fin.skip = () => { skip = true; done(); };
  const step = () => {
    if (S?.screen !== 'finals' || S.fin.stage !== 'playing') return;
    if (skip) { done(); return; }
    if (qi >= g.quarters.length) { done(); return; }
    const from = qi ? cum(qi - 1) : [0, 0];
    const to = cum(qi);
    const ql = document.getElementById('sb-q');
    if (ql) ql.textContent = qi < 4 ? `Q${qi + 1}` : 'OT';
    if (qi >= 4) { document.querySelectorAll(`.otc${qi}`).forEach((el) => (el.style.display = '')); haptic(30); if (qi === 4) stamp('OVERTIME!'); }
    const t0 = performance.now();
    const dur = qi === 3 ? 1300 : 800;
    const frame = (now) => {
      if (skip) { done(); return; }
      const k = Math.min(1, (now - t0) / dur);
      if (elA()) elA().textContent = Math.round(from[0] + (to[0] - from[0]) * k);
      if (elB()) elB().textContent = Math.round(from[1] + (to[1] - from[1]) * k);
      if (k < 1) requestAnimationFrame(frame);
      else {
        const qa = document.getElementById(`q${qi}A`), qb = document.getElementById(`q${qi}B`);
        if (qa) qa.textContent = g.quarters[qi][0];
        if (qb) qb.textContent = g.quarters[qi][1];
        qi++;
        setTimeout(step, 250);
      }
    };
    requestAnimationFrame(frame);
  };
  step();
}

// Adjustments: queue of human sides, each may change ONE lever
function startAdjust() {
  S.fin.stage = 'adjust';
  S.fin.queue = S.mode === 'pvp' ? ['A', 'B'] : ['A'];
  S.fin.cpuChanged = null;
  nextAdjust(true);
}
function nextAdjust(first) {
  const F = S.fin;
  if (!F.queue.length) {
    F.cpuChanged = cpuAdjust();
    F.stage = 'pre';
    F.note = S.mode === 'cpu' ? (F.cpuChanged ? `${nm('B')} made an adjustment.` : `${nm('B')} is sticking with its plan.`) : 'Both coaches have made their calls.';
    if (S.mode === 'pvp') handoff('A', `Ready for Game ${S.games.length + 1}.`, () => {});
    else render();
    return;
  }
  F.side = F.queue.shift();
  F.adjLever = null;
  F.adjValue = null;
  if (S.mode === 'pvp') handoff(F.side, 'Make your one adjustment (or keep your plan).', () => {});
  else if (first) render();
  else render();
}
function viewAdjust() {
  const F = S.fin;
  const side = F.side;
  const p = S.plans[side];
  const t = team(side);
  const levers = Sim.LEVERS;
  const optsFor = (lever) => (LEVER_OPTS[lever]
    ? LEVER_OPTS[lever].map((o) => chip('adjValue', o, LABELS[o], (F.adjValue ?? p[lever]) === o))
    : allOf(t).map((c) => chip('adjValue', c.id, esc(lastName(c.name)), (F.adjValue ?? p[lever]) === c.id))).join('');
  return `<p class="lead">${esc(nm(side))}: change <b>one</b> lever for Game ${S.games.length + 1}, or keep your plan.</p>
    <p class="hint">Current: ${planSummary(t, p)}</p>
    <h3>Lever</h3><div class="chips">${levers.map((l) => chip('adjLever', l, LEVER_LABEL[l], F.adjLever === l)).join('')}</div>
    ${F.adjLever ? `<h3>${LEVER_LABEL[F.adjLever]}</h3><div class="chips">${optsFor(F.adjLever)}</div>` : ''}
    <div class="dock row2"><button class="btn" data-act="adjKeep">Keep plan</button><button class="btn primary" data-act="adjSave" ${F.adjLever && F.adjValue && F.adjValue !== p[F.adjLever] ? '' : 'disabled'}>Make the change</button></div>`;
}

// Replays use the plans recorded in the challenge link, game by game.
function replayPlansFor(n) { return S.replayPlans[Math.min(n - 1, S.replayPlans.length - 1)]; }

function simToEnd() {
  clearTimers();
  if (S.fin.stage === 'post' && !S.replay) cpuAdjust();
  while (!Sim.seriesOver(S.games)) {
    if (S.replay) S.plans = replayPlansFor(S.games.length + 1);
    playNext();
    if (!Sim.seriesOver(S.games) && !S.replay) cpuAdjust();
  }
  finishSeries();
}

function finishSeries() {
  clearTimers();
  const last = S.games.at(-1);
  const w = last.seriesAfter.A === 4 ? 'A' : 'B';
  if (!S.replay && !S.recorded) {
    const res = `${Math.max(last.seriesAfter.A, last.seriesAfter.B)}–${Math.min(last.seriesAfter.A, last.seriesAfter.B)}`;
    S.rivalry = recordRivalry(S.names, w, res, S.era);
    S.recorded = true;
  }
  S.screen = 'results';
  haptic(60);
  render();
  stamp(S.mode === 'cpu' && !S.replay ? (w === 'A' ? 'CHAMPIONS!' : 'GAME OVER') : 'CHAMPIONS!', w === 'A' || S.mode !== 'cpu' ? 'good' : 'bad');
  if (S.mode !== 'cpu' || w === 'A' || S.replay) confetti();
}

// ---------- RESULTS ----------
function viewResults() {
  const r = Sim.summarizeSeries(team('A'), team('B'), S.era, S.games, S.seed, S.seedTeam);
  const w = r.winner;
  const grades = {
    A: Sim.gradePlan(team('A'), team('B'), S.era, S.games[0].plans.A, S.games[0].plans.B),
    B: Sim.gradePlan(team('B'), team('A'), S.era, S.games[0].plans.B, S.games[0].plans.A),
  };
  const adjCount = (side) => S.games.slice(1).filter((g, i) => Sim.LEVERS.some((l) => g.plans[side][l] !== S.games[i].plans[side][l])).length;
  const avgTable = (side) => `<table class="stats"><tr><th>Player</th><th>PTS</th><th>REB</th><th>AST</th></tr>${[...r.averages[side]].sort((a, b) => b.pts - a.pts).map((p) => `<tr><td>${esc(p.name)} <span class="era-badge era-${p.era}">${ERA_SHORT[p.era]}</span></td><td>${p.pts}</td><td>${p.reb}</td><td>${p.ast}</td></tr>`).join('')}</table>`;
  const gradeBlock = (side) => `<div class="grade-card"><div class="grade-head"><span class="grade-name">${esc(nm(side))} — coaching</span><span class="grade-letter g-${grades[side].overall}">${grades[side].overall}</span></div>
    <div class="lever-grades">${Sim.LEVERS.map((l) => `<span><small>${LEVER_LABEL[l]}</small><b class="g-${grades[side].grades[l]}">${grades[side].grades[l]}</b></span>`).join('')}</div>
    <p class="hint">Game 1 plan graded against roster, era and opponent. Adjustments made: ${adjCount(side)}.</p></div>`;
  const tp = S.games[r.turningPoint - 1];
  return `<div class="screen">${topBar('Finals results')}<div class="pad">
    <div class="champ"><div class="trophy">🏆</div><h2>${esc(nm(w))} won the ${ERA_SHORT[S.era]} Finals</h2><p class="lead">${r.result}</p>
      ${S.replay ? '<p class="hint">Replay of a shared challenge. Same rosters, plans and seed, same result.</p>' : ''}
      ${!S.replay && (S.rivalry ?? getRivalry(S.names)) ? `<div class="riv-banner"><span class="tag">ALL-TIME</span> ${esc(rivalryText(S.rivalry ?? getRivalry(S.names), nm('A'), nm('B')))}</div>` : ''}</div>
    <div class="mvp"><span class="tag">FINALS MVP</span><b>${esc(r.mvp.name)}</b> ${r.mvp.pts} pts · ${r.mvp.reb} reb · ${r.mvp.ast} ast</div>
    <p><b>Turning point:</b> Game ${tp.n} — ${esc(tp.recap.line)}</p>
    <h3>Game by game</h3>
    <div class="glog">${S.games.map((g) => `<div class="glog-row"><span class="gn">G${g.n}</span><span class="gs">${g.score.A}–${g.score.B}${g.ot ? ' OT' : ''}</span><span class="gr">${esc(g.recap.line)}${g.recap.line2 ? ` <em>${esc(g.recap.line2)}</em>` : ''}</span></div>`).join('')}</div>
    ${gradeBlock('A')}${gradeBlock('B')}
    <h3>${esc(nm('A'))} — series averages</h3>${avgTable('A')}
    <h3>${esc(nm('B'))} — series averages</h3>${avgTable('B')}
    <p class="hint">Seed <code>${esc(S.seed)}</code></p>
    <button class="btn ghost share" data-act="share">🔗 Share challenge link</button>
    <p class="hint">The link carries both rosters, the era, every game plan and the seed, so anyone can replay this exact Finals or try to out-coach it.</p>
    <div class="dock col">
      ${S.replay
        ? '<button class="btn primary big" data-act="runBack" data-v="cpu">Run it back — coach it yourself</button><div class="row2"><button class="btn" data-act="runBack" data-v="pvp">Run it back (2 players)</button><button class="btn" data-act="home">Main menu</button></div>'
        : '<button class="btn primary big" data-act="rematch">Rematch — same rosters, new seed</button><div class="row2"><button class="btn" data-act="swapSides">Swap sides (new draft)</button><button class="btn" data-act="home">Main menu</button></div>'}
    </div>
  </div></div>`;
}

// ---------- CHALLENGE (opened from a shared link) ----------
function viewChallenge() {
  const C = S.challenge;
  return `<div class="screen">${topBar('Challenge')}
    <div class="pad">
      <div class="challenge-head"><span class="tag">CHALLENGE LINK</span>
        <h2>${esc(C.names.A)} <span class="vs-x">vs</span> ${esc(C.names.B)}</h2>
        <p class="lead">The <span class="era-badge era-${C.era}">${ERA_SHORT[C.era]}</span> Finals · ${C.gamePlans.length} games played</p>
      </div>
    </div>
    <div class="sticky-rosters static">${miniRoster('A')}${miniRoster('B')}</div>
    <div class="pad">
      <p class="hint">Both rosters, the era, every game plan and the dice (seed ${esc(C.seed)}) are in this link. Watch it play out exactly as it happened, or take over and try to coach a better result with the same dice.</p>
      <div class="col">
        <button class="btn primary big" data-act="replayStart">▶ Watch the replay</button>
        <button class="btn big" data-act="runBack" data-v="cpu">Coach ${esc(C.names.A)} vs CPU Legend</button>
        <button class="btn" data-act="runBack" data-v="pvp">Coach it, 2 players</button>
        <button class="btn ghost" data-act="home">Main menu</button>
      </div>
    </div></div>`;
}

const VIEWS = { mode: viewMode, coin: viewCoin, draft: viewDraft, trade: viewTrade, grade: viewGrade, era: viewEra, plan: viewPlan, finals: viewFinals, results: viewResults, challenge: viewChallenge };

function challengeState(C) {
  return {
    screen: 'challenge', mode: C.mode === 'pvp' ? 'pvp' : 'cpu', level: CPU.LEVELS.includes(C.level) ? C.level : 'normal', timer: settings.timer,
    names: { ...C.names }, seed: C.seed, era: C.era, teams: { A: C.teams.A, B: C.teams.B }, eraControl: null, forceSeedTeam: C.seedTeam, challenge: C,
  };
}

// ---------- Actions ----------
const A = {
  setMode: (d) => { settings.mode = d.v; saveSettings(); render(); },
  setLevel: (d) => { settings.level = d.v; saveSettings(); render(); },
  setTimer: (d) => { settings.timer = Number(d.v); saveSettings(); render(); },
  start: () => { saveSettings(); S = newGame(); render(); },
  quit: () => { if (confirm('Quit this game?')) { clearTimers(); clearHash(); S = null; render(); } },
  home: () => { clearTimers(); clearHash(); S = null; render(); },
  handoffGo: () => { const h = S.handoff; S.handoff = null; render(); h.then?.(); },

  call: (d) => {
    const c = S.coin;
    c.call = d.v;
    c.result = rngFor('coin')() < 0.5 ? 'heads' : 'tails';
    c.winner = c.result === d.v ? 'A' : 'B';
    c.stage = 'flipping';
    render();
    later(1200, () => {
      c.stage = 'choose';
      if (!isHuman(c.winner)) c.cpuChoice = CPU.coinChoice(S.level, rngFor('coinchoice'));
      haptic();
      render();
    });
  },
  coinChoose: (d) => {
    const w = S.coin.winner;
    S.coinWinner = w;
    S.first = d.v === 'first' ? w : other(w);
    S.eraControl = other(S.first);
    startDraft();
  },

  select: (d) => { S.draft.selected = d.id; render(); },
  draftSel: () => { const D = S.draft; if (D.selected) makePick(picker(), card(D.selected)); },
  reroll: () => {
    const D = S.draft;
    const side = picker();
    D.reroll[side] = true;
    D.slot = deal(side, D.slot);
    D.selected = null;
    haptic();
    render();
    stamp('RE-ROLL!');
    startPickTimer();
  },
  fEra: (d) => { S.draft.filters.era = d.v || null; render(); },
  fPos: (d) => { S.draft.filters.pos = d.v || null; render(); },
  veto: () => { const p = S.draft.pending; if (p) { haptic(60); doVeto(other(p.side), p.side, p.card); } },
  allow: () => { if (S.draft.pending) advancePick(); },

  tGive: (d) => { S.trade.give = d.id; S.trade.get = null; render(); },
  tGet: (d) => { S.trade.get = d.id; render(); },
  tSkip: () => { S.trade.idx++; stepTrade(); },
  tSend: () => {
    const T = S.trade;
    const from = T.order[T.idx];
    const to = other(from);
    const give = card(T.give), get = card(T.get);
    if (isHuman(to)) {
      T.offer = { from, give, get };
      T.stage = 'respond';
      handoff(to, `${nm(from)} has a trade offer for you.`, () => {});
    } else {
      const ok = CPU.acceptsTrade(S.level, team(to), team(from), get, give);
      if (ok) { applySwap(from, give, get); stamp('DEAL!', 'good'); }
      T.stage = 'result';
      T.msg = ok ? `${nm(to)} accepts! ${give.name} for ${get.name}.` : `${nm(to)} declines your offer.`;
      render();
    }
  },
  tAccept: () => {
    const T = S.trade;
    const o = T.offer;
    applySwap(o.from, o.give, o.get);
    stamp('DEAL!', 'good');
    T.stage = 'result';
    T.msg = `Trade accepted: ${o.give.name} to ${nm(other(o.from))}, ${o.get.name} to ${nm(o.from)}.`;
    haptic();
    render();
  },
  tDecline: () => { const T = S.trade; T.stage = 'result'; T.msg = `${nm(other(T.offer.from))} declines.`; render(); },
  tNext: () => { S.trade.idx++; stepTrade(); },

  toEra: () => { S.screen = 'era'; S.cpuEra = null; render(); },
  pickEra: (d) => { S.era = d.v; haptic(); startPlans(); },

  setLever: (d) => { S.planDraft[d.lever] = d.v; render(); },
  lockPlan: () => { haptic(); lockPlan(); },

  playGame: () => {
    const g = playNext();
    S.fin.stage = 'playing';
    S.fin.note = null;
    render();
    animateGame(g, () => {
      S.fin.stage = 'post';
      haptic(40);
      render();
      document.querySelector('.scoreboard')?.classList.add('buzz');
      if (g.tags.includes('buzzer-beater')) stamp('BUZZER BEATER!');
      else if (g.tags.includes('blowout')) stamp('BLOWOUT!');
    });
  },
  skipAnim: () => { S.fin?.skip?.(); },
  simEnd: () => simToEnd(),
  toAdjust: () => startAdjust(),
  adjLever: (d) => { S.fin.adjLever = d.v; S.fin.adjValue = null; render(); },
  adjValue: (d) => { S.fin.adjValue = d.v; render(); },
  adjKeep: () => nextAdjust(false),
  adjSave: () => {
    const F = S.fin;
    S.plans[F.side] = { ...S.plans[F.side], [F.adjLever]: F.adjValue };
    haptic();
    nextAdjust(false);
  },
  toResults: () => finishSeries(),
  replayNext: () => { S.plans = replayPlansFor(S.games.length + 1); A.playGame(); },
  replayStart: () => {
    const C = S.challenge;
    S.replay = true;
    S.replayPlans = C.gamePlans;
    S.plans = { A: { ...C.gamePlans[0].A }, B: { ...C.gamePlans[0].B } };
    startFinals();
  },
  runBack: (d) => {
    const C = S.challenge;
    const next = challengeState(C);
    if (d.v === 'cpu') { next.mode = 'cpu'; next.level = 'legend'; next.names = { A: C.names.A, B: 'CPU Legend' }; }
    else next.mode = 'pvp';
    clearHash();
    S = next;
    startPlans();
  },
  share: async () => {
    const url = challengeURL();
    const text = `${nm('A')} vs ${nm('B')}, ${ERA_SHORT[S.era]} Finals. Can you coach it better?`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Time Machine Challenge', text, url }); return; }
    } catch (e) { if (e?.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Challenge link copied!'); } catch { window.prompt('Copy this challenge link:', url); }
  },
  resetRivalry: () => { if (confirm('Reset all rivalry records on this device?')) { saveRivalry({}); render(); } },

  rematch: () => {
    S.seed = Sim.newSeed();
    S.games = [];
    startPlans();
  },
  swapSides: () => {
    const keep = { mode: S.mode, level: S.level, timer: S.timer, names: S.names, seed: Sim.newSeed() };
    const first = other(S.first);
    S = { ...keep, screen: 'draft', coinWinner: first, first, eraControl: other(first) };
    startDraft();
  },
};

$app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled || !$app.contains(el)) return;
  const fn = A[el.dataset.act];
  if (fn) fn(el.dataset, el);
});
$app.addEventListener('input', (e) => {
  if (e.target.id === 'nameA') settings.nameA = e.target.value;
  if (e.target.id === 'nameB') settings.nameB = e.target.value;
});

// ---------- Boot ----------
(async function boot() {
  try {
    DB = await loadPlayers();
  } catch (e) {
    $app.innerHTML = `<div class="screen center"><h2>Couldn't load player data</h2><p>${esc(e.message)}</p><p class="hint">Opening index.html straight from a file won't work. Run <code>npx serve .</code> and open the URL it prints.</p></div>`;
    return;
  }
  if (location.hash.startsWith('#c=')) {
    const C = parseChallenge(location.hash);
    if (C) S = challengeState(C);
    else { clearHash(); render(); toast('That challenge link is broken or out of date.'); return; }
  }
  render();
})();
