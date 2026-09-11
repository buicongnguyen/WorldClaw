# Blender asset pipeline

The game loads two original Blender packs: 19 environment/legacy prototypes in `art/kingdom.blend` → `public/models/kingdom.glb`, and 65 modular army prototypes in `art/armies.blend` → `public/models/armies.glb`. Portable Blender stays in ignored `.tooling/`, not the deployment.

## Rebuild or edit

Created and tested with Blender 4.5.9 LTS. The deterministic generator builds beveled architecture, slate roofs, timber frames, masonry towers, vegetation, rocks, crops, armored soldiers and beacons, with packed albedo/normal textures and metal/rough materials.

```sh
# Regenerate original models; replaces the generated .blend and GLB.
blender --background --python-exit-code 1 --python tools/blender/build_assets.py -- /absolute/repository/path

# Export manual edits without regenerating the source:
blender --background art/kingdom.blend --python-exit-code 1 --python tools/blender/export_assets.py -- /absolute/repository/path

# Regenerate the separate army catalog and both studio review sheets:
blender --background --python-exit-code 1 --python tools/blender/build_armies.py -- /absolute/repository/path

# Export hand-edited army geometry without regenerating/saving the source:
blender --background art/armies.blend --python-exit-code 1 --python tools/blender/export_armies.py -- /absolute/repository/path
```

The source catalog arranges models on a grid. The exporter removes layout offsets in memory and never saves those changes to the source. Keep the 19 named mesh objects; edit their geometry in Edit Mode. Their origins sit at ground center. Blender Z-up becomes glTF/Three.js Y-up. One tile is one meter. Preserve the names `Faction_cloth` and `Beacon_crystal` for runtime owner coloring.

Textures are embedded, with no CDN dependency. Materials follow Blender's [glTF PBR export](https://docs.blender.org/manual/en/3.6/addons/import_export/scene_gltf2.html). These are editable procedural assets, not hand-sculpted AAA production models.

## Modular army editing

The army catalog contains 11 `unit_<role>` bodies, 27 `outfit_<tribe>_<style>` head/shoulder/mantle modules and 27 `prow_<tribe>_<style>` naval ornaments. Preserve the names in `public/models/armies-manifest.json`. Select and edit each mesh in Edit Mode; do not move its origin or change its catalog object transform. The exporter checks names, removes catalog layout offsets in memory and refreshes bounds/triangle counts in the manifest.

Attachment coordinates are in Blender Z-up meters: ground at Z=0; infantry shoulder frame Z=0.54, head Z=0.70; mounted outfit modules shift +0.27 Z. Runtime infantry scale is 1, mounted scale 0.84 and ships 0.78. Ship ornaments share hull origins. `src/appearance.js` chooses role/tribe/style; `src/art.js` assembles them and gives embarked land armies a boat with a passenger. Mounted passengers use a human crew surrogate; their horse/camel returns visually on disembarkation. No separate cargo-capacity simulation is implied.

Preserve material names `Faction_cloth`, `Faction_sail` and `Skin`. Cloth/sails use team colors; Skin uses three deterministic complexion variants based on unit ID, independently of tribe. Metal, leather, hair, wood and mounts retain authored PBR materials. Mirror-tribe games retain contrasting team colors.

Review sheets: `public/art/unit-roster.png` and `public/art/tribe-styles.png`. Open **Army & styles** in game to view them. Sheets come from the procedural generator; exporting manual geometry edits does **not** re-render them. Regeneration also replaces manual edits, so preserve authored work on a separate branch before regenerating. For hand-edited catalogs, update renders from a separate Blender studio scene.

The browser-exported full army scene has been imported back into Blender successfully. Its hierarchy includes units, chosen outfits, ship prows and embedded textures. Current artist handoff and quality limitations are recorded in [the army plan](ARMY_ART_PLAN.md).

## Inspect and export

Select a tile and press **◎ Inspect selected tile** for a close-up. Zoom reaches 5×; **⌖ Reset camera** restores the full island.

The renderer uses tone mapping, warm light, material reflections, textured ground and shared instanced batches. The original hierarchy is retained for picking/export. Old instance buffers are disposed during rebuilds; shared mesh/texture resources remain cached. Shadows refresh when the board changes.

**Export GLB** waits for the model request and exports explored content plus fog placeholders. Hidden enemies and UI are excluded. Failed downloads keep the game playable with basic shapes and a warning.

```sh
blender --background --python-exit-code 1 --python tools/blender/import_world.py -- crown-canopy-417.glb inspected-world.blend
```

The importer refuses to overwrite an output and creates a fresh background scene. Asset edits affect visuals, not rules. Rigged animation, scanned assets and photorealistic terrain are not included.
