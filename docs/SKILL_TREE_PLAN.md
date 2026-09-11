# Branching skills: design, implementation and review

## Objective

Replace the mostly linear technology list with a visible, branching skill map. Keep stars as the shared research/building/army resource: specialization is a timing choice, not an irreversible lock. Every tribe can learn common skills; native abilities buy an early advantage rather than permanently denying other armies basic terrain access.

## Planned nodes and balance constraints

| Path       | Prerequisite → node (stars)                                       | Effect / counterplay                                                                                                                                                                  |
| ---------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ranged     | Archery → Marksmanship (10) → Longbows (16)                       | +1 archer damage at distance 2+; range 3 only before moving. After attacking, movement remains spent. Close the distance to remove the accuracy bonus.                                |
| Melee      | Training → Dueling (10) → Shield Drill (14)                       | +1 melee attack; guardians/sentinels resist 1 extra melee damage. Ranged attacks bypass Shield Drill.                                                                                 |
| Amphibious | Trailcraft → Sailing (10) → Navigation (14) → Marines (14)        | All units may enter water (2 movement); then water costs 1; then remove the -1 attack penalty when attacking across a shoreline. Native Water/Frozen Paths remain faster to unlock.   |
| Trade      | Agriculture → Barter (8) → Caravans (12), also requires Logistics | Barter: Markets +1 income. Caravans: +2 per city connected by friendly roads to another city. No pair-count multiplication. Occupation or an enemy standing on a route interrupts it. |
| Desert     | Agriculture → Desert Farming (8) → Oasis Engineering (12)         | Oasis I costs 5, yields 1; Oasis II upgrade costs 6, yields 2. Desert tribe pays 2 fewer stars for these two skills.                                                                  |
| Ice        | Agriculture → Ice Farming (8) → Greenhouses (12)                  | Ice Farm I costs 5, yields 1; Heated Greenhouse upgrade costs 6, yields 2. Ice tribe pays 2 fewer stars for these two skills.                                                         |
| Tribe      | Existing prerequisites → existing exclusive mastery               | Retain nine tribe identities and existing mastery costs. No additional free stacking bonuses.                                                                                         |

Shared research totals 23 skills plus nine tribe masteries. New advanced skills are useful choices, not mandatory prerequisites for winning. Existing farms, city upgrade chains, veterans and occupation remain intact. Range is capped at 3; damage remains at least 1. Shoreline penalties apply in both attack directions and in retaliation, not as an invisible post-move debuff. Research consumes stars exactly once, not unit actions.

## Climate implementation

Add deterministic, rotationally symmetric desert/ice climate overlays to grass tiles on new islands, without changing connected terrain topology. Keep the two-tile radius around capitals temperate to prevent starting economy lockout. Climate maps use existing paths, forest, mountain and water rules. Desert/ice ground gets distinct colors; climate farms reuse Blender farm models with small distinguishing details. Never recolor an old save into a different playable biome: missing climate flag means temperate legacy map. New island offers a climate toggle. No weather damage or starvation system in this release.

## Skill map and feedback

Group nodes into Combat, Seafaring, Economy, Climate, Infrastructure and Tribe mastery. Show each node's parent(s), cost, exact effect, and learned/available/locked state. Show current unit range and shore penalties in combat previews. Show trade income and climate in tile details. Use accessible native buttons and a responsive layout rather than requiring dragging a large graph on mobile.

## Implementation sequence

1. Centralize prerequisite lists and dynamic research costs; add branch registries.
2. Implement derived combat range/damage and shared naval traversal.
3. Implement deterministic climate overlays and farm upgrades; preserve saved maps.
4. Implement capped, interruptible road trade and faction-aware AI priorities.
5. Build the grouped skill-map UI, terrain/farm presentation and help text.
6. Test gates, invalid-save rejection, combat preview parity, movement, climate symmetry, economy/occupation and browser interactions.
7. Run deterministic AI balance diagnostics with both seat assignments. Report rather than hide substantial asymmetry; automated AI is not evidence of human competitive balance.
8. Review diff, run all rules/browser/build checks, commit over SSH and publish the existing Pages game.

## Pre-implementation logic review

