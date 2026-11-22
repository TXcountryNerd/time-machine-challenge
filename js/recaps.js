// Recap bank: 100+ tagged templates filled with real names and stats.
// No template repeats within a series (caller passes a `used` Set that persists across games).
//
// recapFor(game, ctx, used) -> { id, line, line2, pbp[] }
//   game: output of Sim.playGame (has tags, box, top, plans, quarters, seriesAfter, n)
//   ctx:  { names: { A, B }, era, teams: { A, B } }
//   used: Set of template ids already used in this series (mutated)

import { makeRng, LEVERS } from './sim.js';

// ---------- Template bank ----------
// Placeholders: {W} {L} winner/loser team, {Wp} {Lp} possessives, {ws} {ls} scores, {margin}, {n} game no.,
// {era}, {wTop} {wTopL} {wPts} {wReb} {wAst} {wTopEra} (and l- versions), {wBench} {wBenchPts},
// {wPrim} {lPrim} crunch-time options, {wStop} {lStop} stoppers, {wOff} {lOff} {wDef} {lDef} {wTempo},
// {adj} winner's adjustment, {prevN}, {trail} biggest deficit overcome, {q4w} {q4l}, {otText}, {duelSum}.
const BANK = {
  blowout: [
    '{wTopL}: {wPts} & {wReb}. {Lp} {lDef} never found an answer in a {margin}-point rout.',
    'Never close. {W} ran {L} off the floor, {ws}–{ls}, behind {wPts} from {wTop}.',
    '{wTop} had {wPts} by the time the starters sat. {W} by {margin}.',
    'Statement game: {W} {ws}, {L} {ls}. {wTopL} was the best player on the floor by a mile.',
    '{Lp} {lOff} looked broken from the opening tip. {W} rolled by {margin}.',
    'Garbage time started in the third. {wTop} ({wPts} pts) and {W} cruised, {ws}–{ls}.',
    ['{wTopL} {wPts}, {wBench} {wBenchPts} off the bench, and a {margin}-point beatdown.', 'bench'],
    '{W} turned Game {n} into a highlight reel, {ws}–{ls}. {lTop} watched the fourth from the bench.',
    'A {margin}-point message from {W}. {Lp} {lDef} gave up {ws}.',
    'Blowout alert: {wTop} went for {wPts}-{wReb}-{wAst} and {W} won by {margin}.',
    '{L} trailed by double digits most of the night and lost {ws}–{ls}. {wTopL} feasted.',
    'The {era} crowd headed for the exits early. {W} {ws}, {L} {ls}.',
    '{wTopL}: {wPts} in three quarters of work. {W} buried {L} by {margin}.',
  ],
  ot: [
    'Overtime thriller! {wTopL} scored {wPts}, and {W} outlasted {L} {ws}–{ls}.',
    '{W} survived {otText}, {ws}–{ls}. {wPrim} owned the extra period.',
    'Five more minutes, same story: {wTop} took over and {W} won {ws}–{ls} in {otText}.',
    'Regulation couldn’t settle it. {Wp} {wPrim} did, in a {ws}–{ls} {otText} win.',
    '{lTop} forced extra time with {lPts}, but {W} pulled away late, {ws}–{ls}.',
    'Tied after 48. {W} won the extra session and Game {n}, {ws}–{ls}.',
    'OT classic: {wTopL} {wPts}/{wReb}, {lTopL} {lPts}/{lReb}. {W} by {margin}.',
    '{Lp} legs went in {otText}. {W} closed it {ws}–{ls} behind {wTop}.',
    '{wStop} locked down {lPrim} in the extra period, and {W} escaped {ws}–{ls}.',
    'Instant classic in Game {n}: {W} {ws}, {L} {ls}, after {otText}. {wTopL} had {wPts}.',
  ],
  'buzzer-beater': [
    '{wPrim} at the horn! {W} stole Game {n}, {ws}–{ls}.',
    'Ballgame on the final possession: {wPrim} delivered and {W} won by {margin}.',
    '{lTop} had {lPts}, but {Wp} {wPrim} got the last word. {ws}–{ls}.',
    'Down to the wire: {W} {ws}, {L} {ls}. {wStop} got the stop that sealed it.',
    'Heartbreak for {L}. {wPrim} buried the dagger with seconds left, {ws}–{ls}.',
    'A one-possession classic. {wTopL}: {wPts} & {wReb}, the last bucket included.',
    '{Lp} final shot rimmed out. {W} hung on, {ws}–{ls}.',
    '{wPrim} wanted the ball and got it. Game {n} to {W}, {ws}–{ls}.',
    'Nail-biter: {W} won {ws}–{ls} on a late {wPrim} bucket.',
    'Two points or less. That’s all that separated them. {W} took Game {n} behind {wTop}’s {wPts}.',
  ],
  comeback: [
    'Down {trail} and left for dead, {W} stormed back to win {ws}–{ls}. {wTopL} led the charge with {wPts}.',
    '{W} erased a {trail}-point hole. {wTop}: {wPts} & {wReb}.',
    'Comeback complete! {W} trailed by {trail} and won by {margin}.',
    '{L} led by {trail} and still lost. {Wp} {wPrim} flipped the game late.',
    '{W} won the fourth {q4w}–{q4l} to finish a {trail}-point rally.',
    'From {trail} down to {ws}–{ls} winners. {wTopL} refused to lose.',
    '{Lp} {lDef} cracked in the second half. {W} came back from {trail} down.',
    'It looked like {Lp} night until it wasn’t: a {trail}-point lead gone, {ws}–{ls}.',
    ['{wBench} sparked the rally off the bench ({wBenchPts} pts), and {W} came all the way back from {trail} down.', 'bench'],
    'Never count out {W}. Down {trail}, then up for good. {wTop} had {wPts}.',
  ],
  'defensive-grind': [
    'Rock fight. {W} won {ws}–{ls}, and {Wp} {wDef} ground {L} to a halt.',
    'Points were scarce in Game {n}. {wTopL}’s {wPts} was enough, {ws}–{ls}.',
    '{wStop} smothered {lPrim}, and {W} won an ugly one, {ws}–{ls}.',
    'Old-school defense: {L} managed just {ls}. {W} by {margin}.',
    'Every bucket was a fight. {W} survived {ws}–{ls}; {wTop} led with {wPts}.',
    '{Lp} {lOff} went ice cold in a {ws}–{ls} slugfest.',
    'A real {era} kind of game: elbows, hand-checks, {ws}–{ls}. {W} won the war.',
    '{wTopL}: {wPts} & {wReb} in a grinder. {Wp} defense held {L} to {ls}.',
    'Nobody could score, and {W} didn’t care. {ws}–{ls}, and the {wDef} was the star.',
  ],
  shootout: [
    'Shootout! {W} {ws}, {L} {ls}. {wTopL} {wPts}, {lTopL} {lPts}.',
    'No defense, all fireworks: {W} outgunned {L} {ws}–{ls}.',
    '{W} hung {ws} on the board. {wTop}: {wPts} points, {wAst} assists.',
    'Track meet in Game {n}. {W} won the race, {ws}–{ls}.',
    '{ws} to {ls}. Somebody check the scoreboard bulbs. {W} won it behind {wTop}.',
    '{wTopL} and {lTopL} traded buckets all night. {W} by {margin}.',
    'Points everywhere: {W} {ws}–{ls}. {Wp} {wOff} was unstoppable.',
    'A {wTempo} track meet went to {W}, {ws}–{ls}. {wTopL} had {wPts}.',
    'Neither {lDef} nor anything else slowed {W}: {ws} points and a {margin}-point win.',
  ],
  'star-duel': [
    'Duel of the night: {wTopL} {wPts}, {lTopL} {lPts}. {W} won it, {ws}–{ls}.',
    '{wTop} vs. {lTop}, {wTopEra} star against {lTopEra} star. {wTopL} got the win.',
    '{lTop} dropped {lPts} in a losing effort. {wTop} answered with {wPts}.',
    'Heavyweight bout: {wTopL} ({wPts}) outlasted {lTopL} ({lPts}). {W} {ws}–{ls}.',
    'Neither star blinked, but {wTopL} had the last word, {wPts} to {lPts}.',
    '{lTopL} {lPts}, {wTopL} {wPts}. {W} {ws}, {L} {ls}. Instant classic.',
    'Shot for shot: {wTop} and {lTop} combined for {duelSum}. {W} took Game {n}.',
    'The stars showed up. {wTopL} {wPts}/{wReb}, {lTopL} {lPts}/{lReb}. Advantage {W}.',
    '{lTop} did everything ({lPts} pts) except win. {wTop}’s {wPts} carried {W}.',
    'Time-machine duel: {wTopEra} {wTopL} beat {lTopEra} {lTopL}, {ws}–{ls}.',
  ],
  'bench-game': [
    '{wBench} off the bench: {wBenchPts} points. {W} won Game {n}, {ws}–{ls}.',
    'Bench mob! {wBench} gave {W} {wBenchPts} in a {ws}–{ls} win.',
    '{Lp} reserves couldn’t keep up with {wBench} ({wBenchPts}). {W} by {margin}.',
    'The difference? {wBench}. {wBenchPts} points from the bench, {W} by {margin}.',
    '{wBench} played like a starter, {wBenchPts} points, and {W} took Game {n}.',
    'Sixth-man energy: {wBench} lit it up for {wBenchPts}. {W} {ws}, {L} {ls}.',
    '{W} went deep, and {wBench} made the coach look like a genius ({wBenchPts} pts).',
    'Unsung hero: {wBench}, {wBenchPts} points. {W} {ws}–{ls}.',
    '{wTop} had {wPts}, but {wBench}’s {wBenchPts} off the pine swung Game {n}.',
  ],
  'era-clash': [
    'Time traveler! {wTopEra} {wTopL} dropped {wPts} in the {era} and {W} won {ws}–{ls}.',
    '{wTop} didn’t care what decade it was: {wPts} & {wReb}. {W} by {margin}.',
    'Out of his era, still on top: {wTopEra} {wTopL} led {W} with {wPts}.',
    '{wTopEra} {wTopL} looked right at home in the {era}. {W} {ws}, {L} {ls}.',
    'The era didn’t matter. {wTop} had {wPts} and {W} took Game {n}.',
    '{wTopL} brought his {wTopEra} game to the {era} Finals and it worked: {wPts} points.',
    'Culture shock for {L}: {wTopEra} {wTopL} went for {wPts} in a {era} game.',
    'Decades apart, same result: {wTopL} {wPts}, {W} {ws}–{ls}.',
    '{wTop} adapted on the fly ({wPts} pts) and {W} beat {L} by {margin}.',
    'Rules, pace, era, whatever: {wTopEra} {wTopL} scored {wPts}. Game {n} to {W}.',
  ],
  'adjustment-paid-off': [
    'The adjustment worked. {Wp} switch to {adj} turned it around, {ws}–{ls}.',
    'Coaching win: {W} went to {adj} and bounced back, {ws}–{ls}.',
    '{W} lost Game {prevN}, went to {adj}, and won Game {n} by {margin}.',
    'Chess move: {adj}. {L} had no counter, {ws}–{ls}.',
    '{Wp} move to {adj} paid off big. {wTopL}: {wPts} & {wReb}.',
    'Film session pays off: {W} answered with {adj} and a {ws}–{ls} win.',
    'From the clipboard to the scoreboard: {adj} keyed a {margin}-point {W} win.',
    '{W} adjusted ({adj}). {L} didn’t. Game {n} to {W}.',
    'Bounce-back game: {adj} unlocked {wTop} for {wPts}.',
  ],
  'close-win': [
    '{wTopL}: {wPts} & {wReb}. {W} held off {L}, {ws}–{ls}.',
    'Tight all night, but {W} made the late plays. {ws}–{ls}.',
    '{W} edged {L} by {margin} behind {wTop}’s {wPts}.',
    '{lTop} kept {L} close with {lPts}, but {W} closed it out, {ws}–{ls}.',
    'A gritty {margin}-point win for {W}. {wPrim} hit the big shots late.',
    '{W} won the fourth quarter {q4w}–{q4l} and Game {n} with it.',
    'Back-and-forth Game {n} went to {W}, {ws}–{ls}. {wTopL} led all scorers with {wPts}.',
    '{wStop} made life miserable for {lPrim} in a {ws}–{ls} {W} win.',
  ],
  'solid-win': [
    '{wTopL}: {wPts} & {wReb}. {W} pulled away for a {ws}–{ls} win.',
    '{W} controlled Game {n} from the second quarter on, {ws}–{ls}.',
    'Comfortable night for {W}: up double digits most of the way, final {ws}–{ls}.',
    ['{wTop} ({wPts}) and {wBench} ({wBenchPts}) powered a {margin}-point win.', 'bench'],
    '{Lp} {lOff} stalled in the third, and {W} won going away, {ws}–{ls}.',
    '{W} took care of business, {ws}–{ls}. {wTopL} led the way with {wPts}.',
    '{lTop} scored {lPts}, but {W} was simply better: {ws}–{ls}.',
    'A {margin}-point win for {W}, keyed by {Wp} {wDef}.',
  ],
};

