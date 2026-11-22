// Time Machine Challenge — Finals sim engine.
// Pure functions only: no DOM, no globals, no Math.random. Same inputs + seed => same output.
//
// Team shape:  { name, starters: { PG, SG, SF, PF, C } (cards), bench: [sixth, seventh] (cards) }
// Plan shape:  { offense, defense, tempo, rotation, primary: cardId, stopper: cardId }
//   primary = who gets crunch-time touches; stopper = your defender assigned to THEIR primary.

export const ERAS = ['80s', '90s', '00s', '10s', '20s'];
export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
export const OFFENSES = ['pace-space', 'motion', 'post-up', 'isolation', 'pick-roll'];
export const DEFENSES = ['man', 'switch', 'zone', 'pack-paint', 'press'];
export const TEMPOS = ['slow', 'balanced', 'fast'];
export const ROTATIONS = ['starters', 'balanced', 'deep'];
export const LEVERS = ['offense', 'defense', 'tempo', 'rotation', 'primary', 'stopper'];

export const LABELS = {
  'pace-space': 'Pace-and-space', motion: 'Motion', 'post-up': 'Post-up', isolation: 'Isolation', 'pick-roll': 'Pick-and-roll',
  man: 'Man', switch: 'Switch everything', zone: 'Zone', 'pack-paint': 'Pack the paint', press: 'Full-court press',
  slow: 'Slow', balanced: 'Balanced', fast: 'Fast', starters: 'Starters heavy', deep: 'Deep bench',
};

// ---------- Tuning knobs (see tests/sim.test.js) ----------
export const TUNING = {
  K: 1.1,         // margin points per point of strength gap
  SIGMA: 11.5,    // game-margin standard deviation
  HOME: 2.0,      // home-court margin points
  CLUTCH: 1.4,    // max crunch-time swing from primary option vs stopper
};

// ---------- RNG ----------
export function hashSeed(seed) {
  const s = String(seed);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}
