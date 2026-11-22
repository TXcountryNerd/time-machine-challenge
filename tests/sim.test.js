// Sim tuning + determinism tests. Run: node tests/sim.test.js
// Drafts realistic rosters with a quick mock draft, sims 10,000 series, and reports
// how often the favorite (higher pre-series strength) wins at different rating gaps.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ERAS, POSITIONS, makeRng, simSeries, simGame, strength, defaultPlan, bestPlan, higherSeed, TUNING,
} from '../js/sim.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { cards } = JSON.parse(readFileSync(join(root, 'data', 'players.json'), 'utf8'));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
  if (!ok) failures++;
};

// ---------- Mock draft (mirrors the real rules) ----------
function mockDraft(rng, skill) {
  const taken = new Set();
  const teams = [0, 1].map(() => ({ open: ERAS.flatMap((e) => POSITIONS.map((p) => [e, p])), starters: {}, bench: [], players: new Set(), usedE: new Set(), usedP: new Set() }));
  const legalOpen = (t) => t.open.filter(([e, p]) => !t.usedE.has(e) && !t.usedP.has(p));
  const avail = (t, filter) => cards.filter((c) => !taken.has(c.id) && !t.players.has(c.playerId) && filter(c)).sort((a, b) => b.ovr - a.ovr);
  const take = (t, c) => { taken.add(c.id); t.players.add(c.playerId); };
  // Game rule: each pick offers 3 random legal players. skill[i] = 1 always takes the best
  // of the three; higher values sometimes take a worse one (fit, misclicks, kids' favorites).
  const choose = (list, skillLevel) => {
    const pool = [...list];
    for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
    const offer = pool.slice(0, 3).sort((a, b) => b.ovr - a.ovr);
    return rng() < 1 / skillLevel ? offer[0] : offer[Math.floor(rng() * offer.length)];
  };
  for (let r = 0; r < 5; r++) {
    for (let i = 0; i < 2; i++) {
      const t = teams[i];
      const slots = legalOpen(t);
      const [e, p] = slots[Math.floor(rng() * slots.length)];
      const list = avail(t, (c) => c.era === e && c.pos === p);
      const c = choose(list, skill[i]);
      t.starters[p] = c; t.usedE.add(e); t.usedP.add(p); take(t, c);
    }
  }
  for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) {
    const c = choose(avail(teams[i], () => true), skill[i]);
    teams[i].bench.push(c); take(teams[i], c);
  }
  return teams.map((t, i) => ({ name: `Team ${i + 1}`, starters: t.starters, bench: t.bench }));
}

// ---------- 1. Determinism ----------
{
  const rng = makeRng('det');
  const [A, B] = mockDraft(rng, [2, 2]);
  const plans = { A: defaultPlan(A), B: defaultPlan(B) };
  const s1 = JSON.stringify(simSeries(A, B, '90s', plans, 'abc123'));
  const s2 = JSON.stringify(simSeries(A, B, '90s', plans, 'abc123'));
  const s3 = JSON.stringify(simSeries(A, B, '90s', plans, 'abc124'));
  check('same seed => identical series', s1 === s2);
  check('different seed => different series', s1 !== s3);
}

// ---------- 2. Legal rosters ----------
{
  const rng = makeRng('legal');
  let ok = true;
  for (let i = 0; i < 500; i++) {
    for (const t of mockDraft(rng, [3, 3])) {
      const eras = new Set(POSITIONS.map((p) => t.starters[p].era));
      const ids = new Set([...POSITIONS.map((p) => t.starters[p].playerId), ...t.bench.map((c) => c.playerId)]);
      if (eras.size !== 5 || ids.size !== 7) ok = false;
    }
  }
  check('mock drafts: one era per position, no duplicate players', ok);
}

