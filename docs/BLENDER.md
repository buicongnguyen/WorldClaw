# Blender workflow

The game ships real procedural Three.js meshes. No GPU model inference or Blender installation is required to play. Each tile is one world unit, each object's origin sits on its tile, and the scene uses Three.js Y-up; glTF/Blender import handles axis conversion.

Use **Export GLB** in the game. The file contains only explored content and fog tile placeholders; it excludes UI labels, selection indicators and hidden enemy geometry. Import via Blender **File → Import → glTF 2.0**, or:

```sh
blender --background --python tools/blender/import_world.py -- crown-canopy-417.glb crown-canopy-417.blend
```

The helper refuses to overwrite an existing .blend. Run it in a background process because it creates a fresh scene. Browser tests validate GLB download; actual Blender import requires Blender and is a separate acceptance step.

For authored replacement assets: use flat shading and applied transforms, no cameras or lights in each GLB, origin at ground center, silhouette within 0.8 tile width (trees) / 0.9 (towns), and no tiny details needed for identification. Target tree <300 triangles, unit <1,000, town <1,500. Keep faction color in a separate named material. Use Principled BSDF base color and roughness for portable materials. Avoid texture-heavy PBR for this visual style.

An import-back asset pipeline and unit animation are future work. Export currently supports inspecting/customizing the generated board in Blender; editing that board does not change game rules or automatically load it back into the game.
