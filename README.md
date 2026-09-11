# Crown & Canopy

A playable 3D island strategy game: explore the unknown, grow settlements, research new abilities, and outmaneuver a rival tribe. New games require 24 beacon renown and a lead after a full round, or completed occupation of the rival capital. Older saves retain their 12-renown target.

New expeditions use **17×17 islands**, eight neutral villages and a 40-round limit. **New island** also offers the original 11×11 / 30-round quick skirmish. Existing saves keep their original map. Connected research, specialized buildings, veterans and occupation are now implemented; see [progression rules and review](docs/PROGRESSION_RELEASE.md).

**[Play on GitHub Pages](https://buicongnguyen.github.io/WorldClaw/)**

**Branching skill map:** 25 shared skills plus nine tribe masteries connect ranged/melee combat, mounted troops, naval gunnery, sailing/navigation/Marines, interruptible road trade, and two-tier desert/ice farming. New islands offer visible climate regions and trained scout escorts for slower starting armies. See the [skill design](docs/SKILL_TREE_PLAN.md) and [latest army review and measured balance results](docs/ARMY_ART_PLAN.md).

Choose from **nine factions** in New island, including Desert, Ice, Fire, Water and Mountain tribes. Each has starting technology, a permanent trait, and an exclusive advanced research branch. Water armies can cross seas; Mountain armies can cross peaks; Ice armies unlock water crossing through research. You can also choose the AI faction. See [faction rules and save compatibility](docs/FACTIONS.md). Older saves retain their existing identities and rules.

Original low-poly meshes, names and rules inspired by compact turn-based 4X games such as The Battle of Polytopia. This is an independent single-player prototype, not affiliated with Midjiwan or Tencent.

**Tribal armies:** Eleven playable roles: knife Scout, sword-and-shield Guardian, Archer, long-sword Sentinel, Spearman, Horse rider, Camel rider, Boat, Ship, Gunship and Fast cutter. Open **Army & styles** in your realm panel for the roster, research gates, Blender review sheets and Field/Veteran/Ceremonial cosmetic choices. Nine tribes × eleven roles × three styles = 297 modular combinations, not 297 independently sculpted characters.

Visual upgrade: the 19-model environment/legacy pack plus 65 new Blender army prototypes, packed PBR materials, layered equipment, recognizable mounts, rigged sailing hulls and modeled cannons. Select a tile and use **◎** to inspect it closely. Editable source and reproduction commands are in the [Blender pipeline](docs/BLENDER.md). These are static stylized procedural miniatures, not AAA production characters. See the [army plan and review](docs/ARMY_ART_PLAN.md).

## Play

Select your scout, select a mint-outlined tile, then choose **Move** in the inspector. Neutral villages and beacons transfer immediately; enemy cities require an occupier to survive the defender's turn. Select an empty owned city to recruit. **End turn** lets the AI act and collects your next income.

Research Agriculture → Irrigation → Commerce, Archery → Training → Tactics, or Masonry → Engineering → Logistics. Trailcraft improves exploration. Build two farms in a city's territory, then choose Market or Barracks at level II; level III adds Walls or a Workshop. Workshops recruit sentinels. Combat and captures earn XP; train veterans at friendly barracks. Unavailable actions explain their requirements.

Drag the island to orbit; right-drag to pan; scroll or pinch to zoom. The tile navigator supports keyboard play. Use **?** for complete rules. Progress automatically saves on this browser/device. **New island** asks before replacing the save.

## Develop

Node.js 22+ recommended.

```sh
npm ci
npm run dev
npm test
npx playwright install chromium
npm run test:browser
npm run build
```

Production output is `dist/`. All asset paths are relative for GitHub project Pages. The game runs entirely in the browser: no account, API key, GPU model server, or paid service. A WebGL2-capable browser renders the board; the tile navigator still exposes gameplay when WebGL is unavailable. Fonts have system fallbacks.

## Project map

| Path                          | Purpose                                                                   |
| ----------------------------- | ------------------------------------------------------------------------- |
| `src/game.js`                 | Deterministic state, legal actions, combat, AI and save validation        |
| `src/world.js`                | Three.js board, models, picking, camera and GLB export                    |
| `src/main.js`                 | Interface, action dispatch, local save and optional sound                 |
| `src/style.css`               | Desktop/mobile interface                                                  |
| `tests/`                      | Rules, browser gameplay and export tests                                  |
| `tools/blender/`              | Optional Blender import helper                                            |
| `docs/GAME_PLAN.md`           | Reference study, design choices, detailed plan and pre-build logic review |
| `docs/REVIEW.md`              | Code/logic review, fixes, test evidence and limitations                   |
| `.github/workflows/pages.yml` | Test, build and GitHub Pages deployment                                   |

## Blender

**Export GLB** downloads the explored 3D board. Import into Blender through **File → Import → glTF 2.0**. See [Blender workflow](docs/BLENDER.md) for the background import helper and future authored asset guidelines. Blender is optional and does not run the game logic.

## Research archive

This repository began as a WorldClaw reproduction study. The original material is preserved and is not used by the game runtime:

- [Original upstream README](docs/research/WORLDCLAW_README.md)
- [WorldClaw reproduction plan](REPRODUCTION_PLAN.md)
- [Figure transcriptions and workflow](papers/figures/FIGURE_WORKFLOW_EXTRACTION.md)
- `papers/` and `assets/`: paper and research imagery, attributed to the original authors.

The Tencent repository is retained locally as `upstream`; this game's `origin` is `git@github.com:buicongnguyen/WorldClaw.git`. Pushes to `main` run tests and deploy to Pages. Only `dist/` is published as the website.
