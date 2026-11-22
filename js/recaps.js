// Recap bank — Phase 4 replaces this stub with 100+ tagged templates.
// Interface: recapFor(game, ctx, used) -> { line, pbp: string[] }
//   ctx = { names: { A, B }, era }, used = Set of template ids already used this series.

export function recapFor(game, ctx) {
  const w = game.winner, l = game.loser;
  const t = game.top[w];
  const line = `${t.name}: ${t.pts} & ${t.reb}. ${ctx.names[w]} beat ${ctx.names[l]} ${game.score[w]}–${game.score[l]}${game.ot ? ' in OT' : ''}.`;
  return { line, pbp: [] };
}
