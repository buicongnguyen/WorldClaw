"""Export an edited art/armies.blend catalog, preserving source layout on disk.
blender --background art/armies.blend --python tools/blender/export_armies.py -- <repo root>
Keep mesh names and origins; edit geometry in Edit Mode. Does not save the .blend.
"""
import bpy, json, pathlib, sys
root = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
manifest = json.loads((root / 'public/models/armies-manifest.json').read_text())
bpy.ops.object.select_all(action='DESELECT')
for name in manifest['assets']:
    obj = bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH':
        raise RuntimeError('Missing army mesh: ' + name)
    obj.location = (0, 0, 0)
    obj.hide_set(False)
    obj.select_set(True)
    obj.data.calc_loop_triangles()
    manifest['assets'][name] = {
        'vertices': len(obj.data.vertices), 'triangles': len(obj.data.loop_triangles),
        'bounds': [list(obj.dimensions)],
    }
bpy.ops.export_scene.gltf(filepath=str(root / 'public/models/armies.glb'), export_format='GLB',
    use_selection=True, export_apply=True, export_cameras=False, export_lights=False,
    export_yup=True, export_image_format='AUTO')
(root / 'public/models/armies-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print('EDITED_ARMIES_EXPORTED')
