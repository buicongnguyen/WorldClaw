# The Broken Meridian — story-led gameplay expansion

## Evaluation before implementation

This is a self-review of the shipped game and its regression evidence, not an independent review or a claim that automated wins measure fun. The preceding army release provides 11 playable roles, nine identities, 297 modular appearance combinations, 69 rules/asset tests and 19 browser tests. Its 432-match simulation averaged 10.4 rounds, with Canopy winning 74/96 and Ember 21/96. Those numbers identify pacing and balance risks, not their full causes.

| Problem                                                 | Consequence                                           | Implemented improvement planned for this release                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Unattended beacons generate renown immediately          | Fast scouts snowball; advanced assets see little play | Optional story rules require recovering fragments and restoring a beacon before it scores                                         |
| Exploration mainly reveals generic land                 | Little discovery or narrative memory                  | Four land archives and two sea wrecks, mirrored and deterministically placed; one-time investigations with three reward choices   |
| Naval assets are peripheral on a land-heavy map         | Ships lack a non-combat purpose                       | Recoverable coastal wrecks accessible to ships and embarked armies; a sea-oriented council branch                                 |
| Units can move/attack/rest but cannot prepare a defense | Holding a chokepoint feels passive                    | Explicit Guard action: consume an unused turn for +1 protection until that owner's next turn                                      |
| More techs and models do not create a story             | Factions are primarily stat bundles                   | Original premise, nine motivations, three council chapters with mutually exclusive resolutions and a choice-aware epilogue        |
| A single log line hides what happened                   | Decisions have little continuity                      | Persistent story choices and discoveries, with a readable council journal and full existing event log                             |
| Legacy rules and saved games already exist              | A redesign could break active matches                 | Story mode is opt-in at the engine level, enabled for fresh UI games, and selectable when restarting; old saves remain skirmishes |

## Story: the Broken Meridian

For nine generations, the Meridian held the seasons in conversation. Its beacons did not create rain, thaw or sunlight: they carried agreements between peoples who knew how to live with them. The Canopy tended watersheds, the Sunstriders carried seed through drought, the Frostborn preserved it through winter. The other six peoples maintained the roads, furnaces, tide-gates and observatories that made those exchanges possible.

Then came the Night of Glass. Every beacon flared at once. Summer froze beside burning fields; the sea abandoned one harbor and swallowed another. The old council vanished. Each tribe inherited a fragment of its records and a different accusation. The Verdant Reach, thought lost, has risen from the tide with three surviving beacons. Two expeditions reach it before the others.

You command one expedition. Your rival is not an evil race: it is another community frightened that whoever holds the Meridian will decide who receives the next spring. Your archivist, **Mara Venn**, urges you to recover the agreements before restarting the machine. Your quartermaster, **Captain Ilyan**, warns that hungry people cannot wait for perfect history. The recovered records reveal that the old council deliberately severed the network to prevent one ruler from controlling all nine climates. Its final instruction is unfinished: “Let no crown outlive the hands that carry it.”

The three chapters ask questions through play:

1. **A fire to gather around.** Establish reliable food production, or recover the first surviving archive. Do you lead with shelter or knowledge?
2. **The distance between us.** Develop a realm of settlements, or reopen the sea route and recover a wreck. Do you build safety inward or trust outward?
3. **Who carries the dawn?** Hold restored beacons and recover their agreements, or build the institutions and skills to guard them. Authority must be earned, not inherited.

Victory remains readable: lead at the renown target after a full round, hold a captured enemy capital through its defender's response, or prevail at the round limit. Council choices shape rewards and the ending; they do not promise diplomacy systems that are absent. A conquest ending acknowledges the cost of imposing unity. A renown ending describes stewardship. A defeat records the people and knowledge saved, not just a red “lose” screen.

### Nine points of view

