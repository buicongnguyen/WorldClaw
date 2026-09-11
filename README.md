# Crown & Canopy

A playable 3D island strategy game: explore the unknown, grow settlements, research new abilities, and outmaneuver the Ember Court. Win by earning 12 beacon renown or capturing the rival capital.

New expeditions use **17×17 islands**, eight neutral villages and a 40-round limit. **New island** also offers the original 11×11 / 30-round quick skirmish. Existing saves keep their original map. See the [map and progression evaluation](docs/PROGRESSION_EVALUATION.md) for measured map comparisons and proposed research, building and occupation chains.

**[Play on GitHub Pages](https://buicongnguyen.github.io/WorldClaw/)**

Original low-poly meshes, names and rules inspired by compact turn-based 4X games such as The Battle of Polytopia. This is an independent single-player prototype, not affiliated with Midjiwan or Tencent.

## Play

Select your scout, select a mint-outlined tile, then choose **Move** in the inspector. Occupy villages and beacons to claim them. Select an empty owned city to recruit. **End turn** lets the AI act and collects your next income. Research opens archers, additional movement and city protection.

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
