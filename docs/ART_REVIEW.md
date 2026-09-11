# Visual upgrade and review

## Delivered

- Actual Blender generation and runtime GLB loading: 19 reusable meshes, embedded materials and editable `.blend` source.
- Cottages with window recesses, timber and slate roofs; keeps, crenellated towers/walls, market stalls, barracks and workshops.
- Pine boughs, broadleaf trees, weathered rocks, fenced crops and lumber piles.
- Soldiers with boots, joints, armor, capes, helmets, shields, bows/quivers and spears; veteran rank markers remain.
- Owner-colored banners, cloth and beacon crystals, preserving gameplay cues.
- Balanced warm lighting, cached soft shadows, environmental reflections, ground texture, close-up inspection and increased zoom.

## Review fixes

1. Corrected Blender's unsupported image-export enum and enabled nonzero exit on Python errors.
2. Removed duplicate reversed cape/shield faces flagged by the exporter.
3. Darkened vegetation and reduced exposure/fill after browser screenshot inspection.
4. Replaced repeated prop draw calls with shared instance batches; dispose old instance buffers on rebuild.
5. Retained a full export/picking hierarchy. Export explicitly includes this hidden hierarchy but not unexplored enemy objects.
6. Wait for models before export; provide playable fallback and warning on download failure.
7. Preserve owner coloring on beacon crystals.
8. Keep the visual layer separate from game rules and save schema.
9. Remove unnecessary bevels on tiny stems/branches, reducing the pack to about 4.4 MB without removing model features.
10. Render only when the scene/camera changes; verify idle frames remain stable. Remove the external webfont request that could stall loading, retaining local/system font fallbacks.

## Verification and scope

37 rules/asset tests cover gameplay, prototype names, normals, embedded PBR textures and an 8 MiB model-pack budget. Browser coverage includes gameplay, reload, GLB export, a fully revealed 17×17 map, close-ups and failed downloads. Blender itself generates the models; players do not need Blender installed.

Final measured full-map fixture: 69 batches, 112 draw calls, 469,093 triangles. The optimized browser suite passes all 10 tests. The game's downloaded GLB was also imported successfully in Blender 4.5.9 and saved as a verification scene. Runtime pack: 4,369,900 bytes; editable source: approximately 5.9 MB. These are scene-complexity and regression observations, not a cross-device frame-rate guarantee.

This moves the game from placeholder primitives to detailed stylized medieval miniatures. It is **not a claim of AAA or photorealistic production quality**. That also requires professionally authored/scanned assets, rigging, animation, effects and broader hardware optimization. The delivered source pipeline supports that continued work.