export function mulberry32(a) {
  a >>>= 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function makeRng(seed) {
  const r = mulberry32(hashSeed(seed));
  r.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return r;
}
export function newSeed() {
  // Not pure — only for the UI to pick a fresh seed. Short, shareable base36 string.
  return Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0');
}

// ---------- Eras ----------
// w = how much each attribute matters in that era (relative to a 70 baseline).
export const ERA_INFO = {
  '80s': { ppg: 109, pace: 1.06, w: { three: -0.2, def: 0.1, play: 0.2, inside: 0.35, rebounding: 0.3 }, label: "'80s", blurb: 'Fast pace, physical, post play, minimal 3s' },
  '90s': { ppg: 100, pace: 0.94, w: { three: 0.05, def: 0.4, play: 0.1, inside: 0.25, rebounding: 0.2 }, label: "'90s", blurb: 'Slow pace, hand-checking, isolation, elite D rewarded' },
  '00s': { ppg: 97, pace: 0.96, w: { three: 0.15, def: 0.25, play: 0.15, inside: 0.25, rebounding: 0.15 }, label: "'00s", blurb: 'Post-to-perimeter, zone allowed, still physical' },
  '10s': { ppg: 104, pace: 1.0, w: { three: 0.35, def: 0.2, play: 0.2, inside: 0.1, rebounding: 0.05 }, label: "'10s", blurb: 'Pace-and-space, switching D, 3s rising' },
  '20s': { ppg: 114, pace: 1.04, w: { three: 0.5, def: 0.1, play: 0.2, inside: 0.05, rebounding: 0.0 }, label: "'20s", blurb: '3PT volume, spacing, positionless, offense-favored' },
};
const eraIdx = (e) => ERAS.indexOf(e);

/** Era adaptation modifier for one card playing in Finals era E (rating points, about -8..+4). */
export function eraAdapt(card, E) {
  if (card.era === E) return 2; // home-era boost
  const dist = Math.abs(eraIdx(card.era) - eraIdx(E));
  const wE = ERA_INFO[E].w, wH = ERA_INFO[card.era].w;
  let style = 0;
  for (const k of Object.keys(wE)) style += (wE[k] - wH[k]) * (card[k] - 70) / 10;
  style *= 0.6;
  // Small guards lose in physical eras
  let physical = 0;
  if ((E === '80s' || E === '90s' || E === '00s') && (card.pos === 'PG' || card.pos === 'SG')) {
    physical = -Math.max(0, 75 - (card.def + card.inside) / 2) / (E === '90s' ? 6 : 9);
  }
  return clamp(style + physical - 0.6 * dist, -8, 4);
}
export const effRating = (card, E) => card.ovr + eraAdapt(card, E);

// ---------- Roster helpers ----------
export const starters = (team) => POSITIONS.map((p) => team.starters[p]);
export const allPlayers = (team) => [...starters(team), ...team.bench];
const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
const max = (xs) => Math.max(...xs);
const min = (xs) => Math.min(...xs);
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
const findCard = (team, id) => allPlayers(team).find((c) => c.id === id);

const ROT_WEIGHTS = {
  starters: [0.17, 0.17, 0.17, 0.17, 0.17, 0.1, 0.05],
  balanced: [0.155, 0.155, 0.155, 0.155, 0.155, 0.14, 0.085],
  deep: [0.14, 0.14, 0.14, 0.14, 0.14, 0.17, 0.13],
};
export const minutesFor = (rotation) => ROT_WEIGHTS[rotation].map((w) => Math.round(w * 240));

export function defaultPlan(team) {
  const s = starters(team);
  return {
    offense: 'motion', defense: 'man', tempo: 'balanced', rotation: 'balanced',
    primary: [...s].sort((a, b) => b.usage - a.usage)[0].id,
    stopper: [...s].sort((a, b) => b.def - a.def)[0].id,
  };
}

// ---------- Strength components ----------
export function talent(team, E, rotation = 'balanced') {
  const w = ROT_WEIGHTS[rotation];
  return allPlayers(team).reduce((s, c, i) => s + w[i] * effRating(c, E), 0);
}

const SPACING_NEED = { '80s': 0, '90s': 1, '00s': 1, '10s': 2, '20s': 3 };
/** Chemistry: usage clash, playmaking, spacing, rebounding. Returns { value, notes[] }. */
export function chemistry(team, E) {
  const s = starters(team);
  const notes = [];
  let v = 0;
  const alphas = s.filter((c) => c.usage >= 94).length; // true ball-dominant stars
  if (alphas > 2) { v -= (alphas - 2) * 1.0; notes.push(`${alphas} ball-dominant stars, one basketball`); }
  if (max(s.map((c) => c.usage)) < 80) { v -= 1.5; notes.push('no go-to scorer'); }
  if (max(s.map((c) => c.play)) < 82) { v -= 1.5; notes.push('no true playmaker'); }
  const shooters = s.filter((c) => c.three >= 78).length;
  const short = Math.max(0, SPACING_NEED[E] - shooters);
  if (short) { v -= short * 0.8; notes.push('cramped spacing'); }
  if (max(s.map((c) => c.rebounding)) < 80) { v -= 1; notes.push('nobody owns the glass'); }
  if (!notes.length) { v += 1; notes.push('balanced fit'); }
  return { value: clamp(v, -5, 1.5), notes };
}

const OFF_ERA = {
  'pace-space': { '80s': -1.5, '90s': -1, '00s': -0.3, '10s': 0.6, '20s': 1.2 },
  'post-up': { '80s': 1, '90s': 0.8, '00s': 0.5, '10s': -0.4, '20s': -0.8 },
  isolation: { '80s': 0, '90s': 0.6, '00s': 0.4, '10s': 0, '20s': 0 },
  'pick-roll': { '80s': -0.3, '90s': 0, '00s': 0.2, '10s': 0.5, '20s': 0.5 },
  motion: { '80s': 0.3, '90s': 0, '00s': 0, '10s': 0.2, '20s': 0 },
};
const DEF_ERA = {
  switch: { '80s': -0.5, '90s': -0.5, '00s': 0, '10s': 0.5, '20s': 0.5 },
  zone: { '80s': -2, '90s': -2, '00s': 0.3, '10s': 0, '20s': 0 }, // illegal-defense eras
  man: { '80s': 0.2, '90s': 0.4, '00s': 0, '10s': 0, '20s': 0 },
  'pack-paint': { '80s': 0.3, '90s': 0.2, '00s': 0, '10s': -0.3, '20s': -0.6 },
  press: { '80s': 0.3, '90s': -0.3, '00s': -0.3, '10s': -0.2, '20s': -0.2 },
};
const TEMPO_ERA = {
  fast: { '80s': 0.8, '90s': -0.6, '00s': -0.2, '10s': 0.2, '20s': 0.4 },
  slow: { '80s': -0.6, '90s': 0.6, '00s': 0.3, '10s': -0.2, '20s': -0.4 },
  balanced: { '80s': 0, '90s': 0, '00s': 0, '10s': 0, '20s': 0 },
};

/** Fit of one lever choice to the roster + era, in rating points (roughly -3..+3). */
export function leverFit(team, E, lever, option) {
  const s = starters(team);
  const bigs = [team.starters.PF, team.starters.C];
  const guards = [team.starters.PG, team.starters.SG];
  switch (lever) {
    case 'offense':
      switch (option) {
        case 'pace-space': return (avg(s.map((c) => c.three)) - 68) / 8 + OFF_ERA[option][E];
        case 'motion': return (avg(s.map((c) => c.play)) - 72) / 8 + (86 - max(s.map((c) => c.usage))) / 20 + OFF_ERA[option][E];
        case 'post-up': return (max(bigs.map((c) => c.inside)) - 82) / 6 + OFF_ERA[option][E];
        case 'isolation': return (max(s.map((c) => (c.usage + c.inside) / 2)) - 86) / 5 + OFF_ERA[option][E];
        case 'pick-roll': return ((team.starters.PG.play + max(bigs.map((c) => c.inside))) / 2 - 82) / 6 + OFF_ERA[option][E];
      }
      break;
    case 'defense':
      switch (option) {
        case 'man': return (avg(s.map((c) => c.def)) - 76) / 8 + DEF_ERA[option][E];
        case 'switch': return (min(s.map((c) => c.def)) - 66) / 8 + DEF_ERA[option][E];
        case 'zone': return (team.starters.C.def - 84) / 8 - (avg(s.map((c) => c.def)) - 76) / 16 + DEF_ERA[option][E];
        case 'pack-paint': return (max(bigs.map((c) => (c.def + c.rebounding) / 2)) - 86) / 7 + DEF_ERA[option][E];
        case 'press': return (avg(guards.map((c) => (c.def + c.durability) / 2)) - 80) / 7 - 0.4 + DEF_ERA[option][E];
      }
      break;
    case 'tempo': {
      const dur = avg(s.map((c) => c.durability));
      if (option === 'fast') return (dur - 80) / 10 + TEMPO_ERA.fast[E];
      if (option === 'slow') return (avg(s.map((c) => c.def)) - 76) / 16 + TEMPO_ERA.slow[E];
      return 0.2;
    }
    case 'rotation': {
      const st = avg(s.map((c) => effRating(c, E)));
      const bn = avg(team.bench.map((c) => effRating(c, E)));
      const fatigue = s.reduce((t, c) => t + Math.max(0, 82 - c.durability), 0) / 25;
      if (option === 'starters') return 0.4 - fatigue;
      if (option === 'deep') return (bn - st) / 4 + 0.6;
      return 0.2 - fatigue / 3;
    }
  }
  return 0;
}

// Offense-vs-defense counters (margin points for the OFFENSE). Some scale with roster.
function counter(off, def, offTeam, defTeam) {
  const s = starters(offTeam);
  const avg3 = avg(s.map((c) => c.three));
  const pgPlay = offTeam.starters.PG.play;
  const topIso = max(s.map((c) => (c.usage + c.inside) / 2));
  const perim = avg([defTeam.starters.PG, defTeam.starters.SG, defTeam.starters.SF].map((c) => c.def));
  switch (`${off}|${def}`) {
    case 'pace-space|zone': return avg3 >= 78 ? 2.2 : 0.5;            // zone vs elite shooting = bad
    case 'pace-space|pack-paint': return avg3 >= 75 ? 1.8 : 0.4;
    case 'pace-space|switch': return -0.6;
    case 'post-up|pack-paint': return -2;
    case 'post-up|zone': return -1;
    case 'post-up|switch': return 1.4;                                // bigs punish small switches
    case 'pick-roll|switch': return -1.5;
    case 'pick-roll|pack-paint': return 0.6;
    case 'pick-roll|press': return (pgPlay - 85) / 6;
    case 'isolation|switch': return topIso >= 88 ? 1 : 0;
    case 'isolation|man': return -(perim - 80) / 10;
    case 'isolation|pack-paint': return -0.8;
    case 'motion|man': return 0.8;
    case 'motion|press': return 1.2;
    case 'motion|zone': return 0.5;
    case 'motion|switch': return 0.4;
  }
  return 0;
}

/** Full team strength in era E vs opponent. Returns breakdown + total (OVR-like scale). */
export function strength(team, opp, E, plan, oppPlan) {
  const t = talent(team, E, plan.rotation);
  const chem = chemistry(team, E).value;
  const fit = 0.5 * (leverFit(team, E, 'offense', plan.offense) + leverFit(team, E, 'defense', plan.defense)
    + leverFit(team, E, 'tempo', plan.tempo) + leverFit(team, E, 'rotation', plan.rotation));
  const match = 0.5 * (counter(plan.offense, oppPlan.defense, team, opp) - counter(oppPlan.offense, plan.defense, opp, team));
  // Defensive assignment: my stopper on their primary
  const stopper = findCard(team, plan.stopper) ?? starters(team)[0];
  const theirPrimary = findCard(opp, oppPlan.primary) ?? starters(opp)[0];
  const sizeGap = Math.abs(POSITIONS.indexOf(stopper.pos) - POSITIONS.indexOf(theirPrimary.pos));
  const assign = ((stopper.def - 80) / 12) * (sizeGap >= 3 ? 0.4 : sizeGap === 2 ? 0.75 : 1) * ((theirPrimary.usage + 10) / 100);
  const total = t + chem + fit + match + assign;
  return { talent: t, chem, fit, match, assign, total };
}

/** Pre-draft-era-pick roster score (for draft grades): mean talent+chem over all eras. */
export function rosterScore(team) {
  return avg(ERAS.map((E) => talent(team, E) + chemistry(team, E).value));
}

// ---------- Box score ----------
function scoringSkill(c, E) {
  const w3 = ERA_INFO[E].w.three + 0.3;
  return (c.inside * (1 - w3 / 2) + c.three * (w3 / 2)) / 85;
}
function boxScore(team, E, pts, rng, plan, primaryBoost, stoppedId, stopPct, reboundsTotal, assistsTotal) {
  const players = allPlayers(team);
  const mins = minutesFor(plan.rotation);
  const share = players.map((c, i) => {
    let s = mins[i] * Math.pow(c.usage / 100, 1.7) * Math.pow(scoringSkill(c, E), 2) * Math.exp(rng.gauss() * 0.28);
    if (c.id === plan.primary) s *= primaryBoost;
    if (c.id === stoppedId) s *= stopPct;
    return s;
  });
  const reb = players.map((c, i) => mins[i] * Math.pow(c.rebounding / 70, 3) * Math.exp(rng.gauss() * 0.25));
  const ast = players.map((c, i) => mins[i] * Math.pow(c.play / 70, 3.2) * Math.exp(rng.gauss() * 0.25));
  const pPts = allocate(pts, share);
  const pReb = allocate(reboundsTotal, reb);
  const pAst = allocate(assistsTotal, ast);
  return players.map((c, i) => ({ id: c.id, name: c.name, era: c.era, pos: c.pos, bench: i >= 5, min: mins[i], pts: pPts[i], reb: pReb[i], ast: pAst[i] }));
}
function allocate(total, weights) {
  const sum = weights.reduce((s, x) => s + x, 0);
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let rem = total - out.reduce((s, x) => s + x, 0);
  const order = raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rem > 0; k = (k + 1) % order.length, rem--) out[order[k][1]]++;
  return out;
}

