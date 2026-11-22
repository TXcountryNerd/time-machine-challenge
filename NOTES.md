# Build notes

Running notes from build sessions (the locked design lives in [SPEC.md](SPEC.md)).

## Decisions made during the build
- **Files:** separate files with no build step (the prompt wins over the spec's "single-file HTML").
- **Draft header:** shows both bench slots (6th and 7th Man).
- **Pick timer:** 30s by default (60s and off are also options), added in Phase 3.
- **Player bank:** 225–250 players. Eligibility is All-NBA (1980–2026), the Hall of Fame or 75th Team, plus Sixth Man of the Year and Defensive Player of the Year winners, so late picks can leave you "stuck."
- **Ratings:** anchored to the Basketball-Reference All-NBA history, with judgment on top. `tools/build-players.mjs` flags outliers.

## Requests
- **Design:** make it a *super arcade* feel. Fun first, with neon glow, chunky buttons, LED scoreboard energy and punchy animations, layered on the v1 kit (hardwood, jersey cards, leather-orange buttons).
- **At the very end:** walk through everything needed to have this on GitHub (repo, Pages, git login setup).
- **Phase 5:** refine the visuals. The Phase 3 arcade pass works, but it needs another round of design polish (requested after the first phone playtest).

## Playtest feedback, round 1 (2026-11-22)
- **Rosters were too stacked.** Each pick now offers only **3 random players** (from the dealt slot, or from any era/position in the 6th/7th Man rounds). Re-roll deals a new slot and 3 new options. A veto leaves the picker their remaining options. Draft-grade cutoffs were re-measured for the new rule.
- **Wanted each player's stats after every game.** A full box score (MIN/PTS/REB/AST for all 7 players, plus team totals) now shows after each game, and every game in the results log opens to its box score.
- Rotation minutes now add up to exactly 240, and a "Deep bench" rotation no longer gives the 6th man more minutes than the starters.
