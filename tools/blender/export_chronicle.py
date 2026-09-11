"""Export edited chronicle.blend meshes without saving the catalog's layout changes.
blender -b art/chronicle.blend --python tools/blender/export_chronicle.py -- <repo>
"""
import bpy, pathlib, sys, json
root=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
names=['meridian_archive','meridian_wreck','meridian_dormant']
bpy.ops.object.select_all(action='DESELECT')
stats={}
for name in names:
    obj=bpy.data.objects.get(name)
    if obj is None or obj.type!='MESH':raise RuntimeError('Missing story mesh: '+name)
    obj.location=(0,0,0);obj.hide_set(False);obj.select_set(True);obj.data.calc_loop_triangles()
    stats[name]={'triangles':len(obj.data.loop_triangles),'bounds':list(obj.dimensions)}
bpy.ops.export_scene.gltf(filepath=str(root/'public/models/chronicle.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
(root/'public/models/chronicle-manifest.json').write_text(json.dumps({'generator':'Blender 4.5.9','assets':stats},indent=2)+'\n')
print('EDITED_CHRONICLE_EXPORTED')