// ---------- Game ----------
const TEMPO_PACE = { slow: 0.95, balanced: 1, fast: 1.05 };

/**
 * Simulate one Finals game.
 * @param teamA, teamB  team objects
 * @param era           Finals era
 * @param plans         { A: plan, B: plan }
 * @param seed          any string/number
 * @param opts          { home: 'A' | 'B' | null }
 */
export function simGame(teamA, teamB, era, plans, seed, opts = {}) {
  const rng = makeRng(seed);
  const { K, SIGMA, HOME, CLUTCH } = TUNING;
  const E = ERA_INFO[era];
  const sA = strength(teamA, teamB, era, plans.A, plans.B);
  const sB = strength(teamB, teamA, era, plans.B, plans.A);
  const home = opts.home ?? null;
  const homeAdv = home === 'A' ? HOME : home === 'B' ? -HOME : 0;
  const mean = K * (sA.total - sB.total) + homeAdv;

  const pace = E.pace * (TEMPO_PACE[plans.A.tempo] + TEMPO_PACE[plans.B.tempo]) / 2;
  const total = E.ppg * 2 * pace + rng.gauss() * 9;

  // Crunch time: primary option's clutch vs the stopper guarding him
  const clutchEdge = (team, opp, plan, oppPlan) => {
    const p = findCard(team, plan.primary) ?? starters(team)[0];
    const st = findCard(opp, oppPlan.stopper) ?? starters(opp)[0];
    return clamp(((p.clutch - 80) - (st.def - 80) * 0.5) / 12, -1, 1) * CLUTCH;
  };
  const clutchA = clutchEdge(teamA, teamB, plans.A, plans.B) - clutchEdge(teamB, teamA, plans.B, plans.A);

  const quarters = [];
  let mA = 0, ptsA = 0, ptsB = 0;
  const trail = { A: 0, B: 0 }; // biggest deficit at a quarter break
  for (let q = 0; q < 4; q++) {
    const close = q === 3 && Math.abs(ptsA - ptsB) <= 8;
    const qm = mean / 4 + (close ? clutchA : 0) + rng.gauss() * (SIGMA / 2);
    const qt = total / 4 + rng.gauss() * 3;
    const a = Math.max(10, Math.round((qt + qm) / 2));
    const b = Math.max(10, Math.round((qt - qm) / 2));
    quarters.push([a, b]);
    ptsA += a; ptsB += b; mA = ptsA - ptsB;
    if (q < 3) { trail.A = Math.max(trail.A, -mA); trail.B = Math.max(trail.B, mA); }
  }
  let ot = 0;
  while (ptsA === ptsB) {
    ot++;
    const qm = mean / 10 + clutchA * 0.6 + rng.gauss() * 4;
    const qt = (total / 48) * 5 + rng.gauss() * 2;
    const a = Math.max(2, Math.round((qt + qm) / 2));
    const b = Math.max(2, Math.round((qt - qm) / 2));
    quarters.push([a, b]);
    ptsA += a; ptsB += b;
  }
  const winner = ptsA > ptsB ? 'A' : 'B';

  // Box scores
  const reb = Math.round(44 * pace + rng.gauss() * 3);
  const ast = Math.round(23 * pace + rng.gauss() * 2.5);
  const stopFactor = (team, plan) => { const st = findCard(team, plan.stopper); return st ? clamp(1 - (st.def - 70) / 160, 0.78, 1.05) : 1; };
  const boxA = boxScore(teamA, era, ptsA, rng, plans.A, 1.12, plans.B.primary, stopFactor(teamB, plans.B), reb + Math.round(rng.gauss() * 3), ast);
  const boxB = boxScore(teamB, era, ptsB, rng, plans.B, 1.12, plans.A.primary, stopFactor(teamA, plans.A), reb + Math.round(rng.gauss() * 3), ast);
  const top = (box) => [...box].sort((x, y) => y.pts - x.pts || y.reb - x.reb)[0];
  const topA = top(boxA), topB = top(boxB);

  // Game-type tags (used by recaps)
  const margin = Math.abs(ptsA - ptsB);
  const loser = winner === 'A' ? 'B' : 'A';
  const wTop = winner === 'A' ? topA : topB;
  const wBox = winner === 'A' ? boxA : boxB;
  const tags = [];
  if (margin >= 18) tags.push('blowout');
  if (ot) tags.push('ot');
  if (!ot && margin <= 2) tags.push('buzzer-beater');
  if (trail[winner] >= 9) tags.push('comeback');
  if (ptsA < E.ppg - 10 && ptsB < E.ppg - 10) tags.push('defensive-grind');
  if (ptsA > E.ppg + 10 && ptsB > E.ppg + 10) tags.push('shootout');
  if (topA.pts >= 33 && topB.pts >= 33) tags.push('star-duel');
  if (wBox.filter((p) => p.bench).some((p) => p.pts >= 20 || p.id === wTop.id)) tags.push('bench-game');
  if (Math.abs(eraIdx(wTop.era) - eraIdx(era)) >= 2) tags.push('era-clash');
  if (!tags.length) tags.push(margin >= 10 ? 'solid-win' : 'close-win');

  return {
    seed: String(seed), era, home,
    score: { A: ptsA, B: ptsB }, winner, loser, margin, ot,
    quarters, box: { A: boxA, B: boxB }, top: { A: topA, B: topB },
    tags, strength: { A: sA, B: sB }, expectedMargin: mean,
  };
}

