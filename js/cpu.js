// CPU opponent: drafting, vetoes, trades, era pick, game plans and adjustments.
// Pure functions (randomness comes in through an rng argument).
//   Easy   — best available OVR, random era, default game plan, no vetoes/trades/adjustments.
//   Normal — drafts for fit + era cap, picks the era that suits its own roster, adjusts after losses.
//   Legend — also counter-drafts, picks the era that hurts YOUR roster, counters your plan every game.

import {
  ERAS, POSITIONS, eraAdapt, strength, rosterScore, talent, chemistry, defaultPlan, bestPlan,
  OFFENSES, DEFENSES, TEMPOS, ROTATIONS,
} from './sim.js?v=5';

export const LEVELS = ['easy', 'normal', 'legend'];
export const LEVEL_LABEL = { easy: 'Easy', normal: 'Normal', legend: 'Legend' };

const avg = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// ---------- Coin flip ----------
export function coinChoice(level, rng) {
  if (level === 'easy') return rng() < 0.5 ? 'first' : 'defer';
  if (level === 'normal') return 'first';
  return 'defer'; // Legend wants era control
}

// ---------- Draft ----------
/**
 * ctx: {
 *   roster: { starters: {pos: card}, bench: [] },   // CPU's partial roster
 *   slot: { era, pos } | null,                        // null = free pick (6th/7th man)
 *   options: card[],                                  // legal cards for this pick
 *   eraControl: boolean,                              // CPU picks the Finals era
 *   oppCanUse: (card) => boolean,                     // opponent could still draft this card
 *   oppOptions: (card) => card[],                     // opponent's legal cards in that card's cell (or free pool)
 * }
 */
export function choosePick(level, ctx) {
  const { options } = ctx;
  if (!options.length) return null;
  if (level === 'easy') return [...options].sort((a, b) => b.ovr - a.ovr)[0];
  let best = null, bestV = -Infinity;
  for (const c of options) {
    const v = pickValue(level, ctx, c);
    if (v > bestV) { bestV = v; best = c; }
  }
  return best;
}

function targetEra(roster, extra) {
  const s = [...Object.values(roster.starters), ...(extra ? [extra] : [])];
  if (!s.length) return null;
  let best = ERAS[0], bestV = -Infinity;
  for (const E of ERAS) {
    const v = s.reduce((t, c) => t + eraAdapt(c, E), 0);
    if (v > bestV) { bestV = v; best = E; }
  }
  return best;
}

function pickValue(level, ctx, c) {
  const { roster, slot, eraControl } = ctx;
  let v = c.ovr;
  // Era cap: with era control, fit the era you'll pick; without it, be robust to any era.
  if (eraControl) {
    const E = targetEra(roster, c);
    v += 0.6 * eraAdapt(c, E);
  } else {
    const adapts = ERAS.map((E) => eraAdapt(c, E));
    v += 0.4 * avg(adapts) + 0.25 * Math.min(...adapts);
  }
  if (slot) {
    const s = Object.values(roster.starters);
    const left = 5 - s.length;
    const alphas = s.filter((x) => x.usage >= 94).length;
    if (c.usage >= 94 && alphas >= 2) v -= 1.5;
    if (Math.max(0, ...s.map((x) => x.play)) < 82 && c.play >= 85) v += 1.5 / left;
    if (s.filter((x) => x.three >= 78).length < 2 && c.three >= 78) v += 0.8;
    if (Math.max(0, ...s.map((x) => x.rebounding)) < 80 && c.rebounding >= 85) v += 0.8 / left;
  }
  if (level === 'legend' && ctx.oppCanUse(c)) {
    // Counter-draft: value of denying the opponent their best card in this cell
    const opp = ctx.oppOptions(c).sort((a, b) => b.ovr - a.ovr);
    if (opp[0]?.id === c.id) v += 0.6 * (c.ovr - (opp[1]?.ovr ?? c.ovr - 6));
  }
  return v;
}

/** Re-roll if this slot is much worse than an average open slot. */
export function wantsReroll(level, bestInSlot, bestPerOpenSlot) {
  if (level === 'easy' || !bestInSlot || bestPerOpenSlot.length < 2) return false;
  const typical = avg(bestPerOpenSlot);
  return bestInSlot.ovr < typical - (level === 'legend' ? 3 : 4);
}

/** CPU (as opponent) decides whether to veto a pick. nextBest = picker's best alternative. */
export function wantsVeto(level, picked, nextBest) {
  if (level === 'easy' || !nextBest) return false;
  const drop = picked.ovr - nextBest.ovr;
  if (level === 'normal') return picked.ovr >= 94 && drop >= 5;
  return picked.ovr >= 97 || (picked.ovr >= 92 && drop >= 4);
}