// Second line: series context (only when it matters)
const SERIES = {
  clinch: [
    'Title clinched: {W}, {sw}–{sl}.',
    'Confetti time for {W}. Series final: {sw}–{sl}.',
    'Ballgame, series, championship. {W} by {sw}–{sl}.',
    'The {era} Finals belong to {W}, {sw}–{sl}.',
    'Champagne for {W}. {wTop} finished the job.',
    'Game {n} sealed it: the trophy goes to {W}.',
    'And that’s the series. The {era} crown goes to {W}, {sw}–{sl}.',
  ],
  tied: [
    'Series tied {sw}–{sl}.',
    'All square at {sw}–{sl}.',
    'Series even, {sw}–{sl}. Buckle up.',
    'Back to even at {sw}–{sl}.',
  ],
  matchPoint: [
    '{W} one win from the title, up {sw}–{sl}.',
    'Match point for {W}: {sw}–{sl}.',
    'Elimination watch: {L} down {sl}–{sw}.',
    '{L} has to win the next one. It’s {sw}–{sl}.',
  ],
  game7: [
    'Game 7. The two scariest words in sports.',
    'It’s going seven.',
    'Winner-take-all Game 7 is next.',
  ],
};

let TEMPLATES = null;
function templates() {
  if (TEMPLATES) return TEMPLATES;
  TEMPLATES = [];
  for (const [tag, list] of Object.entries(BANK)) {
    list.forEach((t, i) => {
      const [text, need] = Array.isArray(t) ? t : [t, null];
      TEMPLATES.push({ id: `${tag}-${i + 1}`, tag, text, need });
    });
  }
  return TEMPLATES;
}
export const templateCount = () => templates().length + Object.values(SERIES).flat().length;
export const allTemplates = () => [
  ...templates(),
  ...Object.entries(SERIES).flatMap(([k, list]) => list.map((text, i) => ({ id: `series-${k}-${i + 1}`, tag: `series-${k}`, text }))),
];

