# Map scale and progression evaluation

Implementation update: the proposal below is retained as historical evaluation. Research chains, city specialization, farm upgrades, roads, veterans, occupation, AI support and migration are now implemented. See [current rules and verification](PROGRESSION_RELEASE.md), which supersedes the “not yet implemented” sections below.

Date: 2026-09-11. Based on the actual rules and 100 generated seeds per map size. This is a design/code evaluation, not a human playtest.

## Map verdict: expand the default, keep a quick mode

| Measure                         | Previous quick map | New expedition map |
| ------------------------------- | -----------------: | -----------------: |
| Dimensions                      |              11×11 |              17×17 |
| Total tiles                     |                121 |                289 |
| Interior before obstacles       |                 81 |                225 |
| Mean walkable tiles, seeds 0–99 |              71.32 |             197.78 |
| Walkable range                  |              65–77 |            183–213 |
| Neutral settlements             |                  4 |                  8 |
| Capital Manhattan separation    |                 10 |                 18 |
| Round limit                     |                 30 |                 40 |
| Beacons                         |                  3 |                  3 |

The default now offers 2.39× total tiles and about 2.77× walkable area. The previous map had little room between the start, villages and central contest, so economic development quickly overlapped with immediate warfare. A 17×17 map permits additional settlements and longer fronts while remaining small enough for browser rendering. Retaining three beacons avoids doubling the renown generation rate merely because the board grew.

The camera fits the selected board size; zoom remains available for detailed play. Percentage explored uses the actual tile count. All movement, symmetry, save bounds, round limits and exported coordinates depend on map size. Existing 11×11 saves stay intact; choose New island to use the larger map. Quick skirmish remains selectable.

Map tests verify symmetric terrain and connected objectives across 100 seeds for each size, correct adjacency at row boundaries, both round limits and backward-compatible saves. Forty unattended matches per size test AI termination. They do not establish balance against active human players.

## Progression verdict: currently too shallow

| System         | Current behavior                                                               | Consequence                                                                                        |
| -------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Research       | Archery, Trailcraft and Masonry; all independent                               | No prerequisites, tiers, investment horizon or mutually competing development routes               |
| Units          | Three unit types; no experience, promotion or upgrading                        | Early units do not develop and late turns reuse the same choices                                   |
| Cities         | Two level upgrades, both +1 income at 6 stars                                  | Higher level has no new buildings, territory radius, recruitment or distinct visual identity       |
| Tile buildings | One estate improvement for +1 income                                           | No farm/mine/workshop choice, resource dependency, adjacency or upgrade chain                      |
| Capture        | Enter an empty city to instantly transfer ownership; capital capture ends game | No occupation phase, recovery window, siege preparation or capture of individual estates           |
| Territory      | Only neighbors of captured cities transfer; terrain elsewhere does not         | Can leave disconnected ownership; adjacent city claims lack an explicit territory assignment model |
| AI economy     | Research two upgrades, recruit, sometimes build estate                         | AI never grows cities or researches Masonry; future systems must be taught to AI as well           |

These are prototype limitations, not incorrect implementations of Polytopia. Adding map area alone does not solve them. The next release should add a modest connected progression tree rather than a long list of unrelated buttons.

## Proposed research chains (not yet implemented)

| Branch         | Tier I                      | Tier II (requires I)                     | Tier III (requires II)                     |
| -------------- | --------------------------- | ---------------------------------------- | ------------------------------------------ |
| Economy        | Agriculture: farms on grass | Irrigation: farm upgrades                | Commerce: markets and nearby estate bonus  |
| Military       | Archery: archers            | Training: barracks and veteran upgrades  | Tactics: unit specialization choice        |
| Infrastructure | Masonry: city protection    | Engineering: workshops and city tier III | Logistics: road network and movement bonus |

Keep Trailcraft as an early exploration purchase outside those three chains. Suggested initial prices are 6/10/16 stars per tier, subject to simulation and playtesting. Each unlock must name its prerequisite, price and immediate effect. Existing research remains usable until a versioned migration changes its definition. Do not replace a learned technology with a weaker effect on load.

Unit development proposal: award experience for surviving combat and taking objectives; two experience thresholds unlock a paid veteran promotion. At a friendly barracks, choose mobility or resilience, never both. Preserve damage percentage across an upgrade to avoid a free full heal. Require unused actions and consume the unit's turn. All combat previews must include promotion modifiers.

## Proposed building chain (not yet implemented)

1. Village level I: basic recruitment, radius-one territory, baseline income.
2. Town level II: spend 6 stars and own two developed tiles; choose Market (+2 city income) or Barracks (veteran training). One specialization per city creates an actual choice.
3. Stronghold level III: Engineering plus level II, spend 12 stars; choose Walls (defense) or Workshop (advanced recruitment). Make the new roof/tower visible on the 3D board.
4. Estate chain: Agriculture enables Farm I (+1); Irrigation enables Farm II (+2 total, not +2 extra). Forests instead support Lumber Camps after Engineering. Avoid permanent resource exhaustion until a regeneration policy exists.

Each action needs an explicit disabled reason and an income/defense preview. Building slots, prerequisites and ownership belong in the game state, not renderer labels. City development should expand legal territory using a deterministic assignment rule that cannot steal another owned city or beacon.

## Proposed occupation rules (not yet implemented)

- Neutral villages remain immediate capture for fast exploration.
- Enemy cities require a surviving occupier through one defender turn. Contested cities suspend recruitment and income for the former owner. The attacker gains nothing until occupation completes.
- Enemy capital victory happens after occupation completes, allowing a counterattack.
- Adjacent estates transfer with the city according to recorded city-territory assignment. Define this assignment explicitly to avoid transferring another city's economy.
- Occupation cancels if the unit leaves or dies. A unit should not heal/recruit/upgrade while occupying. The UI shows who occupies the city and when control changes.
- Siege/raze mechanics are deferred: occupation with a counterplay window is enough for the first iteration.

## Logic review and suggested implementation order

1. Version the save schema and write migrations before changing learned technology or buildings. Reject cycles in prerequisite graphs and test every reachable unlock.
2. Add a building registry and per-city territory IDs. Test that overlapping claims never duplicate income or steal objective ownership.
3. Implement economy/infrastructure research and level-II specialization, with matching AI purchase priorities and visible 3D upgrades.
4. Add occupation as an explicit pending record with owner, unit, tile and completion turn. Test cancellation, counterattack, final-round resolution and both factions' timing.
5. Add veteran promotions after the economy and occupation loops are stable. Avoid duplicating derived stats between previews, saves and execution.
6. Run mirror matches with both factions controlled by the same AI. Track victory path, game length, first-player advantage, city-level distribution, research picks and unit survival. Tune before adding naval combat or more factions.

Suggested human acceptance goals: at least two viable opening research paths; meaningful city specialization before the match ends; contested-city counterplay that is understandable without reading source; no forced expansion purchase to escape a dead end; map readable on a phone at normal zoom. These are goals, not measured outcomes.

## Changes implemented in this revision

Only map scaling, map selection, camera fitting, map-dependent turn limit and compatibility/testing changes are implemented. Research chains, specialized building upgrades, promotions and delayed occupation above are concrete recommendations awaiting the next implementation pass. The current game retains its original research and instant-capture rules.
