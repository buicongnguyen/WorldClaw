# Progression release — rules and review

Date: 2026-09-11. Implements the earlier progression evaluation. This remains an original single-player prototype, not Polytopia's exact mechanics.

## Research and development

| Branch         | Foundation                | Tier II                               | Tier III                                           |
| -------------- | ------------------------- | ------------------------------------- | -------------------------------------------------- |
| Economy        | Agriculture (6): Farm I   | Irrigation (10): Farm II              | Commerce (16): market/adjacent development bonuses |
| Military       | Archery (7): archers      | Training (10): barracks, veteran I    | Tactics (16): veteran II                           |
| Infrastructure | Masonry (6): city defense | Engineering (10): strongholds, lumber | Logistics (16): roads                              |

Each tier requires the preceding technology. Independent Trailcraft (8) retains +1 movement. Shared registries and action gates in `src/progression.js` keep UI requirements aligned with `src/game.js`.

- Farm I costs 4 and produces +1. Farm II costs 5 to upgrade and produces +2 **total**, not +3. Lumber camps cost 4 on forest and produce +1. Legacy estates retain +1; grass estates can upgrade through Irrigation.
- Each eligible land tile has one city-territory ID. New games use nearest-city assignment with rotationally symmetric ties. Level I claims radius one; level II expands to radius two without taking another city's assigned territory. Existing owned territory transfers with its city.
- Level II requires two developed tiles in that city's territory and 6 stars: choose Market (Agriculture, +2 city income) or Barracks (Training, veteran training).
- Level III requires Engineering, level II and 12 stars: choose Walls (+2 protection) or Workshop (sentinels). Each city upgrade retains +1 base income per level. Commerce adds +1 to markets and +1 to adjacent developed tiles, at most once per tile.
- Sentinel: 9 stars, 16 HP, 6 attack, range/movement 1. Requires Workshop and Engineering. Recruitment consumes the unit's turn; hard army limit stays 10.
- XP: +1 for surviving combat, or +3 if the opponent dies; +2 for completing a city/beacon capture. Train at an uncontested friendly Barracks with unused actions. Rank I needs 3 XP, Training, 4 stars; rank II needs 6 XP, Tactics, 7 stars. Each rank adds +1 attack and either +1 movement or +2 maximum HP. Choices cannot be combined or switched. Training consumes the turn and preserves damage percentage (HP rounds down, minimum one).
- Roads cost 2 after Logistics. Steps cost 0.5 movement only between two friendly road endpoints outside contested territory. Roads do not produce income.
- Visible 3D changes include city towers, market awnings, barracks shields, walls, workshop chimneys, upgraded farms, lumber camps, roads, veteran badges and occupation markers. They are included in explored-world GLB exports.

## Occupation and victory timing

Neutral villages and beacons transfer immediately. Entering an enemy city starts occupation, suspending city and assigned-territory income and blocking development/recruitment. The occupier cannot rest or train. Leaving or dying cancels occupation. Attacking is allowed and risks losing the occupier to retaliation.

At the end of the **defender's** next turn, surviving occupation transfers the city and its assigned owned territory. A rival capital wins only then. Completion precedes final-round scoring. A fresh occupation on the final turn is not an instant capital victory; contested cities count for neither side in city-count tie-breaks.

Beacon scoring now awards both sides together after each full round. At least 12 renown **and a lead** wins; equal totals continue. Round-limit ties use uncontested cities, then surviving HP, then draw. Capital completion precedes beacon scoring in the same transition. City/farm income still arrives once at the recipient's turn start.

## Save compatibility

Schema 2 retains the localStorage key to discover schema-1 saves. Validation precedes migration. Migration copies state, retains map size (missing means 11), currency, renown, city levels, units, learned technology and estate income, and initializes new fields. Old owned land is assigned to the closest same-owner city when possible. Existing level-II/III cities can buy missing specializations without growing again (costs 6/12). Existing renown carries forward as the opening balance under the new scoring rule.

## Code and logic review — fixes applied

| Finding                                                    | Fix and coverage                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| UI rules could drift from engine                           | Shared prerequisite/cost checks and visible disabled reasons                                                       |
| Neutral capture could claim an entire assigned region      | Radius limits for unowned land; only previously owned territory transfers wholesale                                |
| Instant capital capture had no response window             | Explicit occupation, cancellation on departure/death, defender-end completion; both factions and final-round tests |
| Promotion could grant a free heal                          | Proportional HP conversion and shared derived movement/combat stats                                                |
| Legacy city levels could lose access to specializations    | Migration and missing-specialization purchase path; rules and mobile browser coverage                              |
| Farm upgrades could stack or charge repeatedly             | Registry-derived replacement income and immutable rejected commands                                                |
| AI recruiting consumed all development funds               | Research budget, growing army target of 2–7, city upgrades, barracks routing and road construction                 |
| Low-ID tie-breaks sent both factions in the same direction | Mirrored movement, territory and purchase ordering                                                                 |
| Turn-start victory created a half-turn race                | Full-round beacon scoring; equal threshold continues                                                               |
| Territory labels could leak hidden city names              | Names stay hidden until the city is charted                                                                        |
| Research scroll could hide its close control               | Sticky close button and mobile/desktop checks                                                                      |

## Verification

- 36 rules tests: 200 seeded maps, prerequisite graph, old/new saves, city/road/promotion gates, territory symmetry, occupation, final-round timing, and both-side AI matches.
- 8 real Chromium browser tests: WebGL picking, movement, combat, recruitment, research, save/reload, GLB validation, mobile layout, city progression, veteran ranks, delayed capital capture and legacy migration.
- Reproduce the diagnostic with `node tools/balance-check.mjs 100`: 17×17 seeds 0–99, identical AI for both factions, every intermediate save validated, all games terminate.
- Final diagnostic: wins 50/50, no draws; mean 11.41 rounds; 87 beacon and 13 capital wins. Across 200 faction runs, Engineering was bought 194 times, Commerce 124, Tactics 70, Logistics 21. Final city levels: 882 level I, 89 level II, 29 level III; 16 surviving veterans.
- Before fairness corrections the same seed set split 92/8. The final 50/50 result is a deterministic regression observation, **not proof of balanced human play**.

## Remaining limitations

AI is heuristic; road layout and veteran routing remain basic. Beacon wins dominate bot matches and late infrastructure appears less often. Human playtesting should guide pacing changes rather than tuning only these seeds. No multiplayer, naval combat, depletion, siege or razing. Models are procedural low-poly meshes, not authored Blender animations.
