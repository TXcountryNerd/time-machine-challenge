# Time Machine Challenge

A mobile-first, head-to-head basketball draft game, and the sequel to **Time Machine Five**. Two GMs draft rival all-time rosters, with one player from each decade from the '80s to the '20s. One GM picks the Finals era, both set hidden game plans, and a simulated best-of-7 Finals decides the winner.

- Play against the CPU (Easy, Normal or Legend), or pass-and-play on one phone.
- The draft deals you random era and position slots. You get one re-roll, one veto and one trade offer.
- Each Finals game plays out on an LED scoreboard with a recap, and you can change one strategy lever between games.

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

There's no build step and no framework, just plain ES modules.