// ---------- Phrases ----------
const OFF_NOUN = { 'pace-space': 'spacing attack', motion: 'motion offense', 'post-up': 'post game', isolation: 'iso attack', 'pick-roll': 'pick-and-roll' };
const DEF_NOUN = { man: 'man-to-man', switch: 'switching D', zone: 'zone', 'pack-paint': 'paint wall', press: 'full-court press' };
const TEMPO_ADJ = { slow: 'slow-it-down', balanced: 'back-and-forth', fast: 'breakneck' };
const ADJ_PHRASE = {
  offense: { 'pace-space': 'pace-and-space', motion: 'motion offense', 'post-up': 'post-ups', isolation: 'isolation ball', 'pick-roll': 'the pick-and-roll' },
  defense: { man: 'straight man-to-man', switch: 'switching everything', zone: 'a zone', 'pack-paint': 'packing the paint', press: 'the full-court press' },
  tempo: { slow: 'a slower pace', balanced: 'a balanced pace', fast: 'pushing the pace' },
  rotation: { starters: 'riding the starters', balanced: 'a balanced rotation', deep: 'the deep bench' },
};
const ERA_TXT = { '80s': "'80s", '90s': "'90s", '00s': "'00s", '10s': "'10s", '20s': "'20s" };

function lastName(n) {
  const p = n.split(' ');
  return p.length > 1 && /^(Jr\.|Sr\.|II|III)$/.test(p.at(-1)) ? p.at(-2) : p.at(-1);
}
const teamName = (n) => (n === 'You' ? 'you' : n);
const poss = (n) => (n === 'You' ? 'your' : /s$/i.test(n) ? `${n}’` : `${n}’s`);
const findCard = (team, id) => [...Object.values(team.starters), ...team.bench].find((c) => c.id === id);

