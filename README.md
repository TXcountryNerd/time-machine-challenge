# Time Machine Challenge

A mobile-first, head-to-head basketball draft game, and the sequel to **Time Machine Five**. Two GMs draft rival all-time rosters, with one player from each decade from the '80s to the '20s. One GM picks the Finals era, both set hidden game plans, and a simulated best-of-7 Finals decides the winner.

- Play against the CPU (Easy, Normal or Legend), or pass-and-play on one phone.
- The draft deals you a random era and position slot, then offers just 3 random players to choose from, so you might get stuck with a low-end '90s PF. You get one re-roll, one veto and one trade offer.
- Each Finals game plays out on an LED scoreboard with a recap and a full box score, and you can change one strategy lever between games.
- The rivalry record keeps an all-time head-to-head score on each phone ("Dad 7 – Son 9").
- A challenge link packs the rosters, era, plans and seed into the URL, so anyone can replay a Finals exactly or try to out-coach it.
- The player bank has 377 era cards for 233 players: All-NBA picks (1980–2026), Hall of Famers, the 75th Team, and Sixth Man and DPOY winners.

The full design is in [SPEC.md](SPEC.md).

## Play it

Live: https://txcountrynerd.github.io/time-machine-challenge/

## Run locally

The game loads `data/players.json`, so it has to be served over HTTP. Opening `index.html` straight from a file won't work.

```sh
npx serve .
```

Then open the URL it prints.

## Tests

```sh
node tests/sim.test.js
node tests/recaps.test.js
```

## Structure

| Path | Purpose |
|---|---|
| `index.html` | Entry point |
| `css/style.css` | Styles |
| `js/data.js` | Loads players.json |
| `js/sim.js` | Sim engine (pure functions) |
| `js/cpu.js` | CPU drafting and strategy |
| `js/recaps.js` | Recap template bank |
| `js/app.js` | Screens and game flow |
| `data/players.json` | Player era cards |
| `tests/sim.test.js` | Sim tuning tests (Node) |
| `tests/recaps.test.js` | Recap bank tests (Node) |
| `tools/build-players.mjs` | Rebuilds players.json from the ratings table and checks eligibility and depth |
| `tools/all-nba.mjs` | All-NBA history (Basketball-Reference) used for eligibility and rating checks |

## Releasing an update

GitHub Pages lets phones cache files for about 10 minutes. Every file reference carries a version number (`?v=6`) so players get the new code together. When you change any JS, CSS or player data, bump the number everywhere before you push:

```sh
sed -i 's/?v=6/?v=7/g' index.html js/*.js
```

## Editing player ratings

Ratings live in a readable table in `tools/build-players.mjs`, one line per card. Change a number, then run `node tools/build-players.mjs`. It rebuilds `data/players.json` and prints the depth report.

There's no build step and no framework, just plain ES modules.