| People              | What they need                                          | What they fear                                        |
| ------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Canopy Covenant     | Repair the watershed and keep the living archive        | A machine replacing local knowledge                   |
| Ember Court         | Vindicate the keepers blamed for the Night of Glass     | Their last libraries being burned as punishment       |
| Stoneward Clans     | Rebuild safe foundations and accountable institutions   | Another promise collapsing on ordinary families       |
| Tidewell League     | Restore exchange of grain, tools and medicines          | Permanent blockades disguised as security             |
| Sunstrider / Desert | Keep migration routes and seed stores open              | A settled court deciding whose oasis survives         |
| Frostborn / Ice     | Bring home those stranded beyond the thaw               | Restoration erasing the knowledge that sustained them |
| Ashen / Fire        | Reclaim furnaces that can make tools instead of weapons | Being valued only when war needs them                 |
| Reefwalker / Water  | Recover drowned names and reopen the coast              | The sea becoming another ruler's border               |
| Skypeak / Mountain  | Preserve the observatories and warning network          | Lowland rulers refusing to hear the next warning      |

## Exact gameplay design

### Discoveries

- Six canonical sites per story map: two rotationally mirrored pairs of land archives, one mirrored pair of coastal wrecks. Land placement uses reachable ground, excludes cities/beacons, and reserves sites from building until resolved. Existing terrain and objective positions never change.
- Select your unit standing on a known, unresolved site. Investigate requires a fully unused unit and consumes movement and attack. Sites resolve once globally, even after save/reload or enemy arrival.
- Every recovery yields one Meridian fragment and 1 XP. Choose Supplies (+6 stars), Records (+4 insight), or Charts (reveal within four tiles). The archived narrative and choice remain in the journal. All choices, prices and consequences are shown before confirmation.
- Wreck recovery requires Sailing's salvage equipment for every tribe, including native water-crossing armies. Native movement does not itself confer underwater recovery knowledge.
- Insight is a finite research discount: spend up to four points per research purchase, never lower a price below one star, apply native climate discounts first. Previews and commands share the same calculation. Invalid/duplicate research never consumes insight.

### Beacon restoration

- Skirmishes keep automatic beacon scoring. Story beacons begin dormant.
- An unused unit on an owned dormant beacon can restore it for 4 stars and one recovered fragment, after Masonry. This consumes its turn and grants 2 XP.
- Restoration is permanent and public once its tile is charted. Capturing a restored beacon changes who earns its future renown; it does not create another fragment or restore reward. Both sides score only after the full round.
- Restoration is a preparation cost and a contested strategic investment, not an immunity or an instant victory. Capital and round-limit victories remain available if relic access is denied.

### Council journal

Three sequential chapters, each with two resolutions. Only one choice per chapter, one reward per choice. A choice is available only if its concrete current-state requirements are met; rewards cannot retroactively satisfy their own gate.

| Chapter | Resolution              | Gate                                                   | One-time reward      |
| ------- | ----------------------- | ------------------------------------------------------ | -------------------- |
| I       | Bread before crowns     | Own two improved tiles                                 | 10 stars             |
| I       | Read the drowned        | Recover one site                                       | 6 stars + 2 insight  |
| II      | A harbor for every home | Own two cities, including a level-II city              | 12 stars             |
| II      | No sea is a border      | Own a naval unit and recover a wreck                   | 10 stars + 4 insight |
| III     | The open covenant       | Own two restored beacons and recover two sites         | 6 renown             |
| III     | Keepers, not kings      | Know Engineering and Tactics; own three improved tiles | 4 renown + 12 stars  |

No reward is paid by rendering, loading, inspecting, or checking a condition. AI uses the same commands and gates. Council renown is evaluated for victory at the normal full-round checkpoint, never at a privileged half-turn.

### Guard and AI review

Guard grants +1 defense to any unit for the remainder of the current round cycle, including enemy attacks; it clears when that owner next begins a turn. It cannot follow movement, attack, rest, recruitment, investigation or restoration. It cannot be stacked by repeated commands. A fully unused gunship may Guard to prepare defensive fire; a spent gunship cannot use Guard to revive its cannons. AI should investigate before leaving a site, restore before leaving a dormant beacon, pursue unresolved known sites when it lacks fragments, use sea wrecks as naval goals, claim council rewards, and guard a held beacon when wandering has no useful purpose. Capital-defense assignments take priority over discovery detours for non-scout troops.

## Asset and presentation plan

Build a small **actual Blender** story pack rather than decorative screenshots: a fractured observatory/archive with an armillary instrument, a splintered wreck with recoverable cargo, and a dormant beacon. Use the existing lit beacon as the restored state. Preserve both army and environment sources. Export centered, named meshes with embedded PBR textures; save editable `art/chronicle.blend` and a studio contact sheet. Budget the new GLB below 4 MiB.