/** Capitalize the start of each sentence (handles lowercase "you"/"your" team names). */
function sentenceCase(s) {
  return s.replace(/(^|[.!?:]\s+)([a-z])/g, (m, pre, ch) => pre + ch.toUpperCase());
}
function fill(text, vals) {
  return sentenceCase(text.replace(/\{(\w+)\}/g, (m, k) => (k in vals ? String(vals[k]) : m)));
}

// ---------- Context values ----------
export function recapValues(game, ctx) {
  const w = game.winner, l = game.loser;
  const tW = ctx.teams[w], tL = ctx.teams[l];
  const pW = game.plans[w], pL = game.plans[l];
  const wTop = game.top[w], lTop = game.top[l];
  const bench = [...game.box[w]].filter((p) => p.bench).sort((a, b) => b.pts - a.pts)[0];
  const cum = (i) => game.quarters.slice(0, i + 1).reduce((s, q) => [s[0] + q[0], s[1] + q[1]], [0, 0]);
  let trail = 0;
  for (let i = 0; i < Math.min(3, game.quarters.length); i++) {
    const [a, b] = cum(i);
    trail = Math.max(trail, w === 'A' ? b - a : a - b);
  }
  const k = w === 'A' ? 0 : 1;
  const q4 = game.quarters[3];
  // Winner's adjustment (vs the previous game's plan)
  let adj = 'a new game plan';
  if (ctx.prevPlans) {
    const lever = LEVERS.find((lv) => pW[lv] !== ctx.prevPlans[w][lv]);
    if (lever === 'primary') adj = `${findCard(tW, pW.primary)?.name ?? 'a new go-to guy'} as the closer`;
    else if (lever === 'stopper') adj = `${findCard(tW, pW.stopper)?.name ?? 'a new stopper'} on defense`;
    else if (lever) adj = ADJ_PHRASE[lever][pW[lever]];
  }
  const sw = game.seriesAfter[w], sl = game.seriesAfter[l];
  return {
    W: teamName(ctx.names[w]), L: teamName(ctx.names[l]), Wp: poss(ctx.names[w]), Lp: poss(ctx.names[l]),
    ws: game.score[w], ls: game.score[l], margin: game.margin, n: game.n, prevN: game.n - 1, era: ERA_TXT[ctx.era],
    wTop: wTop.name, wTopL: lastName(wTop.name), wPts: wTop.pts, wReb: wTop.reb, wAst: wTop.ast, wTopEra: ERA_TXT[wTop.era],
    lTop: lTop.name, lTopL: lastName(lTop.name), lPts: lTop.pts, lReb: lTop.reb, lAst: lTop.ast, lTopEra: ERA_TXT[lTop.era],
    wBench: bench?.name ?? wTop.name, wBenchPts: bench?.pts ?? 0,
    wPrim: findCard(tW, pW.primary)?.name ?? wTop.name, lPrim: findCard(tL, pL.primary)?.name ?? lTop.name,
    wStop: findCard(tW, pW.stopper)?.name ?? 'the defense', lStop: findCard(tL, pL.stopper)?.name ?? 'the defense',
    wOff: OFF_NOUN[pW.offense], lOff: OFF_NOUN[pL.offense], wDef: DEF_NOUN[pW.defense], lDef: DEF_NOUN[pL.defense],
    wTempo: TEMPO_ADJ[pW.tempo], adj, trail,
    q4w: q4[k], q4l: q4[1 - k],
    otText: game.ot >= 3 ? 'triple overtime' : game.ot === 2 ? 'double overtime' : 'overtime',
    duelSum: wTop.pts + lTop.pts, sw, sl,
  };
}

