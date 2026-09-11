"""Import a game-exported GLB into a fresh Blender scene and save a .blend.

Usage: blender --background --python tools/blender/import_world.py -- board.glb board.blend
Run in a disposable background Blender process, not an unsaved interactive scene.
"""
import pathlib
import sys
import bpy

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
if len(args) != 2:
    raise SystemExit('Expected input.glb and output.blend after --')
source, destination = [pathlib.Path(p).resolve() for p in args]
if source.suffix.lower() != '.glb' or not source.is_file():
    raise SystemExit('Input must be an existing GLB file')
if destination.suffix.lower() != '.blend' or destination.exists():
    raise SystemExit('Output must be a new .blend path; existing files are preserved')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(source))
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
bpy.ops.object.light_add(type='SUN', location=(4, -6, 12))
bpy.context.object.rotation_euler = (0.5, -0.3, -0.6)
bpy.context.object.data.energy = 3
scene.world = bpy.data.worlds.new('Island sky')
scene.world.color = (0.18, 0.23, 0.26)
bpy.ops.wm.save_as_mainfile(filepath=str(destination))
