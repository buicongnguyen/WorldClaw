# Blender asset pipeline

The game now loads **19 original Blender-built models**. Editable source: `art/kingdom.blend`. Runtime pack: `public/models/kingdom.glb`. Portable Blender stays in ignored `.tooling/`, not the deployment.

## Rebuild or edit

Created and tested with Blender 4.5.9 LTS. The deterministic generator builds beveled architecture, slate roofs, timber frames, masonry towers, vegetation, rocks, crops, armored soldiers and beacons, with packed albedo/normal textures and metal/rough materials.

```sh
# Regenerate original models; replaces the generated .blend and GLB.
blender --background --python-exit-code 1 --python tools/blender/build_assets.py -- /absolute/repository/path

# Export manual edits without regenerating the source:
blender --background art/kingdom.blend --python-exit-code 1 --python tools/blender/export_assets.py -- /absolute/repository/path
```

The source catalog arranges models on a grid. The exporter removes layout offsets in memory and never saves those changes to the source. Keep the 19 named mesh objects; edit their geometry in Edit Mode. Their origins sit at ground center. Blender Z-up becomes glTF/Three.js Y-up. One tile is one meter. Preserve the names `Faction_cloth` and `Beacon_crystal` for runtime owner coloring.

Textures are embedded, with no CDN dependency. Materials follow Blender's [glTF PBR export](https://docs.blender.org/manual/en/3.6/addons/import_export/scene_gltf2.html). These are editable procedural assets, not hand-sculpted AAA production models.

## Inspect and export

Select a tile and press **◎ Inspect selected tile** for a close-up. Zoom reaches 5×; **⌖ Reset camera** restores the full island.

The renderer uses tone mapping, warm light, material reflections, textured ground and shared instanced batches. The original hierarchy is retained for picking/export. Old instance buffers are disposed during rebuilds; shared mesh/texture resources remain cached. Shadows refresh when the board changes.

**Export GLB** waits for the model request and exports explored content plus fog placeholders. Hidden enemies and UI are excluded. Failed downloads keep the game playable with basic shapes and a warning.

```sh
blender --background --python-exit-code 1 --python tools/blender/import_world.py -- crown-canopy-417.glb inspected-world.blend
```

The importer refuses to overwrite an output and creates a fresh background scene. Asset edits affect visuals, not rules. Rigged animation, scanned assets and photorealistic terrain are not included.