// ---------- Selection ----------
const PRIORITY = ['adjustment-paid-off', 'ot', 'buzzer-beater', 'comeback', 'star-duel', 'era-clash', 'bench-game', 'blowout', 'shootout', 'defensive-grind', 'close-win', 'solid-win'];

function pickFrom(list, used, rng) {
  const open = list.filter((t) => !used.has(t.id));
  if (!open.length) return null;
  return open[Math.floor(rng() * open.length)];
}

export function recapFor(game, ctx, used = new Set()) {
  const rng = makeRng(`${game.seed}|recap`);
  const vals = recapValues(game, ctx);
  const tags = new Set(game.tags);
  tags.add(game.margin >= 10 ? 'solid-win' : 'close-win'); // always have a fallback pool
  const order = PRIORITY.filter((t) => tags.has(t));
  const ok = (t) => !t.need || (t.need === 'bench' && vals.wBenchPts >= 10);

  // Weighted choice among the game's tags (top tag most likely) so recaps vary
  const weights = order.map((_, i) => Math.max(1, 4 - i));
  let chosen = null;
  const tried = new Set();
  while (!chosen && tried.size < order.length) {
    let r = rng() * weights.reduce((s, x, i) => s + (tried.has(order[i]) ? 0 : x), 0);
    let tag = order.find((t, i) => !tried.has(t) && (r -= weights[i]) < 0) ?? order.find((t) => !tried.has(t));
    tried.add(tag);
    chosen = pickFrom(templates().filter((t) => t.tag === tag && ok(t)), used, rng);
  }
  chosen ??= pickFrom(templates().filter(ok), used, rng) ?? templates()[0];
  used.add(chosen.id);

  // Series line
  let line2 = '';
  const { sw, sl } = vals;
  const kind = sw === 4 ? 'clinch' : sw === 3 && sl === 3 ? 'game7' : sw === sl ? 'tied' : sw === 3 ? 'matchPoint' : null;
  if (kind) {
    const list = SERIES[kind].map((text, i) => ({ id: `series-${kind}-${i + 1}`, text }));
    const t = pickFrom(list, used, rng) ?? list[0];
    used.add(t.id);
    line2 = fill(t.text, vals);
  }

  return { id: chosen.id, line: fill(chosen.text, vals), line2, pbp: playByPlay(game, ctx, vals, rng) };
}