- Multi-parent prerequisites must be checked by the engine, validator, UI and AI using the same helper; foreign masteries cannot bypass them.
- Derived range must be used by targeting and retaliation, not only labels. Moving suppresses range 3 before the attack button is offered.
- Trade must traverse legal friendly road networks, never water, enemy tiles, occupied territory or blocked units; each city gets at most +2 regardless of network size.
- Climate costs/yields replace earlier farm tiers rather than stacking; normal farms cannot bypass climate adaptation. Captured farms remain productive independent of the conqueror's research, but upgrading requires knowledge.
- Existing save schemas keep their terrain and faction choices. New climate fields are validated against deterministic generation, not accepted as arbitrary terrain edits.
- Avoid changing baseline starting stats during this feature release. Compare outcomes and tune explicit skills only when evidence shows a clear problem.

## Baseline balance evidence and revised starting rule

432 AI matches (seeds 417, 91, 2026; both sizes; every non-mirror matchup in both seats) averaged 9.1 rounds. Wins out of 96 appearances: Canopy 90, Desert 85, Water 72, Tide 51, Ice 39, Mountain 35, Fire 28, Stone 21, Ember 11. This is clear evidence of an early exploration-speed imbalance in this AI benchmark, not a human tier list. New islands therefore give guardian/archer-start tribes one scout escort at the capital. Scout-start tribes keep one scout. Existing saves gain no free units. The balance script will repeat the same seeds after implementation.

The shipped escort has 3 movement, with no additional Trailcraft stacking; ordinary scouts retain their original stats. New games require 24 renown instead of 12. Old saves keep their existing target (missing target means 12). A follow-up sample found 29/30 Canopy–Ember games ended through beacon scoring, supporting a pacing change. Capital capture and round limits remain alternative endings.

## Implementation review and measured result

All planned branches are implemented. The research screen uses linked prerequisite nodes grouped by branch, showing learned/available/locked states and discounted prices. Shared helpers drive command validation, save validation and displayed costs. Desert and ice ground are visible, rotationally symmetric overlays; two mirrored adaptation sites of each climate are guaranteed. Starting capital approaches remain temperate. Climate farming uses separate building tiers and reuses the Blender farm assets with pool/heating details.

Trade counts each connected city once (+2), not every possible city pair. Its path search rejects enemy units, occupation and non-land tiles. The AI now plans missing roads toward another friendly city, mixes guardians into Ember armies, seeks safe archer firing positions, responds to nearby capital threats, and can purchase early Trailcraft without an unnecessary fifth reserved star.

Same 432-match diagnostic after implementation:

| Faction  | Baseline wins / 96 | Revised wins / 96 |
| -------- | ------------------ | ----------------- |
| Canopy   | 90                 | 70                |
| Desert   | 85                 | 64                |
| Water    | 72                 | 50                |
| Tide     | 51                 | 59                |
| Ice      | 39                 | 50                |
| Mountain | 35                 | 38                |
| Fire     | 28                 | 37                |
| Stone    | 21                 | 38                |
| Ember    | 11                 | 26                |

Mean duration rose from 9.1 to 10.6 rounds. The spread narrowed materially, but Canopy/Desert remain strong and Ember remains weak in this AI benchmark. This is a first balance pass, not competitive parity. Capital rushes still shorten some games; long trade branches will not be optimal in every match. Human playtesting and additional map seeds are the next calibration step; do not simply inflate Ember damage until this one AI benchmark is even.

Automated review covers all 81 pairings on both sizes under legacy and new-map options, research DAG/multiple parents, legal learned-range attacks and retaliation, melee counterplay, shoreline penalties, actual naval moves, climate symmetry, native costs, farm replacement yields, occupied trade routes, save preservation, mobile research and real Blender rendering.

## Deferred

An independent 432-match seed set (7, 53, 999) averaged 10.8 rounds. Wins per 96 appearances: Canopy 77, Desert 50, Ice 55, Fire 47, Water 40, Mountain 50, Ember 24, Stone 45, Tide 44. This confirms the remaining Canopy/Ember imbalance and shows that Desert's strength is more map-dependent. No further changes were fitted to the holdout results. Marksmanship adds attack power before health scaling, not guaranteed flat damage for wounded archers.

Dedicated tribe character packs, seasonal weather, diplomacy/trade with enemies, naval ship unit classes, line-of-sight occlusion, and a multiplayer balance claim are outside this implementation.
