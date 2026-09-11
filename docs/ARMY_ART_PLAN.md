# Tribe armies: design and implementation plan

## Audit and quality target

The existing game has four humanoid models (Scout, Guardian, Archer, Sentinel). Faction cloth changes color, but silhouettes, weapons and helmets are shared. Mounted troops and dedicated naval combat units are absent; crossing water displays a simple platform.

Target: original, detailed stylized medieval/fantasy miniatures built and exported in Blender. Prioritize readable silhouettes, believable proportions, layered clothing, fitted armor, modeled weapon blades, shields, saddles, bridles, hull planks, rigging and cannons. Use packed PBR materials, smooth curved surfaces and beveled hard edges. Keep the browser's instancing/export pipeline.

This is AAA-inspired art direction, not a claim of AAA production equivalence. Hand-sculpted anatomy, production rigging/animation, authored high-to-low bakes, facial animation and platform-specific LOD chains are deferred. No image-generation mockup will substitute for the requested 3D assets.

## Tribe style matrix

| Tribe     | Silhouette / equipment                       | Palette / materials                | Naval identity                 |
| --------- | -------------------------------------------- | ---------------------------------- | ------------------------------ |
| Canopy    | Hood, leaf mantle, light shoulder armor      | Green cloth, brown leather, bronze | Branch-like prow, leaf pennant |
| Ember     | High collar, sun crest, angular helmet       | Red cloth, brass, dark steel       | Sunburst prow                  |
| Stoneward | Broad helmet, rectangular shoulder plates    | Slate cloth, steel, heavy leather  | Tower-like prow                |
| Tidewell  | Wide travel hat, rope details, split mantle  | Sea green, warm timber, brass      | Ring-and-rope ornament         |
| Desert    | Wrapped headcloth, face wrap, flowing mantle | Sand, indigo accents, bronze       | Crescent-inspired ornament     |
| Ice       | Fur collar, insulated cap, layered coat      | White/blue, pale leather, steel    | Crystal-like prow              |
| Fire      | Flared helmet and layered plates             | Charcoal, scarlet, copper          | Flame-shaped prow              |
| Water     | Fin crest, scale-shaped shoulders            | Azure, teal, pearl, silver         | Fin-shaped prow                |
| Mountain  | Ridged helmet, reinforced shoulders          | Violet, stone gray, steel          | Horned/ridged prow             |

Each tribe gets three modular equipment sets: Field, Veteran livery and Ceremonial. Rank-based appearance is the default, with an explicit cosmetic override. Actual rank indicators remain independent of the cosmetic choice. Models share attachment coordinates so all infantry and mounted riders can wear all tribe sets. Ship ornaments and owner-colored sails adapt the same identity to naval roles.

## Unit and gameplay matrix

| Role        | Visual equipment                               | Planned stats HP / attack / range / move | Cost and gate                      | Distinct rule                                                             |
| ----------- | ---------------------------------------------- | ---------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| Scout       | Knife, scabbard, light kit                     | Existing 8 / 3 / 1 / 2                   | Existing 4                         | Exploration; preserves escort rules                                       |
| Guardian    | Sword and large shield                         | Existing 12 / 5 / 1 / 1                  | Existing 5                         | Front-line defense                                                        |
| Archer      | Curved bow, string, arrows, quiver             | Existing 8 / 4 / 2 / 1                   | Existing 6, Archery                | Existing ranged skill tree                                                |
| Sentinel    | Long sword, plate armor, elite shield          | Existing 16 / 6 / 1 / 1                  | Existing 9, Engineering + Workshop | Heavy infantry                                                            |
| Spearman    | Long spear and buckler                         | 10 / 4 / 1 / 1                           | 6, Training                        | +2 attack against mounted units, including retaliation                    |
| Horse rider | Horse, saddle, bridle, rider and sword         | 12 / 4 / 1 / 3                           | 9, Riding                          | +1 attack after moving on land                                            |
| Camel rider | Camel, hump, packs, reins and spear            | 12 / 4 / 1 / 3                           | 9, Riding + Desert Farming         | +1 protection on desert ground                                            |
| Boat        | Open clinker-style hull, oars, benches         | 10 / 3 / 1 / 2                           | 6, Sailing                         | Water-only boarding/skirmishing                                           |
| Ship        | Larger hull, mast, sail, rigging, crew         | 16 / 5 / 2 / 2                           | 10, Navigation                     | Water-only ranged support                                                 |
| Gunship     | Reinforced hull, cannon barrels, gun carriages | 18 / 7 / 3 / 1                           | 15, Naval Gunnery                  | Fire or move, not both; spent guns cannot retaliate until their next turn |
| Fast cutter | Narrow hull, angled sail, lighter deck         | 10 / 3 / 2 / 4                           | 11, Navigation                     | Fast but fragile; water-only                                              |