// ---------- Series ----------
const HOME_PATTERN = [0, 0, 1, 1, 0, 1, 0]; // 2-2-1-1-1: 0 = higher seed at home

/** Which team hosts game n (1-based) given the higher seed. */
export function homeFor(gameNo, higherSeed) {
  const other = higherSeed === 'A' ? 'B' : 'A';
  return HOME_PATTERN[gameNo - 1] === 0 ? higherSeed : other;
}

/** Higher seed = better neutral-court strength with the opening plans; coin-flip winner breaks ties. */
export function higherSeed(teamA, teamB, era, plans, tiebreak = 'A') {
  const a = strength(teamA, teamB, era, plans.A, plans.B).total;
  const b = strength(teamB, teamA, era, plans.B, plans.A).total;
  if (Math.abs(a - b) < 1e-9) return tiebreak;
  return a > b ? 'A' : 'B';
}

/**
 * Simulate a best-of-7.
 * @param plans  either { A, B } (fixed) or a function (gameNo, history) => { A, B } for between-game adjustments
 * @param opts   { tiebreak: 'A'|'B' }
 */
export function simSeries(teamA, teamB, era, plans, seed, opts = {}) {
  const planFor = typeof plans === 'function' ? plans : () => plans;
  const opening = planFor(1, []);
  const seedTeam = opts.higherSeed ?? higherSeed(teamA, teamB, era, opening, opts.tiebreak ?? 'A');
  const games = [];
  while (!seriesOver(games)) {
    const p = games.length === 0 ? opening : planFor(games.length + 1, games);
    games.push(playGame(teamA, teamB, era, games, p, seed, seedTeam));
  }
  return summarizeSeries(teamA, teamB, era, games, seed, seedTeam);
}

