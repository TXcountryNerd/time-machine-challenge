# Time Machine Challenge — v2 Spec (v1.0, all decisions locked)

Head-to-head sequel to **Time Machine Five**. Two GMs draft rival all-time rosters, one picks the era, both coach, and a simulated 7-game Finals decides it.

---

## 1. Core Loop

1. **Mode select** — vs CPU (Easy / Normal / Legend) or vs Player (pass-and-play on one phone).
2. **Coin flip** — winner chooses: *take first pick* OR *defer* (opponent picks first; deferring GM gets era control).
3. **Draft** — strict alternating picks until each team has PG, SG, SF, PF, C + 6th Man + 7th Man (14 picks total).
4. **Era selection** — the era-control player picks the Finals decade: '80s, '90s, '00s, '10s, '20s.
5. **Game plan** — each GM sets strategy privately (hidden from opponent).
6. **Finals** — simulated best-of-7, revealed game by game.
7. **Results** — series result, Finals MVP, coach grades, rematch / swap sides.

---

## 2. Draft Mechanic

### 2.1 Pick format (LOCKED: random dealt slot)
Each turn, the game randomly deals the picker an **Era + Position slot** drawn from their *remaining* open eras and positions. The picker chooses any available player in that slot.

Example: dealt `'90s / SG` → Jordan is the ideal pick, if he's still on the board.