Render sites only on charted tiles, suppress conflicting vegetation on unresolved sites, and show exhausted remains after recovery. Show dormant/restored beacon labels, a guarded-unit marker, fragment/insight counts, chapter progress, discovery coordinates and exact action costs. The council is available from the realm panel, with no unsolicited modal blocking an existing game. Add a brief non-modal fresh-game story hook and a choice-aware results screen. Preserve keyboard play, mobile scrolling and fallback rendering.

## Implementation sequence and acceptance

1. Add pure story/site registries, canonical placement, requirements, reward definitions, lore and epilogues.
2. Integrate optional campaign state, guarded units, investigation, restoration, research discounts, council choices, scoring and strict save validation.
3. Upgrade AI intent for story objectives using the same legal command layer.
4. Generate and inspect Blender story props; integrate them without leaking hidden discoveries in the map, journal or GLB.
5. Add council UI, context-sensitive actions, new-game option, resource counters and ending.
6. Test both old and new rules: symmetry/reachability, one-time rewards, action exhaustion, discount accounting, restoration capture, half-turn timing, guard expiry, malformed saves, faction matchups, missing assets, mobile and export.
7. Run self code/logic review, local tests/build and comparative simulations. Record the actual results and remaining limitations rather than claim competitive parity or AAA production quality.
8. Commit and push through the configured SSH origin, wait for GitHub's test-and-deploy gate, then verify the live Pages release.

## Boundary of this release

“AAA-level interest” is a design aspiration: coherent stakes, consequential choices, readable counterplay, discovery and polished feedback. This release does not claim a professionally written multi-hour campaign, cinematic acting, animated AAA characters, multiplayer or proven human-playtest engagement. Those require separate authoring, animation, accessibility/device testing and player research. Future passes should add archipelago maps, stronger AI policies, authored combat motion/audio, and human-tested balance after this smaller story loop works end to end.

## Implementation and self-review findings

The planned story loop is implemented in `src/chronicle.js` (content and pure requirements), `src/game.js` (authoritative commands), `src/progression.js` (research accounting), `src/main.js` (council and contextual actions), and `src/world.js` / `src/art.js` (3D presentation). New browser expeditions enable story mode by default. Uncheck the option under New island for a skirmish; loading an existing save never silently adds story rules.

Review corrections made during implementation:

1. Canonical sites are generated from unchanged terrain and capital identities, not mutable ownership or improved tiles. Tests independently flood-fill the land and check mirror placement over 400 maps. Recovered sites therefore do not move after city captures or reloads.
2. Rewards are paid only in validated commands. Site ownership, council chapter order and fragment conservation prevent duplicate recovery/restoration/choice payouts. Save validation checks known choices, canonical site locations, research prerequisites, guarded-action flags and earned insight bounds.
3. Research spends insight computed **before** decrementing the balance. Native climate discounts apply first; illegal or repeated research cannot consume either currency. UI distinguishes insight spending from native discounts.
4. Story beacons score only when restored. Restoration persists through capture, costs one fragment exactly once and does not grant instant victory. Council renown follows the existing full-round victory checkpoint so the first team cannot win at a privileged half-turn.
5. Guard expires for the correct owner, cannot follow another action or stack, and preserves a ready gunship's defensive fire without letting spent guns reset. Its +1 defense is included in the same combat preview used by commands.
6. Added a universal Sailing gate for wreck salvage rather than equating native water traversal with salvage capability. Water remains strong in simulations; this is a coherent capability gate, not a claim to have solved balance.
7. Prevented story discovery goals and beacon idling from overriding a threatened capital's defensive assignments. AI and humans use the same investigation, restoration, council and research commands.
8. Fixed overlapping arch stones in the Blender archive using separated wedge geometry. Moved and scaled units beside land landmarks; scaled wreck remains away from visiting vessels. Dormant and restored beacons use visibly different meshes.
9. Hidden sites stay out of discovery-coordinate lists and exported GLB geometry. Only charted sites are presented. Public faction event reports remain part of the existing permanent-charting rules; this is not a live-fog redesign.
10. Verified story-pack download failure leaves playable fallback graphics and legal story actions. Verified the editable catalog exporter and imported the browser's story-board GLB back into Blender 4.5.9.

### Asset handoff

