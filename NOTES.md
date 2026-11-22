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