// ---------- 3. Win-rate tuning ----------
const N = 10000;
const buckets = [
  { name: 'near-even (gap < 1)', lo: 0, hi: 1, target: [0.48, 0.62], n: 0, fav: 0 },
  { name: 'small (1–2.5)', lo: 1, hi: 2.5, target: [0.58, 0.72], n: 0, fav: 0 },
  { name: 'medium (2.5–5)', lo: 2.5, hi: 5, target: [0.70, 0.84], n: 0, fav: 0 },
  { name: 'large (5–8)', lo: 5, hi: 8, target: [0.84, 0.94], n: 0, fav: 0 },
  { name: 'mismatch (8+)', lo: 8, hi: Infinity, target: [0.9, 1], n: 0, fav: 0 },
];
let favWins = 0, totalGap = 0, games = 0, ots = 0, sweeps = 0, sevens = 0;
const lengths = { 4: 0, 5: 0, 6: 0, 7: 0 };
const rng = makeRng('tuning');
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  const skill = [1 + Math.floor(rng() * 5), 1 + Math.floor(rng() * 5)];
  const [A, B] = mockDraft(rng, skill);
  const era = ERAS[Math.floor(rng() * 5)];
  const smart = rng() < 0.5;
  const pA = defaultPlan(A), pB = defaultPlan(B);
  const plans = smart ? { A: bestPlan(A, B, era, pB), B: bestPlan(B, A, era, pA) } : { A: pA, B: pB };
  const sA = strength(A, B, era, plans.A, plans.B).total;
  const sB = strength(B, A, era, plans.B, plans.A).total;
  const gap = Math.abs(sA - sB);
  const fav = sA >= sB ? 'A' : 'B';
  const res = simSeries(A, B, era, plans, `t${i}`);
  const won = res.winner === fav;
  favWins += won; totalGap += gap;
  const b = buckets.find((x) => gap >= x.lo && gap < x.hi);
  b.n++; b.fav += won;
  games += res.games.length;
  ots += res.games.filter((g) => g.ot).length;
  lengths[res.games.length]++;
}
const ms = Date.now() - t0;

console.log(`\n${N} series in ${(ms / 1000).toFixed(1)}s  (K=${TUNING.K}, SIGMA=${TUNING.SIGMA}, HOME=${TUNING.HOME})`);
console.log(`avg strength gap ${(totalGap / N).toFixed(2)}; favorite wins ${(100 * favWins / N).toFixed(1)}% overall`);
console.log('\ngap bucket            series   fav win%   target');
for (const b of buckets) {
  const pct = b.n ? b.fav / b.n : NaN;
  console.log(`${b.name.padEnd(22)}${String(b.n).padStart(6)}   ${(100 * pct).toFixed(1).padStart(6)}%   ${b.target.map((x) => Math.round(x * 100)).join('–')}%`);
}
console.log(`\nseries length: ${Object.entries(lengths).map(([k, v]) => `${k} games ${(100 * v / N).toFixed(0)}%`).join(', ')}`);
console.log(`OT rate ${(100 * ots / games).toFixed(1)}% of games\n`);

for (const b of buckets) {
  if (b.n < 100) continue;
  const pct = b.fav / b.n;
  check(`favorite win% ${b.name}`, pct >= b.target[0] && pct <= b.target[1], `${(100 * pct).toFixed(1)}%`);
}
check('overall favorite win% ~75% (70–80)', favWins / N >= 0.7 && favWins / N <= 0.8, `${(100 * favWins / N).toFixed(1)}%`);

// ---------- 4. Score sanity ----------
{
  const r = makeRng('scores');
  const [A, B] = mockDraft(r, [2, 2]);
  const plans = { A: defaultPlan(A), B: defaultPlan(B) };
  let ok = true;
  for (const era of ERAS) for (let i = 0; i < 200; i++) {
    const g = simGame(A, B, era, plans, `${era}${i}`, { home: 'A' });
    const sumA = g.box.A.reduce((s, p) => s + p.pts, 0);
    const qA = g.quarters.reduce((s, q) => s + q[0], 0);
    if (sumA !== g.score.A || qA !== g.score.A || g.score.A === g.score.B || g.score.A < 60 || g.score.A > 170) ok = false;
  }
  check('box scores and quarters add up, no ties, sane totals', ok);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
