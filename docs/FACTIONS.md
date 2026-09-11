# Playable factions

New island lets you choose either army independently. Matches still have two sides; nine factions are available, including mirror matches. These are original cultures using the existing Blender unit models with faction-colored cloth and banners, not separate sets of character models. New islands now offer desert/ice climate regions with distinct farm branches. Existing meadow combat traits continue to apply to the underlying grass terrain; Desert/Ice tribes also receive a 2-star discount on each of their native farming skills. See [the branching skill plan and balance review](SKILL_TREE_PLAN.md).

| New tribe           | Start               | Native ability                    | Exclusive research (12 stars)                                          |
| ------------------- | ------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| Desert / Sunstrider | Trailcraft / Scout  | Rest +2 HP on meadows             | Training → Dune Warfare: scouts +1 attack on meadows                   |
| Ice / Frostborn     | Masonry / Guardian  | +1 protection on meadows          | Engineering → Frozen Paths: water traversal at 1 movement              |
| Fire / Ashen        | Archery / Guardian  | Full-health melee units +1 attack | Training → Rekindle: rest +2 HP                                        |
| Water / Reefwalker  | Agriculture / Scout | Water traversal at 2 movement     | Irrigation → Oceanways: water costs 1 movement; +1 protection on water |
| Mountain / Skypeak  | Masonry / Guardian  | Mountain traversal at 1 movement  | Engineering → Summit Guard: +2 protection on mountains                 |

Traversal permissions apply per army, not globally. Crossing water does not create usable ice for enemies. Units still need enough movement: Water guardians need Trailcraft or a mobility promotion before crossing a two-cost water tile, or Oceanways to reduce the cost. No tribe may build farms, roads, or cities on water or mountains. Fire's full-health bonus is re-evaluated after incoming damage for retaliation.

| Faction         | Starting technology / unit | Permanent trait                         | Exclusive development                                                                    |
| --------------- | -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Canopy Covenant | Trails / Scout             | Scouts reveal radius 4 instead of 3     | Archery → Training → Groveguard: +1 forest protection                                    |
| Ember Court     | Archery / Archer           | Surviving killers gain +1 extra XP      | Training → Tactics → Firecraft: archers +1 attack                                        |
| Stoneward Clans | Masonry / Guardian         | Rest +1 HP on uncontested friendly land | Engineering → Shieldwall: guardians/sentinels +1 protection on uncontested friendly land |
| Tidewell League | Agriculture / Scout        | Farm I costs 3 instead of 4             | Irrigation → Commerce → Grand Granaries: Farm II and Markets each +1 income              |

Each exclusive technology costs 12 stars, requires the indicated prerequisite, and cannot be learned by another faction. All 23 shared technologies remain available, including Sailing for non-native water traversal. Starting technology benefits apply immediately; starting stars remain 12. Guardian/archer-start tribes now receive a scout escort with 3 movement on new islands (Trailcraft does not stack on escorts). New games use a 24-renown target. The AI follows faction-oriented research/recruitment priorities and uses the same rules as the player.

## Compatibility and checks

Save schema 3 records each player's faction. Schema 1/2 saves migrate to classic identities without adding technology, changing armies, or granting bonuses. Start a new island to use the new abilities. Mirror matches retain contrasting team colors.

Automated coverage includes all 81 matchups on both map sizes, starting identities, native/exclusive research gates, terrain traversal and movement costs, economy and combat bonuses, save migration and validation, plus browser selection/reload tests. These checks establish rule consistency and game completion, not competitive balance. Human playtesting across seeds is still needed to tune faction strength.
