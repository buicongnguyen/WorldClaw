# Implementation and logic review

Reviewed 2026-09-11. This is a self-review with automated evidence, not an independent reviewer claim.

The main sections below preserve the original baseline review. Subsequent functionality and current verification are documented in [the army review](ARMY_ART_PLAN.md) and [the Broken Meridian story review](BROKEN_MERIDIAN_PLAN.md).

## Completed scope

The implementation sequence in GAME_PLAN.md has corresponding source, documentation and deployment configuration. Actual 3D geometry is rendered; selecting tiles dispatches validated game commands. A bounded AI uses the same economy and action checks. Both victory paths and the 30-round outcome are implemented. Autosave and charted-world GLB export work without a backend.

## Findings and fixes

| Finding                                                                                    | Resolution                                                                                                                                              |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct dictionary lookup could accept inherited names such as `toString` as unit/tech keys | Use `Object.hasOwn` before resolving command definitions; regression tests                                                                              |
| Shape-only validation allowed malformed cities and altered map fixtures in saves           | Validate null/object city types and compare static terrain/objective layout with the canonical seed; reject duplicate explored IDs and oversized armies |
| Narrow-screen camera cropped island corners                                                | Fit the orthographic frustum to both available height and width                                                                                         |
| Exporter increased initial download size                                                   | Dynamically import GLTFExporter only when Export is requested; share the Three.js vendor chunk                                                          |
| Player could not see base attack, range and movement in the inspector                      | Display unit stats, including Trailcraft movement bonus                                                                                                 |
| AI could stick behind terrain under greedy Manhattan scoring                               | Use a distance field over known passable terrain for objective/frontier movement                                                                        |
| Dead defenders might retaliate if logic was duplicated                                     | One combatPreview implementation determines both displayed prediction and executed damage, using post-hit health                                        |
| New units could act immediately or stack                                                   | Recruitment checks occupancy and unit cap, and initializes both action flags exhausted                                                                  |
| Income / renown could be awarded by UI or reloading                                        | Awards happen only in the end-turn transition; UI reads state                                                                                           |
| Hidden geometry could leak via export or labels                                            | Render/export only charted content and anonymous fog placeholders                                                                                       |
| Restart could race an AI callback                                                          | Disable new game during the AI turn and resume saved AI turns deterministically on reload                                                               |
| Tab shortcut prevented normal keyboard focus navigation                                    | Replace with N/E shortcuts; preserve Tab and native control behavior; label mobile icon buttons                                                         |
| Adjacent city and HP labels overlapped                                                     | Resolve projected label collisions, prioritizing health labels                                                                                          |
| Existing upstream repo was not owned by user                                               | Preserve Tencent as upstream and use the user's new SSH origin                                                                                          |

## Verification

- Node rules tests: deterministic generation and 100 seeds checked for rotational symmetry and objective connectivity; movement costs/blocking; action exhaustion; recruitment/costs/research; combat and retaliation; capital/beacon/round-limit outcomes; malformed saves.
- 40 unattended seeded matches: AI calls terminate, states remain valid, games reach a result. This tests liveness, not competitive balance against skilled humans.
- Playwright desktop: visible WebGL canvas, recruitment, research, movement, end turn, reload, and actual GLB download.
- Playwright mobile at 390×844: no horizontal document overflow, help, new seed and restart.
- Corrupted autosave recovery: usable new game without a crash.
- Real canvas picking and lethal combat exercised; resumed AI turn reaches beacon victory and disables the end-turn button.
- Exported GLB header, version, byte length and mesh presence checked; uncharted rival unit excluded.
- Desktop/mobile screenshots visually inspected; framing correction applied after the first capture.
- Vite production build passes. Three.js has a large vendor chunk (~181 KB gzip); this is expected for the 3D runtime, and export code is deferred.

## Remaining limits

- Gameplay balance needs human playtesting; no claim that costs, AI strength or renown pacing are optimal.
- Charted fog intentionally stays revealed; there is no live line-of-sight system. Public faction renown and event reports are visible.
- No multiplayer, in-game import-back editor or rigged character-animation system. Later releases add naval units, mounted troops, original procedural Blender assets and a story mode.
- Blender 4.5.9 is now installed locally for authoring. Army and story scenes have passed browser-export/Blender-import round trips; see the current pipeline and release reviews.
- Automated browser tests use Chromium software rendering; other GPUs, Safari and Firefox still need compatibility testing.
- Existing WorldClaw paper/assets remain research material and are not included in the deployed game bundle.

Deployment status is verified through GitHub Actions and a live Pages fetch after pushing the reviewed commit.