export function seriesOver(games) {
  const w = games.length ? games[games.length - 1].seriesAfter : { A: 0, B: 0 };
  return w.A >= 4 || w.B >= 4;
}

/** Play the next game of a series (used by simSeries and by the game-by-game UI). */
export function playGame(teamA, teamB, era, games, plans, seed, seedTeam) {
  const n = games.length + 1;
  const g = simGame(teamA, teamB, era, plans, `${seed}-g${n}`, { home: homeFor(n, seedTeam) });
  g.n = n;
  g.plans = { A: { ...plans.A }, B: { ...plans.B } };
  const last = games[games.length - 1];
  // Adjustment paid off: the team that lost last game changed a lever and won this one
  if (last && last.winner !== g.winner && LEVERS.some((l) => plans[g.winner][l] !== last.plans[g.winner][l])) {
    g.tags.push('adjustment-paid-off');
  }
  const prev = last ? last.seriesAfter : { A: 0, B: 0 };
  g.seriesAfter = { ...prev, [g.winner]: prev[g.winner] + 1 };
  return g;
}

export function summarizeSeries(teamA, teamB, era, games, seed, seedTeam) {
  const wins = games[games.length - 1].seriesAfter;
  const winner = wins.A === 4 ? 'A' : wins.B === 4 ? 'B' : null;
  const averages = { A: seriesAverages(games, 'A'), B: seriesAverages(games, 'B') };
  let mvp = null;
  if (winner) {
    mvp = [...averages[winner]].sort((x, y) => mvpScore(y) - mvpScore(x))[0];
  }
  return {
    seed: String(seed), era, games, wins, winner, higherSeed: seedTeam,
    result: winner ? `${Math.max(wins.A, wins.B)}–${Math.min(wins.A, wins.B)}` : `${wins.A}–${wins.B}`,
    mvp, averages, turningPoint: winner ? turningPoint(games, winner) : null,
  };
}

