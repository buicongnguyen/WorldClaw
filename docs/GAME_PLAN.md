# Crown & Canopy — research, design and execution plan

Revision note: the shipped default has since expanded to 17×17 with eight neutral villages and 40 rounds. The original 11×11 mode remains available. [Map and progression evaluation](PROGRESSION_EVALUATION.md) records measured comparisons, reviewed proposals and which changes are implemented; the initial scope below is retained as design history.

Date: 2026-09-11. Scope: a complete small single-player browser strategy game, inspired by the clarity of Polytopia, with original geometry, names, rules and interface. No multiplayer or commercial-release claim.

## Reference study

- [Official Polytopia site](https://polytopia.io/): compact turn-based 4X, exploration, city development, technologies and tribe warfare; explicitly describes its low-poly graphics.
- [Official Switch page](https://polytopia.io/polytopia-switch/): touch and controller support, map control and technologies.
- [Publisher Steam page and screenshots](https://store.steampowered.com/app/874390/TheBattleof_Polytopia/): square-tile dioramas, orthographic/isometric presentation, distinct biome silhouettes and clear faction colors. Screenshot search also inspected Nintendo and publisher-distributed Steam images. These are references, not redistributed game assets.
- [Three.js documentation](https://threejs.org/docs/): orthographic camera, raycasting, OrbitControls and GLTFExporter for actual 3D rendering and interoperable assets.
- [GitHub Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages): static build artifact and Pages deployment.

Visual interpretation: large flat color regions make tiles legible; faceted trees and mountains give each terrain a recognizable silhouette; settlements and units are oversized relative to geography. The angled camera offers depth without requiring first-person navigation. Icons and overlays carry rules while the terrain carries atmosphere. These are design observations, not claims about proprietary implementation.

## Evaluation and improvements

Polytopia's compact decision loop is a better basis for this project than generative WorldClaw assets. A procedural game board produces predictable legal routes, asset scale and collision-free selection. Blender is an authoring tool, not a runtime dependency. WorldClaw research stays available at its current paths to preserve prior links.

Potential design problems in a game of this kind, and our responses:

| Risk                                      | Chosen response                                                                                      |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Expansion creates a runaway economic lead | A separate beacon-renown victory forces commitment to exposed central objectives                     |
| Combat rules feel hidden                  | Show exact damage and retaliation before committing an attack                                        |
| Random maps create unwinnable starts      | Rotationally symmetric land and resources; guaranteed connected cross routes and safe capital starts |
| 3D trees conceal units or tile selection  | Compact silhouettes, ring bases, billboard health labels, selected-tile glow, bounded camera pitch   |
| Long turns and unclear remaining actions  | Ready-unit count, next-unit button, one move and one attack per unit; attacking ends movement        |
| Input mistakes on touch                   | Drag threshold, distinct selection/action states and explicit command buttons                        |
| Economy can be clicked repeatedly         | One improvement per tile, authoritative cost checks, recruitment only on empty owned cities          |
| Research overwhelms a first game          | Three concrete unlocks: archers, movement, fortification                                             |

## Shippable scope and rules

- 11×11 seeded island, two equal factions (Canopy Covenant and Ember Court), four neutral villages and three beacon objectives.
- A 30-round limit. Win immediately by taking the rival capital, or reach 12 renown from beacon control. At round 30 compare renown, then cities, then remaining unit HP; exact ties draw.
- Both factions start with 12 stars, one capital and one scout. Owned cities yield 3 stars plus 1 per city level beyond one; improved land yields 1. Income arrives at the beginning of that faction's turn, never on UI refresh.
- Scout: 8 HP, 3 attack, 2 movement, cost 4. Guardian: 12 HP, 5 attack, 1 movement, cost 5. Archer: 8 HP, 4 attack, range 2, 1 movement, cost 6 and Archery research.
- Orthogonal movement with pathfinding; forests cost 2; mountains and sea block. Occupied tiles cannot be crossed. A unit moves once and attacks once; attack ends movement. Recruitment exhausts the new unit. Healing restores 4 HP and consumes the whole action.
- Melee defenders retaliate only if attacker is within their range; each attack has minimum 1 damage. Forest cover reduces incoming damage by 1; Masonry adds 1 on owned cities. All damage uses current HP and the same calculation in preview and execution.
- Empty villages change ownership when occupied. City territory is Manhattan radius 1; neutral territory can be claimed but existing enemy territory is preserved until that city is captured. Beacons are captured by occupation and remain owned until recaptured.
- Charted fog: unseen terrain is concealed. Exploration is permanent and charted tiles stay visible (deliberately simpler than live line-of-sight). Both AI and player use their own charted knowledge.
- Research: Archery 7 stars; Trailcraft 8 stars (+1 movement); Masonry 6 stars (+1 city defense). Each purchase is once per faction.
- Improve owned grass/forest for 4 stars; upgrade owned city for 6 stars, maximum level 3. Unit cap 10 per faction. No upkeep and no naval combat in this release.
- Local autosave, validated load, new seeded games, restart confirmation, help, sound toggle, keyboard next-unit/end-turn shortcuts, and GLB world export.

## Art direction

An elevated island on a deep teal sea, green polygonal forest clusters, pale limestone peaks, warm ivory towns with mint or terracotta roofs. Brass interface accents, dark ink panels and a restrained serif title. Board is primary; narrow inspector floats to the right. Header shows stars, income, round and faction. Bottom controls carry exploration, research and turn progression. Mobile reflows the inspector below the board.

Native Three.js primitives are real meshes with shared materials. Soft directional shadows and hemisphere illumination. Default orthographic diagonal view; rotate, pan, zoom and reset. Fog tiles have no hidden trees/cities/labels. The game does not fetch assets or models from external APIs.

## Architecture and execution sequence

1. Preserve research and upstream history. Replace root README with game instructions and archive links. Add docs, src, tests, tools/blender and CI.
2. Implement renderer-independent deterministic game state and command validation. IDs remain stable; invalid actions return a reason without changing state.
3. Add bounded AI turns using the same command functions and knowledge rules as the player.
4. Build 3D board, entities, health/settlement labels, movement highlights and raycast selection. UI reads state only and dispatches commands.
5. Add economy, research, combat previews, help, endgame, sound, camera controls, local save and export.
6. Add Blender GLB import helper and asset contract. Procedural runtime assets ship immediately; bespoke Blender art is future polish.
7. Test seed connectivity, symmetry, costs, action exhaustion, path blocking, combat/retaliation, capture, AI, victories and save validation. Browser smoke tests exercise canvas and UI on desktop and mobile.
8. Review code and game logic, fix findings, and record evidence in docs/REVIEW.md.
9. Create buicongnguyen/WorldClaw if absent, retain Tencent remote as upstream, push main via SSH, enable GitHub Pages Actions, verify successful deployment and live assets.

## Pre-implementation logic review

- Beacon score must be awarded once per faction turn and cannot be incremented by capture/reload. Victory check follows scoring before actions.
- A wounded attacker must not receive full-health damage; retaliation uses the defender's post-hit HP. Preview and execution share one function.
- Scouts cannot jump over water, enemy units or friendly units even if the destination is in range. Dijkstra handles forest cost.
- Neutral settlement capture gives no immediate income, avoiding capture/recruit loops. Recruitment cannot stack units or act immediately.
- Symmetric map alone is insufficient: carve all settlement/beacon routes and test connectivity across many seeds.
- AI cannot inspect uncharted enemies. It explores reachable frontier when no known objective exists, and uses deterministic tie breaks.
- A complete round includes both factions. Round-limit resolution runs after Ember finishes, so both get the same number of turns.
- Save data is untrusted local input. Validate sizes, IDs, terrain, faction values, finite numbers, technology names and non-overlapping units before use.
- Presentation never defines legal state. Hidden tile labels and GLB export must respect exploration.
- Hosted builds use relative asset URLs; no service worker to keep stale rules between deployments.

## Beyond this release

Playtest before adding naval units, factions or multiplayer. Compare beacon and conquest win frequencies, turn duration and recruitment mix over at least 20 human games. Then tune costs/renown threshold. Blender polish: authored buildings under 1,500 triangles, units under 1,000, trees under 300; one-meter logical grid and origin at foot center. Add animation only after silhouettes work at the furthest camera zoom. Multiplayer would require a separate authoritative server and is intentionally not implied by static hosting.
