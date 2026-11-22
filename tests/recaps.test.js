// Recap bank tests. Run: node tests/recaps.test.js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ERAS, POSITIONS, LEVERS, OFFENSES, DEFENSES, TEMPOS, ROTATIONS, makeRng, playGame, seriesOver, higherSeed, defaultPlan } from '../js/sim.js';
import { recapFor, recapValues, allTemplates, templateCount } from '../js/recaps.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { cards } = JSON.parse(readFileSync(join(root, 'data', 'players.json'), 'utf8'));

let failures = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); if (!ok) failures++; };

function randomTeams(rng) {
  const taken = new Set();
  return [0, 1].map((i) => {
    const t = { name: `T${i}`, starters: {}, bench: [] }, pl = new Set(), usedE = new Set();
    for (const p of POSITIONS) {
      const eras = ERAS.filter((e) => !usedE.has(e));
      const e = eras[Math.floor(rng() * eras.length)];
      const opts = cards.filter((c) => c.era === e && c.pos === p && !taken.has(c.id) && !pl.has(c.playerId));
      const c = opts[Math.floor(rng() * Math.min(5, opts.length))];
      t.starters[p] = c; usedE.add(e); taken.add(c.id); pl.add(c.playerId);
    }
    for (let k = 0; k < 2; k++) {
      const opts = cards.filter((c) => !taken.has(c.id) && !pl.has(c.playerId));
      const c = opts[Math.floor(rng() * opts.length)];
      t.bench.push(c); taken.add(c.id); pl.add(c.playerId);
    }
    return t;
  });
}
const OPTS = { offense: OFFENSES, defense: DEFENSES, tempo: TEMPOS, rotation: ROTATIONS };
function tweak(plan, rng) {
  const lever = ['offense', 'defense', 'tempo', 'rotation'][Math.floor(rng() * 4)];
  const o = OPTS[lever];
  return { ...plan, [lever]: o[Math.floor(rng() * o.length)] };
}

// 1. Size and coverage of the bank
const all = allTemplates();
check('100+ templates', templateCount() >= 100, `${templateCount()} templates`);
const REQUIRED = ['blowout', 'ot', 'buzzer-beater', 'comeback', 'defensive-grind', 'shootout', 'star-duel', 'bench-game', 'era-clash', 'adjustment-paid-off'];
for (const tag of REQUIRED) {
  const n = all.filter((t) => t.tag === tag).length;
  check(`tag "${tag}" has 8+ templates`, n >= 8, `${n}`);
}
check('template ids unique', new Set(all.map((t) => t.id)).size === all.length);

// 2. Simulate series with adjustments; check fills, no repeats, tag coverage, pbp
const rng = makeRng('recap-tests');
const tagCount = {};
let games = 0, repeats = 0, badFill = [], pbpBad = 0, pbpGames = 0;
const SERIES = 2000;
for (let s = 0; s < SERIES; s++) {
  const [A, B] = randomTeams(rng);
  const era = ERAS[s % 5];
  const names = s % 3 === 0 ? { A: 'You', B: 'CPU Legend' } : { A: 'Dad', B: 'Son' };
  let plans = { A: defaultPlan(A), B: defaultPlan(B) };
  const seedTeam = higherSeed(A, B, era, plans, 'A');
  const list = [], used = new Set(), ids = [];
  while (!seriesOver(list)) {
    if (list.length) {
      const last = list.at(-1);
      plans = { ...plans, [last.loser]: rng() < 0.6 ? tweak(plans[last.loser], rng) : plans[last.loser] };
    }
    const g = playGame(A, B, era, list, plans, `s${s}`, seedTeam);
    const ctx = { names, era, teams: { A, B }, prevPlans: list.at(-1)?.plans };
    const r = recapFor(g, ctx, used);
    ids.push(r.id);
    for (const t of g.tags) tagCount[t] = (tagCount[t] ?? 0) + 1;
    for (const line of [r.line, r.line2, ...r.pbp]) {
      if (/[{}]|undefined|NaN|null|\s{2,}/.test(line)) badFill.push(line);
    }
    if (g.ot || g.margin <= 6) { pbpGames++; if (r.pbp.length !== g.quarters.length) pbpBad++; }
    list.push(g);
    games++;
  }
  if (new Set(ids).size !== ids.length) repeats++;
}
check('no template repeats within a series', repeats === 0, `${repeats} series with repeats out of ${SERIES}`);
check('every filled recap is clean (no {}, undefined, NaN)', badFill.length === 0, badFill.slice(0, 3).join(' | '));
check('close games get one play-by-play line per quarter', pbpBad === 0, `${pbpGames} close games`);
for (const tag of REQUIRED) check(`sim produces "${tag}" games`, (tagCount[tag] ?? 0) > 0, `${tagCount[tag] ?? 0} of ${games}`);

// 3. Every template fills cleanly for a real game (forces rare templates too)
{
  const [A, B] = randomTeams(makeRng('fill-all'));
  const plans = { A: defaultPlan(A), B: defaultPlan(B) };
  const g = playGame(A, B, '90s', [], plans, 'fill', 'A');
  const vals = recapValues(g, { names: { A: 'You', B: 'Son' }, era: '90s', teams: { A, B }, prevPlans: { A: tweak(plans.A, makeRng('x')), B: plans.B } });
  const bad = all.filter((t) => /\{\w+\}/.test(t.text.replace(/\{(\w+)\}/g, (m, k) => (k in vals ? 'x' : m))));
  check('all placeholders are defined', bad.length === 0, bad.map((t) => t.id).join(', '));
}

// 4. Sample output
{
  const r2 = makeRng('sample');
  const [A, B] = randomTeams(r2);
  const plans = { A: defaultPlan(A), B: defaultPlan(B) };
  const used = new Set();
  const list = [];
  console.log('\nSample series (Dad vs Son, \'10s):');
  while (!seriesOver(list)) {
    const g = playGame(A, B, '10s', list, plans, 'sample', 'A');
    const r = recapFor(g, { names: { A: 'Dad', B: 'Son' }, era: '10s', teams: { A, B }, prevPlans: list.at(-1)?.plans }, used);
    console.log(`  G${g.n} ${g.score.A}-${g.score.B} [${g.tags.join(',')}] ${r.line}${r.line2 ? ' / ' + r.line2 : ''}`);
    for (const p of r.pbp) console.log(`      ${p}`);
    list.push(g);
  }
}

console.log('\nTag frequency:', Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${t} ${(100 * n / games).toFixed(1)}%`).join(', '));
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