const mvpScore = (p) => p.pts + 0.6 * p.reb + 0.8 * p.ast;

function seriesAverages(games, side) {
  const acc = new Map();
  for (const g of games) for (const p of g.box[side]) {
    const a = acc.get(p.id) ?? { id: p.id, name: p.name, era: p.era, pos: p.pos, gp: 0, pts: 0, reb: 0, ast: 0 };
    a.gp++; a.pts += p.pts; a.reb += p.reb; a.ast += p.ast;
    acc.set(p.id, a);
  }
  return [...acc.values()].map((a) => ({ ...a, pts: round1(a.pts / a.gp), reb: round1(a.reb / a.gp), ast: round1(a.ast / a.gp) }));
}
const round1 = (x) => Math.round(x * 10) / 10;

/** The game after which the eventual winner led the series for good. */
function turningPoint(games, winner) {
  const loser = winner === 'A' ? 'B' : 'A';
  let tp = games.length;
  for (let i = games.length - 1; i >= 0; i--) {
    const s = games[i].seriesAfter;
    if (s[winner] > s[loser]) tp = i + 1; else break;
  }
  return tp;
}

// ---------- Coach grades ----------
const LETTERS = ['A', 'B', 'C', 'D', 'F'];
function letter(delta) {
  if (delta <= 0.05) return 'A';
  if (delta <= 0.5) return 'B';
  if (delta <= 1.2) return 'C';
  if (delta <= 2) return 'D';
  return 'F';
}
const OPTIONS = { offense: OFFENSES, defense: DEFENSES, tempo: TEMPOS, rotation: ROTATIONS };