Riding branches from Trailcraft (10 stars). Naval Gunnery branches from Navigation and also requires Engineering (16 stars). Existing game skills remain valid. Dueling/Fire melee bonuses affect land combatants, not boats; spear counters target mounts, not passengers on water. Naval units cannot move onto land, capture land cities or train at land barracks. They may attack shore targets under the existing Marines/shore-penalty rules. Recruitment launches at the nearest free water tile within three tiles of a friendly coastal city (the map's cities have grass approaches, so immediate water adjacency would leave most islands without usable harbors). No separate transport capacity system is introduced: existing land-unit embarkation remains, but displays an actual boat and passenger instead of a platform.

## Asset architecture and budgets

- Keep the existing environment pack and editable `art/kingdom.blend` unchanged.
- Add a separate deterministic Blender army generator, centered body prototypes, 27 tribal outfit modules and 27 tribal naval ornaments.
- Save editable `art/armies.blend`, runtime `public/models/armies.glb`, a manifest with triangle/bounds information, and Blender-rendered contact sheets.
- Compose body + tribe + style at runtime. This supports 189 land combinations and 108 naval combinations without duplicating complete meshes. Reuse shared geometry/materials in instanced batches.
- Budget the army GLB below 16 MiB; verify bounds, normals, texture embedding, all prototype names and missing-model fallback. Assess full-board draw calls/triangles after integration rather than silently relaxing performance tests.

## Implementation and review sequence

1. Preserve the environment generator and expose its reusable geometry/material helpers.
2. Generate detailed infantry bodies, anatomically recognizable mounts, hulls/rigging/weapons and modular tribe styles in Blender.
3. Render and inspect unit/tribe contact sheets; correct proportion, clipping and attachment problems.
4. Integrate loading, modular assembly, cosmetic selection and an in-game army guide.
5. Add mounted/naval unit registries, research gates, launch selection, terrain restrictions and AI recruitment.
6. Review derived range/damage, promotions, save compatibility, embarkation and model fallback. Test skins do not mutate stats.
7. Run rules tests, real-browser tests, build and multi-faction simulations; document remaining balance/art limits.
8. Commit and push by SSH, verify the existing Pages deployment.

## Delivered scope and how to use it

All eleven roles are recruitable; all nine tribes can learn their gates. The implementation uses shared role bodies with nine distinct headgear/mantle sets and three levels of trim/pennants. Naval identity is expressed through owner-colored sails and modular prows/pennants; tiny deck crew are shared, not eleven separately authored tribal sailors. The palette/silhouette matrix above is the art direction: currently shared bronze/steel/leather materials are combined with owner-colored cloth rather than a full set of unique tribal texture atlases. These distinctions keep the scope honest.

The in-game **Army & styles** button shows equipment, base stats, costs and gates. Field is the unranked default; rank 1 automatically receives Veteran livery and rank 2 Ceremonial livery. A player can override the style for their entire army without paying stars or receiving abilities. Earned rank markers remain separate. Three complexion variants are assigned by unit ID rather than tribe. Existing version-3 saves need no reset; older saves retain classic gameplay when migrated.

To use the new combat branches:

1. Trailcraft → Riding opens horse recruitment; Agriculture → Desert Farming plus Riding opens camels.
2. Archery → Training opens Spearmen and existing veteran training. Spears get +2 attack power against land mounts in both attacks and retaliation; they do not counter a mount's embarked passenger boat.
3. Trailcraft → Sailing opens Boats and land-unit embarkation. Navigation opens Ships and Fast cutters. Navigation **and** Engineering → Naval Gunnery opens Gunships.
4. Select a friendly coastal city and Launch. Recruitment picks the nearest unoccupied water tile within Manhattan distance 3, tie-broken symmetrically by owner. Friendly infantry may remain in the city; enemies/occupation block launches. All new recruits wait until the next turn. Move the first ship out before launching into a harbor with only one free cell.
5. Naval units use their own move allowance at one movement per water tile. Trailcraft does not give them another movement point. They cannot capture land objectives, train at land barracks or move onto land. Marines affects shoreline combat. Infantry continue automatic embarkation/disembarkation; this change does not add multi-unit transports.

## Completed code and logic review

- Fixed a real `Number(undefined)` damage bug in the mounted-target check. The final regression evaluates all 121 ordered unit matchups and validates resulting command states.
- Kept cosmetic appearance out of derived stats, costs, XP and rank. Tested all 297 role/tribe/style combinations and rejected unknown livery values.
- Separated water-only unit traversal from faction terrain access so naval units cannot walk on land, and land rules remain backward-compatible.
- Enforced all research prerequisites, star cost, launch-space occupancy and the existing ten-unit cap. Camel Riders need both research parents; Naval Gunnery needs Navigation and Engineering.
- AI ships path to water firing positions, not land-city roots. AI retains a land force, uses up to two support vessels, adds one mount and recruits a spear counter when an enemy mount is known. These are heuristics, not an optimal opponent.
- Gunships have a deliberate readiness tradeoff: firing, movement, rest or fresh recruitment leave them unable to retaliate until their next turn. UI wording now makes this explicit. Horse charge does not apply during retaliation.
- Generalized research tests to learn the prerequisite graph topologically rather than depend on registry insertion order.
- Checked all 65 prototypes, centered origins, finite bounds, normals, embedded textures, skin/cloth material hooks and GLB byte budget.
- Tested missing army-pack fallback, all-role GLB export, reload persistence, mobile dialog scrolling and real WebGL rendering. Retained the original full-island performance ceiling rather than relaxing it.
- Exported the editable army catalog using `export_armies.py`; imported the browser-exported army board back into Blender 4.5.9 successfully. Existing environment `.blend` and GLB remain unchanged.

## Verification and balance observations

Local regression result: **69 rules/asset tests and 19 browser tests passed**; production build passed. Build retains the existing large Three.js chunk warning. Asset budget: army GLB 6,357,448 bytes (about 6.1 MiB), editable `.blend` about 12 MB; 127,304 catalog triangles across 65 prototypes. Two 1800×1000 studio renders are included. Models are static meshes with textured surfaces; ship rigging means modeled ropes/masts, not animation rigs.

Measured in Chromium/SwiftShader at 1440×1000:

| Fixture                                                | Batches | Draw calls | Triangles |
| ------------------------------------------------------ | ------: | ---------: | --------: |
| Fully revealed 17×17 environment with upgraded capital |      78 |        121 |   479,448 |
| All 11 roles, Desert vs Ice, ceremonial player army    |     149 |        220 |   517,064 |

These are scene-complexity observations, not an FPS guarantee on mobile hardware. Close-up screenshots were inspected for recognizable mounts, equipment placement and naval waterline alignment; the mobile army guide remained horizontally contained.

`node tools/balance.mjs`: 432 non-mirror matches, seeds 417/91/2026, both map sizes and both player positions, 10.4 mean rounds, no stalled matches. Each tribe appeared in 96 games: Canopy 74 wins, Desert 68, Tidewell 53, Ice 48, Water 46, Stoneward 44, Mountain 40, Fire 38, Ember 21. This is **not competitive parity**. These outcomes depend on the current AI and beacon-oriented map; late naval research is underrepresented in ordinary matches, so rich late-game regression fixtures separately exercise naval and mounted forces. Avoid interpreting cosmetic variety as balance evidence.

## Next art-production and game-design passes (not implemented here)

The current deliverable is a complete playable procedural roster, not a finished AAA asset set. A higher-end production pass should proceed through these gates:

1. **Anatomy and equipment authorship:** sculpt one infantry body, one horse and one camel; approve front/side/three-quarter turntables. Improve hands/grips, seated posture, joint deformation, faces, fur, saddle fit and historically coherent weapon proportions. Build female/body-shape variants as equivalent cosmetic choices.
2. **Tribal role variants:** keep current identity modules, then author weapon-family meshes and textures for each culture: leaf/wood Canopy, sun/bronze Ember, broad forged Stoneward, rope/nautical Tidewell, wrapped/curved Desert, insulated/fur Ice, flared/blackened Fire, fin/scale Water, reinforced/ridged Mountain. Use these visual identities on every infantry, mount harness and ship crew while keeping gameplay silhouettes legible. No statistical bonuses from cosmetics.
3. **Production mesh pipeline:** retopology, non-overlapping UVs, consistent texel density, high-to-low normal/AO bakes, roughness variation, material atlases and three authored LODs. Start with approximately 12k/5k/1.5k triangles per character; validate budgets against 20 simultaneous units rather than treating those numbers as universal targets.
4. **Rigging and motion:** humanoid and quadruped skeletons; idle/walk/run/attack/hit/death clips; spear and shield grips; mount/rider synchronization; ship wake/rocking/cannon recoil. Integrate animation-aware rendering without assuming the existing static instance batches can animate skeletons automatically.
5. **Presentation:** authored faction turntables, per-unit close-up viewer, inspection lighting and clan emblems readable without color. Review every body × outfit × animation clip for clipping and camera occlusion, not just still contact sheets.
6. **Game balance:** repeat simulations with stronger/multiple AI policies and unseen seeds, then human playtests. Improve Ember's early survival and slow Canopy's beacon snowball only after isolating AI-policy effects. Add optional archipelago/coastal-objective maps before tuning fleets around land-heavy maps; evaluate capture routes, harbor access and late-game research pacing. These are follow-up design changes, not silently included map changes.
7. **Acceptance:** representative desktop/mobile GPU frame-time and memory budgets, compressed textures, reduced-motion settings, accessible team cues, animation/export regression and review of every newly authored asset before replacement.