`art/chronicle.blend` contains the three editable centered prototypes in a display grid. `public/models/chronicle.glb` is 1,289,352 bytes (about 1.23 MiB), with 8,024 catalog triangles and packed PBR textures. The 1500×850 studio sheet is `public/art/chronicle-sites.png`. `tools/blender/build_chronicle.py` regenerates source, runtime pack and sheet; `export_chronicle.py` exports manual mesh edits without saving layout changes. The preceding environment and army binary assets are unchanged.

### Primary pacing comparison

`node tools/story-balance.mjs` compares both modes using the same updated AI, seeds 417/91/2026, both map sizes, all non-mirror faction pairs and both player positions. Each row contains 432 completed matches; each tribe appears 96 times. State validity is checked after every AI turn. Raw results are in `story-balance.json`.

| Metric                               | Skirmish | Broken Meridian |
| ------------------------------------ | -------: | --------------: |
| Mean rounds                          |    10.34 |           14.98 |
| Mean learned technologies per player |     9.15 |           13.54 |
| Matches with a naval unit            |    33.1% |           80.1% |
| Recovered sites, total               |        — |           1,729 |
| Restored beacons, total              |        — |           1,139 |
| Council resolutions, total           |        — |           1,870 |

Story wins / 96: Desert 56, Ice 43, Fire 44, Water 73, Mountain 51, Canopy 37, Ember 33, Stoneward 39, Tidewell 56. No stalled matches or draws occurred in this set. The longer development window and broader naval usage support the intended pacing change, **not** a claim that players will find the game 45% more fun or that the tribes are balanced. Water remains strongest; Ember remains weak. A separate unseen-seed check is recorded alongside this report.

### Unseen-seed check and final verification

A second run used seeds 7/53/999 without further gameplay tuning. It repeats the same 432 matches per mode, bringing the comparison to **1,728 completed matches**. Raw results are in `story-balance-holdout.json`.

| Metric                               | Skirmish | Broken Meridian |
| ------------------------------------ | -------: | --------------: |
| Mean rounds                          |    10.51 |           16.77 |
| Mean learned technologies per player |     9.23 |           14.45 |
| Matches with a naval unit            |    32.6% |           87.5% |
| Recovered sites, total               |        — |           2,086 |
| Restored beacons, total              |        — |           1,182 |
| Council resolutions, total           |        — |           2,082 |

Holdout story wins / 96: Desert 56, Ice 42, Fire 33, Water 57, Mountain 45, Canopy 62, Ember 31, Stoneward 39, Tidewell 67. All matches completed without invalid states or draws. The pacing and naval-participation findings persist, but the changing faction leaders show map sensitivity; neither experiment establishes competitive balance or human enjoyment.

Final local release gates:

- **83 rules and asset tests passed**, including 400-map discovery placement, reward accounting, guarded gunship retaliation, saved-game compatibility and all-tribe story completion.
- **24 browser tests passed**, including desktop/mobile council actions, save/reload, recovery, restoration, guard visuals, hidden-site privacy, missing-pack fallback and GLB export.
- Production build passed. Vite retains its advisory warning about the existing large Three.js bundle; it is not a runtime failure.
- A fully charted 17×17 story island rendered with **85 instance batches, 154 draw calls and 474,439 triangles**, within the tested geometry budget. This is not an FPS or low-end-device certification.
- Inspected the final Blender studio sheet and in-game archive, dormant/restored beacon, council and mobile captures. Re-exported the editable story catalog and successfully imported the browser-exported board into Blender.

### Next targeted improvements

- Human playtest both council paths with each tribe, especially Water/Ember. Record comprehension, decision time, perceived fairness and whether players use the late units; do not optimize only against this one heuristic AI.
- Test alternative AI policies before changing faction bonuses. Current AI often favors immediate supplies/records and available chapter rewards; it is not a narrative planner.
- Add coastal/archipelago scenario layouts, harbor buildings and escort objectives as an explicit new map mode, with canonical migration tests. Current wrecks create a naval purpose without pretending this is an archipelago.
- Author short attack/guard/restoration animations, sound motifs and adviser portraits. Keep reduced-motion and mute controls; do not add constant rendering solely for decoration.
- Extend the three-chapter council into authored scenarios with consequential alliances only when diplomacy, objective tracking and alternative win conditions are actually implemented.