/** Grade each lever A–F vs roster + era + opponent (counters included). */
export function gradePlan(team, opp, E, plan, oppPlan) {
  const base = strength(team, opp, E, plan, oppPlan).total;
  const grades = {};
  const best = {};
  for (const lever of LEVERS) {
    const opts = OPTIONS[lever] ?? starters(team).map((c) => c.id);
    let bestVal = -Infinity, bestOpt = plan[lever];
    for (const o of opts) {
      const v = lever === 'primary'
        ? primaryValue(team, opp, oppPlan, o)
        : strength(team, opp, E, { ...plan, [lever]: o }, oppPlan).total;
      if (v > bestVal) { bestVal = v; bestOpt = o; }
    }
    const mine = lever === 'primary' ? primaryValue(team, opp, oppPlan, plan.primary) : base;
    grades[lever] = letter(bestVal - mine);
    best[lever] = bestOpt;
  }
  const gpa = avg(LEVERS.map((l) => 4 - LETTERS.indexOf(grades[l])));
  const overall = gpa >= 3.6 ? 'A' : gpa >= 2.8 ? 'B' : gpa >= 2 ? 'C' : gpa >= 1.2 ? 'D' : 'F';
  return { grades, best, overall, gpa };
}
function primaryValue(team, opp, oppPlan, id) {
  const p = findCard(team, id);
  const st = findCard(opp, oppPlan.stopper) ?? starters(opp)[0];
  const guarded = (p.clutch - 80) - (st.def - 80) * 0.5;
  return guarded / 6 + (p.usage - 80) / 10; // clutch matters, ball-dominance helps
}

/** Greedy best plan (used by CPU and as the "coach's suggestion"). */
export function bestPlan(team, opp, E, oppPlan, start = defaultPlan(team)) {
  let plan = { ...start };
  for (let pass = 0; pass < 2; pass++) {
    for (const lever of LEVERS) {
      const opts = OPTIONS[lever] ?? starters(team).map((c) => c.id);
      let bestV = -Infinity, bestO = plan[lever];
      for (const o of opts) {
        const v = lever === 'primary' ? primaryValue(team, opp, oppPlan, o) : strength(team, opp, E, { ...plan, [lever]: o }, oppPlan).total;
        if (v > bestV) { bestV = v; bestO = o; }
      }
      plan[lever] = bestO;
    }
  }
  return plan;
}

// ---------- Draft grade ----------
// Cutoffs from the rosterScore distribution of 6,000 mock-drafted rosters (p95, p90, p80 ...).
const DRAFT_CUTOFFS = [[96.1, 'A+'], [95.6, 'A'], [95.1, 'A-'], [94.5, 'B+'], [94.0, 'B'], [93.4, 'B-'], [92.8, 'C+'], [92.3, 'C'], [91.8, 'C-'], [90.9, 'D']];
export function draftGrade(team) {
  const score = rosterScore(team);
  const grade = (DRAFT_CUTOFFS.find(([c]) => score >= c) ?? [0, 'F'])[1];
  const byEra = ERAS.map((E) => ({ era: E, value: talent(team, E) + chemistry(team, E).value, chem: chemistry(team, E) }));
  byEra.sort((a, b) => b.value - a.value);
  return { score, grade, bestEra: byEra[0].era, worstEra: byEra[byEra.length - 1].era, notes: chemistry(team, byEra[0].era).notes };
}