// ---------- Quarter-by-quarter play-by-play (close games only) ----------
const PBP = {
  grow: ['{T} stretched the lead behind {P}.', '{P} got going and {T} pulled ahead.', '{T} went on a run, sparked by {P}.', '{P} took over the quarter for {T}.'],
  flip: ['{T} grabbed the lead as {P} heated up.', 'Momentum swing: {P} put {T} in front.', '{P} flipped the game for {T}.', 'Lead change! {T} on top behind {P}.'],
  shrink: ['{T} clawed back behind {P}.', '{P} kept {T} within reach.', '{T} chipped away, {P} leading the push.', '{P} answered every punch for {T}.'],
  tied: ['All square. {P} and {P2} traded haymakers.', 'Nobody blinked. Dead even.', 'A seesaw stretch left it tied.', '{P} and {P2} went bucket for bucket.'],
  hold: ['{T} held serve behind {P}.', '{P} kept {T} in front.', 'Same margin, more intensity. {P} steady for {T}.'],
  open: ['{T} jumped out early behind {P}.', '{P} came out firing for {T}.', '{T} landed the first punch, {P} setting the tone.', 'Fast start for {T}: {P} couldn’t miss.'],
  openTied: ['Feeling-out quarter, all even.', '{P} and {P2} traded early buckets. Tied.'],
  toOT: ['Tied at the end of regulation! {P} forced overtime.', '{P} sent it to overtime with a late bucket.', 'Forty-eight minutes, no winner. Overtime.'],
};
const FINALE = {
  'buzzer-beater': ['{PR} with the game-winner in the final seconds.', '{PR} rose up at the horn. Good!', 'Final possession: {PR}, ballgame.'],
  ot: ['{PR} owned the extra period.', '{T} pulled away in the extra session.', '{PR} hit the shot that broke it open.'],
  default: ['{PR} iced it at the line.', '{PR} hit the dagger with a minute left.', '{STOP} got the stop that sealed it.', '{T} closed on a run, {PR} leading the way.'],
};

