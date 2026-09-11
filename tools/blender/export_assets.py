"""Export the edited art catalog without its display-layout offsets.
blender --background art/kingdom.blend --python export_assets.py -- <repo root>
Does not save or modify the .blend on disk. Regenerates the runtime GLB.
"""
import bpy, pathlib, sys
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
names=['cottage','keep','tower','market','barracks','workshop','wall','pine','oak','rocks','mountain','farm','farm2','lumber','beacon','scout','guardian','archer','sentinel']
bpy.ops.object.select_all(action='DESELECT')
for name in names:
    obj=bpy.data.objects.get(name)
    if obj is None or obj.type != 'MESH': raise RuntimeError('Missing mesh: '+name)
    obj.location=(0,0,0)
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/kingdom.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True,export_image_format='AUTO')
print('EDITED_ASSETS_EXPORTED')