**Rules**
- **One era per position, one position per era:** each starting five has exactly one player from each of the 5 eras ('80s, '90s, '00s, '10s, '20s) at 5 different positions. Each GM's slots form a 5×5 grid where every row and column is used once.
- The deal only draws from combos the picker still has open, so every roster always completes legally.
- **One re-roll per GM per draft.** Re-roll redeals both era and position. You must take the new slot — no going back to the old one.
- **Player-era cards:** a multi-era player has one card per era (e.g., '00s LeBron, '10s LeBron, '20s LeBron). Drafting a card removes that card for both teams.
- **No duplicates on one roster:** a team can't hold two cards of the same player. The opponent *can* draft a different-era card of him (e.g., your '10s LeBron vs their '20s LeBron).
- **6th & 7th Man:** final two rounds, free picks: any available player, any era, any position (no deal).
- **Veto:** each GM gets ONE veto per draft to block an opponent's pick; opponent picks again from the same slot.
- **Trade:** after the draft, each GM may send ONE 1-for-1 trade offer; opponent accepts or declines. Trade must keep both rosters legal (one era per starting position).
- Draft order: **strict alternating** (1-2-1-2…).

### 2.3 Player era assignment
Each player has one or more **era cards**, each rated for that decade (e.g., '00s LeBron ≠ '20s LeBron in ratings). Card shows the era badge and era-specific rating.

### 2.4 Player bank
- Sources: Hall of Fame, NBA 75th Anniversary Team, All-NBA selections — **filtered to players who played 1980–present.**
- **Eligibility:** anyone who played in an era gets a card for that era, rated for their play in that decade (e.g., Kareem gets an '80s card; Dr. J gets an '80s card).
- Target ~250–350 era cards.
- Attributes (reuse v1 schema): `name, pos, eras[], ovr, three, def, play, inside` + new: `rebounding, clutch, durability, usage` (usage = ball-dominance, drives chemistry).
- Must have enough depth per era+position cell (min ~5) so late picks aren't dead. Flag thin cells (e.g., '20s C, '80s SG) during data build.

---

## 3. Era Control (the strategic hook)
- The GM who picks second chooses the Finals era **after the full draft** (locked).
- Era rules modify the sim (from v1):
  - **'80s** — fast pace, physical, post play, minimal 3s
  - **'90s** — slow pace, hand-checking, isolation, elite defense rewarded
  - **'00s** — post-to-perimeter transition, zone allowed, still physical
  - **'10s** — pace-and-space, switching D, 3s rising
  - **'20s** — 3PT volume, spacing, positionless, offense-favored
- Players drafted from a different era than the Finals era get an **era adaptation** modifier (shooters gain in '20s, bigs without range lose; small guards lose in '90s physicality).
- **Strategy tension:** first picker grabs the best player; era controller drafts a roster that dominates in *one* era, then picks that era.
- Because every roster has one player per era, the era pick decides **which of your five gets a home-era boost** and which players are furthest from home. Era control is about matchups, not stacking.

---

## 4. Game Plan (Coach's Whiteboard v2)
Set after era is revealed. Hidden from opponent in PvP (pass phone, cover screen).

| Lever | Options |
|---|---|
| Offense | Pace-and-space · Motion · Post-up · Isolation · Pick-and-roll |
| Defense | Man · Switch everything · Zone · Pack the paint · Full-court press |
| Tempo | Slow · Balanced · Fast |
| Rotation | Starters heavy · Balanced · Deep bench (6th/7th Man minutes) |
| **New: Primary option** | Pick the player who gets crunch-time touches |
| **New: Defensive assignment** | Put your best defender on their best scorer |

**Between-game adjustments (new):** after each Finals game, each coach can change **one** lever. Creates a real series feel — losing Game 1 means adjusting.

Grades: each call graded A–F against roster + era + opponent (v1 graded vs roster/era only; v2 adds **matchup counters**, e.g., Zone vs elite-shooting team = bad).

---

## 5. Finals Simulation
- Best-of-7, home court 2-2-1-1-1. Home court goes to higher team rating (or coin flip winner).
- Per-game score generated from: talent, era fit, chemistry, game-plan fit, matchup counters, home court, variance.
- **Variance tuned** so the better team wins the series ~75% of the time (25% upset rate); scale with rating gap — a big mismatch upsets ~10%, a near-even matchup is close to 50/50.
- Seeded RNG (seed shown on results) → reproducible results + shareable replays.
- Per game output: final score, top scorer each side, 1–2 line recap ("Shaq: 41 & 18, Pistons' zone collapsed").
- **Recap variety (required):** build recaps from a template bank, not fixed strings — 100+ templates tagged by game type (blowout, OT, buzzer-beater, comeback, defensive grind, shootout, star duel, bench game, era-clash, adjustment-paid-off), filled with real names/stats. No template repeats within a series. Add quarter-by-quarter play-by-play lines for close games.
- Series output: result (e.g., 4–2), Finals MVP, per-player series averages, coach grades, "Turning point" game.

**Reveal UX:** tap to play each game — LED scoreboard ticks up, quarter-by-quarter scores, then the recap. "Sim to end" button for impatient players.

---

## 6. CPU Opponent
- **Easy:** picks best available OVR, random era choice, default game plan.
- **Normal:** drafts for fit + era cap; picks the era that best suits its own roster.
- **Legend:** also counter-drafts (takes players you need), picks an era that hurts *your* roster, counters your game plan in adjustments.

---

## 7. Mobile UX
- Portrait-only, thumb-zone controls, single-column layout, min 44px tap targets.
- Draft board: sticky header with both rosters as mini-slot rows (PG SG SF PF C 6th); filters as chips (Era / Position).
- Player card: v1 jersey style (OVR as jersey number, position-colored stripe) + era badge.
- **Pass-and-play handoff screen:** "Pass to Player 2" full-screen blocker between hidden choices.
- Pick timer optional (30s / 60s / off).
- Visual kit from v1: hardwood headers, leather-orange buttons, LED scoreboard.
- Haptics on pick/game result (where supported).
- Single-file HTML → GitHub Pages (same deploy path as v1).

---

## 8. v2 Features (locked)
1. **Rivalry record** — local all-time head-to-head (localStorage): "Dad 7 – Son 9."
2. **Challenge link** — encode both rosters + era + plans + seed in the URL to replay or share.
3. **Draft grade** — both teams get a letter grade after the draft, *before* the era pick.
4. **Veto** — one per GM per draft (see 2.1).
5. **Trade offer** — one 1-for-1 per GM after the draft (see 2.1).
6. **7th Man round** — free pick, any era/position.
7. **Game recaps** — template bank with high variety (see 5).

**Cut / later:** classic matchup presets, 8th man.

---

## 9. Data / Tech Notes
- Stack: single-file HTML + vanilla JS or React via CDN (match v1). No backend.
- `players.json` separate during dev, inlined at build.
- Pure functions: `simGame(teamA, teamB, era, plans, seed)` → testable; write unit tests for win-rate tuning (run 10k series, check favorite win %).
- State machine: `MODE → COIN → DRAFT → ERA → PLAN → FINALS → RESULTS`.

---

## 10. Decisions Log
- Draft: random dealt era+position slot; one player per era in the starting five; strict alternating picks
- One re-roll per GM (redeals era and position; must take the new slot)
- Coin-flip winner picks first or defers for era control; era chosen after the full draft
- 6th & 7th Man: free picks, any era/position
- Multi-era players: one card per era; no player twice on one roster, but both teams can own different-era versions
- One veto and one trade offer per GM
- Hidden game plans in pass-and-play; one strategy change allowed after each game
- Upset rate ~25%, scaled by rating gap
- Eligibility: anyone who played in the era
- Name: Time Machine Challenge