function playByPlay(game, ctx, vals, rng) {
  if (!(game.ot || game.margin <= 6)) return [];
  const names = { A: ctx.names.A, B: ctx.names.B };         // score labels
  const tn = { A: teamName(ctx.names.A), B: teamName(ctx.names.B) }; // inside sentences
  const topPlayers = (side) => [...game.box[side]].sort((a, b) => b.pts - a.pts).slice(0, 3);
  const pickP = (side, not) => {
    const opts = topPlayers(side).filter((p) => p.name !== not);
    return lastName(opts[Math.floor(rng() * opts.length)].name);
  };
  const choose = (list) => list[Math.floor(rng() * list.length)];
  const lines = [];
  let a = 0, b = 0, prevLead = 0;
  game.quarters.forEach((q, i) => {
    a += q[0]; b += q[1];
    const lead = a - b;
    const label = i < 4 ? `Q${i + 1}` : game.ot > 1 ? `OT${i - 3}` : 'OT';
    const isLast = i === game.quarters.length - 1;
    const leader = lead > 0 ? 'A' : lead < 0 ? 'B' : null;
    let text;
    if (isLast) {
      const pool = game.tags.includes('buzzer-beater') ? FINALE['buzzer-beater'] : game.ot ? FINALE.ot : FINALE.default;
      text = choose(pool).replace('{PR}', lastName(vals.wPrim)).replace('{STOP}', lastName(vals.wStop)).replace('{T}', tn[game.winner]);
    } else if (!leader) {
      // Tied after a period: end of regulation in an OT game, the opening quarter, or mid-game
      const kind = game.ot && i === 3 ? 'toOT' : i >= 4 ? 'toOT' : i === 0 ? 'openTied' : 'tied';
      const forcer = prevLead > 0 ? 'B' : 'A'; // the team that was behind tied it
      text = choose(PBP[kind]).replace('{P}', pickP(kind === 'toOT' ? forcer : 'A')).replace('{P2}', pickP('B'));
    } else {
      const trailer = leader === 'A' ? 'B' : 'A';
      const kind = i === 0 ? 'open' : Math.sign(prevLead) !== Math.sign(lead) ? 'flip' : Math.abs(lead) > Math.abs(prevLead) ? 'grow' : Math.abs(lead) < Math.abs(prevLead) ? 'shrink' : 'hold';
      const side = kind === 'shrink' ? trailer : leader;
      text = choose(PBP[kind]).replace('{T}', tn[side]).replace('{P}', pickP(side));
    }
    lines.push(`${label} · ${names.A} ${a}, ${names.B} ${b} — ${sentenceCase(text)}`);
    prevLead = lead;
  });
  return lines;
}
