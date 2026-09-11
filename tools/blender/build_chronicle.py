"""Build original Broken Meridian story props and a studio review sheet.
blender --background --python-exit-code 1 --python tools/blender/build_chronicle.py -- <repo>
Only regenerates chronicle.glb, chronicle.blend, its manifest and contact sheet.
"""
import bpy, math, pathlib, sys, runpy, json
from mathutils import Vector
root = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
lib = runpy.run_path(str(root / 'tools/blender/build_assets.py'), run_name='asset_library')
for key in ['box', 'sphere', 'cylinder', 'beam', 'poly', 'asset', 'assets', 'material', 'stone', 'wood', 'gold', 'iron', 'dark', 'cloth']:
    globals()[key] = lib[key]
glass = material('Dormant_glass', (.16, .23, .25), .32, .35)
paper = material('Preserved_vellum', (.67, .57, .34), .9, pattern='noise')

def ring(pos, radius, material, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=.009, major_segments=32, minor_segments=8, location=pos, rotation=rotation)
    bpy.context.object.data.materials.append(material)

def archive():
    box((0, 0, .035), (.73, .69, .07), stone, .014)
    for x, height in [(-.28, .64), (.28, .40)]:
        box((x, .19, .10), (.18, .18, .10), stone, .012)
        cylinder((x, .19, height/2+.13), .063, height, stone, 12)
        cylinder((x, .19, height+.12), .083, .055, stone, 12)
        for z in [.25, .38]: cylinder((x, .19, z), .072, .02, gold, 12)
    # Individual wedge stones with real gaps avoid intersecting rotated cubes.
    for i in range(7):
        a=math.pi-i*math.pi/14; b=a-math.pi/14+.014
        vertices=[(.0+r*math.cos(theta),y,.74+r*math.sin(theta))
                  for y in [.11,.27] for theta,r in [(a,.22),(a,.34),(b,.34),(b,.22)]]
        poly('Broken arch wedge',vertices,[(0,1,2,3),(7,6,5,4),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],stone)
    box((0,-.055,.14),(.30,.28,.19),stone,.018)
    box((0,-.08,.255),(.36,.32,.055),wood,.01)
    ring((0,-.055,.43),.15,gold,(math.pi/2,0,0))
    ring((0,-.055,.43),.13,gold,(math.pi/2,.6,.5))
    sphere((0,-.055,.43),(.052,.052,.052),glass,16)
    beam((0,-.055,.26),(0,-.055,.62),.009,iron)
    for x in [-.10,.08]:
        box((x,-.19,.295),(.13,.085,.015),paper,.003)
        for j in range(4):beam((x-.046,-.22+j*.014,.306),(x+.035,-.22+j*.014,.306),.0015,dark)
    for i in range(3):
        o=box((.28,.23-i*.14,.105),(.09,.08,.09),stone,.01);o.rotation_euler[2]=i*.8

def wreck():
    for side in [-1,1]:
        for i in range(6):
            y=-.33+i*.13;z=.13+.035*abs(i-2.5)
            beam((side*.08,y,.035),(side*.23,y,z),.019,wood)
        for z in [.055,.11]:beam((side*.16,-.36,z),(side*.21,.24,z+.08),.018,wood)
    for i in range(5):box((-.13+i*.063,-.02,.055),(.047,.69,.027),wood,.003)
    beam((0,.12,.07),(.11,.24,.65),.017,wood)
    beam((-.13,.15,.49),(.21,.24,.50),.009,wood)
    poly('Torn sail',[(-.13,.15,.48),(.19,.24,.49),(.14,.20,.32),(.09,.18,.39),(.045,.17,.28),(-.06,.16,.33)],[(0,1,2,3,4,5)],cloth)
    box((0,-.13,.135),(.22,.18,.14),wood,.015)
    box((0,-.13,.214),(.235,.19,.026),gold,.005)
    for x in [-.07,.07]:box((x,-.224,.15),(.018,.01,.14),iron,.001)
    box((0,-.232,.17),(.035,.013,.035),gold,.003)
    ring((-.14,.09,.12),.055,iron,(math.pi/2,0,0))

def dormant():
    cylinder((0,0,.035),.35,.07,stone,8)
    cylinder((0,0,.10),.27,.06,stone,8)
    cylinder((0,0,.33),.12,.42,stone,8)
    for i in range(5):
        a=i*math.tau/5
        beam((math.cos(a)*.13,math.sin(a)*.13,.18),(math.cos(a)*.13,math.sin(a)*.13,.49),.016,gold)
    cylinder((0,0,.55),.19,.055,gold,10)
    for i in range(3):
        a=i*math.tau/3
        cylinder((math.cos(a)*.105,math.sin(a)*.105,.68),.037,.20,glass,5,0)
    ring((0,0,.72),.22,gold,(.65,0,0))
    for pos in [(.24,.13,.095),(-.19,.19,.11)]:sphere(pos,(.08,.065,.07),glass,8)

for name, builder in [('meridian_archive',archive),('meridian_wreck',wreck),('meridian_dormant',dormant)]:asset(name,builder)
out=root/'public/models'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out/'chronicle.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
manifest={'generator':'Blender 4.5.9','assets':{n:{'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'bounds':list(o.dimensions)} for n,o in assets.items()}}
(out/'chronicle-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
for i,o in enumerate(assets.values()):o.location=(i*1.4,0,0)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'art/chronicle.blend'))
box((1.4,0,-.055),(4.3,1.7,.1),dark,.025)
for i,name in enumerate(['THE LOST ARCHIVE','THE DROWNED PASSAGE','THE SILENT BEACON']):
    bpy.ops.object.text_add(location=(i*1.4,-.61,.01))
    label=bpy.context.object;label.data.body=name;label.data.size=.069;label.data.align_x='CENTER';label.data.materials.append(gold)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.world=bpy.data.worlds.new('Meridian studio');scene.world.color=(.16,.21,.23)
bpy.ops.object.light_add(type='AREA',location=(1,-3,5));bpy.context.object.data.energy=850;bpy.context.object.data.size=5
bpy.ops.object.camera_add(location=(3,-5,4.7));camera=bpy.context.object
camera.rotation_euler=(Vector((1.4,0,.25))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=4.8;scene.camera=camera
scene.render.resolution_x=1500;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX'
scene.render.filepath=str(root/'public/art/chronicle-sites.png');bpy.ops.render.render(write_still=True)
print('CHRONICLE_ASSETS_OK',json.dumps(manifest))
