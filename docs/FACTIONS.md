# Playable factions

New island lets you choose either army independently. Matches still have two sides; four factions are available, including mirror matches. These are original cultures using the existing Blender unit models with faction-colored cloth and banners, not four separate sets of character models.

| Faction         | Starting technology / unit | Permanent trait                         | Exclusive development                                                                    |
| --------------- | -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Canopy Covenant | Trails / Scout             | Scouts reveal radius 4 instead of 3     | Archery → Training → Groveguard: +1 forest protection                                    |
| Ember Court     | Archery / Archer           | Surviving killers gain +1 extra XP      | Training → Tactics → Firecraft: archers +1 attack                                        |
| Stoneward Clans | Masonry / Guardian         | Rest +1 HP on uncontested friendly land | Engineering → Shieldwall: guardians/sentinels +1 protection on uncontested friendly land |
| Tidewell League | Agriculture / Scout        | Farm I costs 3 instead of 4             | Irrigation → Commerce → Grand Granaries: Farm II and Markets each +1 income              |

Each exclusive technology costs 12 stars, requires the indicated prerequisite, and cannot be learned by another faction. All ten common technologies remain available. Starting technology benefits apply immediately; starting stars remain 12. The AI follows faction-oriented research/recruitment priorities and uses the same rules as the player.

## Compatibility and checks

Save schema 3 records each player's faction. Schema 1/2 saves migrate to classic identities without adding technology, changing armies, or granting bonuses. Start a new island to use the new abilities. Mirror matches retain contrasting team colors.

Automated coverage includes all 16 matchups on both map sizes, starting identities, native/exclusive research gates, economy and combat bonuses, save migration and validation, plus a mobile browser selection/reload test. These checks establish rule consistency and game completion, not competitive balance. Human playtesting across seeds is still needed to tune faction strength.