// ---------- Trades ----------
/** All legal 1-for-1 swaps between two full rosters. give = card from `mine`, get = card from `theirs`. */
export function legalTrades(mine, theirs) {
  const mineAll = [...POSITIONS.map((p) => mine.starters[p]), ...mine.bench];
  const theirAll = [...POSITIONS.map((p) => theirs.starters[p]), ...theirs.bench];
  const isStarter = (team, c) => team.starters[c.pos]?.id === c.id;
  const out = [];
  for (const g of mineAll) for (const t of theirAll) {
    const gS = isStarter(mine, g), tS = isStarter(theirs, t);
    if ((gS || tS) && (g.era !== t.era || g.pos !== t.pos)) continue; // starters must swap like-for-like cell
    if (g.playerId === t.playerId) continue;
    if (mineAll.some((c) => c.id !== g.id && c.playerId === t.playerId)) continue;
    if (theirAll.some((c) => c.id !== t.id && c.playerId === g.playerId)) continue;
    out.push({ give: g, get: t });
  }
  return out;
}

export function applyTrade(team, give, get) {
  const t = { ...team, starters: { ...team.starters }, bench: [...team.bench] };
  if (t.starters[give.pos]?.id === give.id) t.starters[give.pos] = get;
  else t.bench = t.bench.map((c) => (c.id === give.id ? get : c));
  return t;
}

/** CPU's offer to the human, or null. */
export function tradeOffer(level, cpu, human) {
  if (level === 'easy') return null;
  const base = rosterScore(cpu);
  let best = null, bestGain = level === 'legend' ? 0.3 : 0.6;
  for (const { give, get } of legalTrades(cpu, human)) {
    if (get.ovr - give.ovr > 0) continue;        // must look fair-or-better to the human on OVR
    if (give.ovr - get.ovr > 3) continue;         // and not obviously lopsided
    const gain = rosterScore(applyTrade(cpu, give, get)) - base;
    if (gain > bestGain) { bestGain = gain; best = { give, get }; }
  }
  return best;
}

/** CPU responds to the human's offer: human gives `get` (CPU receives it), wants `give` (CPU sends it). */
export function acceptsTrade(level, cpu, human, cpuSends, cpuGets) {
  if (level === 'easy') return cpuGets.ovr >= cpuSends.ovr;
  const gain = rosterScore(applyTrade(cpu, cpuSends, cpuGets)) - rosterScore(cpu);
  if (level === 'normal') return gain >= 0.2 && cpuGets.ovr >= cpuSends.ovr - 3;
  const humanGain = rosterScore(applyTrade(human, cpuGets, cpuSends)) - rosterScore(human);
  return gain >= 0.3 && humanGain <= gain;
}

// ---------- Era ----------
const eraValue = (team, E) => talent(team, E) + chemistry(team, E).value;
export function chooseEra(level, cpu, human, rng) {
  if (level === 'easy') return ERAS[Math.floor(rng() * ERAS.length)];
  let best = ERAS[0], bestV = -Infinity;
  for (const E of ERAS) {
    const v = level === 'normal' ? eraValue(cpu, E) : eraValue(cpu, E) - eraValue(human, E);
    if (v > bestV) { bestV = v; best = E; }
  }
  return best;
}

// ---------- Game plan ----------
export function choosePlan(level, cpu, human, E) {
  if (level === 'easy') return defaultPlan(cpu);
  return bestPlan(cpu, human, E, defaultPlan(human));
}

const ADJUST_OPTIONS = { offense: OFFENSES, defense: DEFENSES, tempo: TEMPOS, rotation: ROTATIONS };

/** One-lever adjustment after a game (now that the opponent's plan has been seen). */
export function adjustPlan(level, cpu, human, E, myPlan, oppPlan, lostLast) {
  if (level === 'easy') return { plan: myPlan, changed: null };
  if (level === 'normal' && !lostLast) return { plan: myPlan, changed: null };
  const base = strength(cpu, human, E, myPlan, oppPlan).total;
  let best = null, bestGain = level === 'legend' ? 0.15 : 0.3;
  const levers = { ...ADJUST_OPTIONS, stopper: POSITIONS.map((p) => cpu.starters[p].id) };
  for (const [lever, opts] of Object.entries(levers)) for (const o of opts) {
    if (o === myPlan[lever]) continue;
    const gain = strength(cpu, human, E, { ...myPlan, [lever]: o }, oppPlan).total - base;
    if (gain > bestGain) { bestGain = gain; best = { lever, value: o }; }
  }
  if (!best) return { plan: myPlan, changed: null };
  return { plan: { ...myPlan, [best.lever]: best.value }, changed: best.lever };
}
