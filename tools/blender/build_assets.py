"""Reproducible original game art. Run with Blender 4.5+ in a disposable background process.
blender --background --python tools/blender/build_assets.py -- <repository root>
Produces public/models/kingdom.glb and art/kingdom.blend (both intentionally regenerated).
"""
import bpy, math, pathlib, sys, json
import numpy as np
from mathutils import Vector

ROOT = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
OUT = ROOT / 'public' / 'models'
SOURCE = ROOT / 'art'
OUT.mkdir(parents=True, exist_ok=True)
SOURCE.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.context.preferences.filepaths.save_version = 0
rng = np.random.default_rng(417)

def material(name, color, roughness=.8, metallic=0, pattern=None):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if pattern:
        n = 256
        y, x = np.mgrid[0:n, 0:n] / n
        noise = rng.random((n, n))
        if pattern == 'stone':
            row = np.floor(y * 8)
            mortar = ((y * 8 % 1) < .065) | (((x * 5 + (row % 2) * .5) % 1) < .04)
            height = np.where(mortar, .12, .65 + noise * .15)
        elif pattern == 'wood':
            grain = np.sin(x * 180 + np.sin(y * 16) * 2) * .08
            height = np.where((x * 6 % 1) < .025, .15, .65 + grain + noise * .08)
        elif pattern == 'roof':
            row = np.floor(y * 10)
            seam = ((y * 10 % 1) < .08) | (((x * 8 + row * .5) % 1) < .035)
            height = np.where(seam, .1, .6 + (y * 10 % 1) * .2 + noise * .07)
        else:
            height = .6 + noise * .25 + .07 * np.sin(x * 75) * np.sin(y * 91)
        rgba = np.ones((n, n, 4), dtype=np.float32)
        for c in range(3): rgba[:, :, c] = np.clip(color[c] * (.6 + height * .7), 0, 1)
        img = bpy.data.images.new(name + '_albedo', width=n, height=n, alpha=True)
        img.pixels.foreach_set(rgba.ravel())
        img.pack()
        tex = m.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
        m.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
        dy, dx = np.gradient(height)
        normal = np.stack((-dx * 3, -dy * 3, np.ones_like(dx)), axis=-1)
        normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
        rgba[:, :, :3] = normal * .5 + .5
        normal_img = bpy.data.images.new(name + '_normal', width=n, height=n, alpha=True)
        normal_img.colorspace_settings.name = 'Non-Color'
        normal_img.pixels.foreach_set(rgba.ravel()); normal_img.pack()
        nt = m.node_tree.nodes.new('ShaderNodeTexImage'); nt.image = normal_img
        nm = m.node_tree.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = .45
        m.node_tree.links.new(nt.outputs['Color'], nm.inputs['Color'])
        m.node_tree.links.new(nm.outputs['Normal'], bsdf.inputs['Normal'])
    return m

stone = material('Limestone', (.55,.52,.43), pattern='stone')
plaster = material('Warm_plaster', (.78,.72,.57), pattern='noise')
wood = material('Carved_oak', (.26,.13,.065), pattern='wood')
roof = material('Slate_roof', (.12,.2,.2), .74, pattern='roof')
iron = material('Forged_steel', (.32,.38,.4), .32, .78)
gold = material('Aged_brass', (.6,.38,.13), .34, .65)
cloth = material('Faction_cloth', (.16,.4,.32), .92)
leather = material('Leather', (.14,.075,.045), .86)
skin = material('Skin', (.63,.39,.23), .72)
dark = material('Recess', (.025,.04,.042), .95)
leaves = material('Pine_needles', (.055,.13,.045), .96)
leaf_light = material('Leaf_tips', (.10,.20,.06), .94)
rock = material('Weathered_rock', (.39,.4,.35), pattern='stone')
snow = material('Pale_mineral', (.48,.49,.42), .94, pattern='noise')
wheat = material('Wheat', (.63,.44,.15), .91)
soil = material('Furrow_soil', (.19,.12,.07), .96, pattern='noise')
glow = material('Beacon_crystal', (.2,.63,.56), .18, .2)
glow.node_tree.nodes.get('Principled BSDF').inputs['Emission Color'].default_value = (.04,.25,.16,1)
glow.node_tree.nodes.get('Principled BSDF').inputs['Emission Strength'].default_value = .8

def finish(o, mat, bevel=0):
    o.data.materials.append(mat)
    if bevel:
        b = o.modifiers.new('Crafted edge bevel', 'BEVEL'); b.width=bevel; b.segments=2
        bpy.context.view_layer.objects.active=o; bpy.ops.object.modifier_apply(modifier=b.name)
        w = o.modifiers.new('Weighted surface normals', 'WEIGHTED_NORMAL'); w.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=w.name)
    return o

def box(pos, dims, mat, bevel=.006):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    o=bpy.context.object; o.scale=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(o,mat,bevel)

def sphere(pos, scale, mat, segments=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=8, radius=1, location=pos)
    o=bpy.context.object; o.scale=scale
    for p in o.data.polygons: p.use_smooth=True
    return finish(o,mat)

def cylinder(pos, r, depth, mat, vertices=12, top=None, bevel=.002):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r, radius2=r if top is None else top, depth=depth, location=pos)
    return finish(bpy.context.object,mat,bevel)

def beam(a,b,r,mat):
    a,b=Vector(a),Vector(b); o=cylinder((a+b)/2,r,(b-a).length,mat,8,bevel=0)
    for p in o.data.polygons: p.use_smooth=len(p.vertices)==4
    o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o

def poly(name, vertices, faces, mat):
    me=bpy.data.meshes.new(name); me.from_pydata(vertices,[],faces); me.update()
    o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); finish(o,mat)
    bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.smart_project(); bpy.ops.object.mode_set(mode='OBJECT')
    o.select_set(False); return o

def cottage():
    box((0,0,.025),(.43,.35,.05),stone)
    box((0,0,.185),(.36,.29,.30),plaster)
    poly('Gabled roof', [(-.23,-.19,.33),(.23,-.19,.33),(-.23,.19,.33),(.23,.19,.33),(-.23,0,.51),(.23,0,.51)],[(0,1,5,4),(4,5,3,2),(0,4,2),(1,3,5),(0,2,3,1)],roof)
    for x in [-.17,.17]: box((x,-.15,.18),(.022,.02,.29),wood,.002)
    box((0,-.155,.28),(.36,.018,.025),wood,.002)
    box((0,-.153,.125),(.088,.018,.18),wood,.003)
    for x in [-.117,.117]:
        box((x,-.157,.22),(.065,.02,.083),dark,.002)
        for dx in [-.038,.038]: box((x+dx,-.17,.22),(.012,.015,.1),wood,.001)
        box((x,-.173,.22),(.064,.012,.008),gold,.001)
    box((.10,.06,.47),(.055,.065,.24),stone)
    box((.10,.06,.60),(.07,.08,.02),dark,.003)
    for z in [.07,.09]: box((0,-.215,z),(.13,.10,.02),stone,.003)

def tower():
    cylinder((0,0,.30),.135,.6,stone,12)
    cylinder((0,0,.59),.155,.06,stone,12)
    for i in range(8):
        a=i*math.tau/8; box((math.cos(a)*.13,math.sin(a)*.13,.66),(.065,.065,.10),stone,.003)
    for z in [.23,.43]: box((0,-.132,z),(.026,.01,.085),dark,.001)
    cylinder((0,0,.04),.16,.08,rock,12)

def keep():
    box((0,0,.24),(.38,.34,.48),stone)
    for x in [-.2,.2]:
        for y in [-.17,.17]:
            cylinder((x,y,.28),.055,.56,stone)
            cylinder((x,y,.62),.083,.17,roof,12,0)
    poly('Keep roof',[(-.24,-.2,.48),(.24,-.2,.48),(-.24,.2,.48),(.24,.2,.48),(0,0,.72)],[(0,1,4),(1,3,4),(3,2,4),(2,0,4)],roof)
    box((0,-.176,.12),(.13,.02,.21),wood)
    for x in [-.12,.12]: box((x,-.18,.36),(.05,.018,.075),dark,.002)
    box((0,-.187,.36),(.048,.013,.15),cloth,.001)

def market():
    box((0,0,.12),(.30,.20,.22),wood)
    for x in [-.17,.17]:
        for y in [-.12,.12]: beam((x,y,0),(x,y,.43),.014,wood)
    for i in range(6): box((-.15+i*.06,0,.4),(.06,.29,.025),cloth if i%2 else plaster,.002)
    for i in range(4): sphere((-.11+i*.07,-.03,.255),(.028,.025,.025),wheat)
    cylinder((.23,0,.09),.06,.18,wood)
    for z in [.035,.145]: cylinder((.23,0,z),.064,.014,iron)

def wall():
    box((0,0,.16),(.84,.09,.32),stone)
    for x in np.linspace(-.38,.38,9): box((float(x),0,.34),(.05,.105,.08),stone,.003)

def workshop():
    cottage()
    box((.2,.05,.36),(.085,.09,.7),stone)
    box((.21,-.17,.13),(.1,.1,.08),iron)
    beam((.20,-.18,.17),(.31,-.18,.17),.025,iron)

def barracks():
    cottage()
    for x in [-.12,0,.12]: beam((x,-.25,.08),(x,-.25,.43),.008,wood)
    box((0,-.252,.24),(.31,.016,.028),wood)
    box((0,-.19,.27),(.11,.025,.14),iron)

def pine():
    cylinder((0,0,.40),.045,.8,wood,9,.015)
    for layer in range(5):
        z=.38+layer*.13; radius=.26-layer*.039
        o=cylinder((0,0,z+.13),radius*.8,.30,leaves,14,0)
        for p in o.data.polygons: p.use_smooth=True
        # Radial boughs with actual needle fans create a ragged organic silhouette.
        for i in range(7):
            a=i*math.tau/7+layer*.7
            end=(math.cos(a)*radius,math.sin(a)*radius,z-.035)
            beam((0,0,z+.03),end,.007,wood)
            vertices=[]; faces=[]
            for j in range(5):
                f=.25+j*.15; cx=end[0]*f; cy=end[1]*f; cz=z+.03-f*.065
                length=.055*(1-f*.35)
                for side in [-1,1]:
                    base=len(vertices)
                    vertices.extend([(cx,cy,cz),(cx+math.cos(a+side*.85)*length,cy+math.sin(a+side*.85)*length,cz+.018),(cx+math.cos(a)*.022,cy+math.sin(a)*.022,cz+.035)])
                    faces.append((base,base+1,base+2))
            poly('Needle bough',vertices,faces,leaf_light if i%3 else leaves)

def oak():
    cylinder((0,0,.30),.055,.60,wood,9,.025)
    for i in range(7):
        a=i*2.4; p=(math.cos(a)*.16,math.sin(a)*.16,.57+(i%3)*.09)
        beam((0,0,.30),p,.022,wood)
        sphere(p,(.19,.17,.20),leaves if i%2 else leaf_light)

def rocks(mountain=False):
    for i in range(5):
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3,radius=1,location=((i%2-.5)*.28,(i//2-1)*.18,.13 if not mountain else .3))
        o=bpy.context.object; o.scale=(.19,.20,.18) if not mountain else (.38,.33,.6 if i==0 else .38)
        o.rotation_euler=(i*.3,i*.2,i*.7)
        for v in o.data.vertices: v.co *= 1 + .13*math.sin(v.index*13+i) + .07*math.cos(v.co.z*15)
        finish(o,rock if i!=4 else snow)

def farm(upgraded=False):
    box((0,0,.016),(.78,.78,.032),soil,.01)
    for row in range(6):
        for col in range(7):
            x=-.30+col*.10; y=-.28+row*.11
            beam((x,y,.04),(x+.015,y,.15),.008,wheat)
            sphere((x+.015,y,.15),(.015,.013,.045),wheat,8)
    for x in [-.41,.41]:
        for y in [-.4,0,.4]: box((x,y,.10),(.025,.025,.2),wood,.002)
        box((x,0,.10),(.018,.8,.025),wood,.002)
    if upgraded:
        box((.28,.25,.20),(.12,.15,.36),wood)
        cylinder((.28,.25,.43),.12,.17,roof,8,0)

def lumber():
    box((0,0,.08),(.42,.30,.15),wood)
    for i in range(5):
        o=cylinder((-.22+i*.10,0,.20+(i%2)*.05),.043,.56,wood,10); o.rotation_euler[0]=math.pi/2
    beam((-.33,.22,0),(-.33,.22,.40),.025,wood)
    box((-.30,.22,.37),(.11,.035,.08),iron)

def beacon():
    for i in range(3): cylinder((0,0,.04+i*.055),.34-i*.045,.065,stone,16)
    cylinder((0,0,.43),.075,.55,stone,10)
    for z in [.24,.63]: cylinder((0,0,z),.11,.045,gold,12)
    for i in range(4):
        a=i*math.pi/2; beam((math.cos(a)*.22,math.sin(a)*.22,.15),(math.cos(a)*.16,math.sin(a)*.16,.65),.023,stone)
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.16,location=(0,0,.84)); o=bpy.context.object; o.scale=(.7,.7,1.5); finish(o,glow)

def soldier(kind):
    heavy=kind in ['guardian','sentinel']; armor=iron if heavy else leather
    for side in [-1,1]:
        x=side*.065
        sphere((x,-.025,.045),(.052,.082,.045),leather)
        beam((x,0,.075),(x,0,.25),.039,armor)
        sphere((x,0,.26),(.043,.045,.046),iron if heavy else cloth)
        beam((x,0,.27),(x*.8,0,.40),.044,cloth)
    sphere((0,0,.46),(.12,.075,.16),armor)
    box((0,-.077,.48),(.13,.023,.18),cloth)
    box((0,0,.37),(.20,.15,.03),leather)
    box((0,-.083,.37),(.031,.014,.03),gold,.002)
    # A fitted cape gives a different silhouette from the primitive pawn.
    poly('Cape',[(-.12,.055,.58),(.12,.055,.58),(-.15,.11,.27),(.15,.11,.27)],[(0,1,3,2)],cloth)
    for side in [-1,1]:
        a=(side*.12,0,.54); b=(side*.18,-.025,.43); c=(side*.20,-.05,.33)
        sphere(a,(.06,.075,.07),armor); beam(a,b,.037,armor); beam(b,c,.033,leather); sphere(c,(.034,.032,.043),skin)
    cylinder((0,0,.61),.035,.06,skin)
    sphere((0,-.006,.69),(.068,.058,.085),skin)
    sphere((0,-.060,.685),(.018,.022,.022),skin)
    if heavy:
        sphere((0,.004,.735),(.078,.064,.055),iron)
        box((0,-.063,.715),(.13,.018,.016),iron,.002)
        for x in [-.057,.057]: box((x,-.04,.68),(.02,.025,.07),iron,.002)
    else:
        sphere((0,.017,.73),(.078,.067,.07),cloth)
    if kind=='archer':
        points=[(.24,-.06,.25),(.30,-.06,.36),(.32,-.06,.50),(.29,-.06,.65),(.24,-.06,.73)]
        for a,b in zip(points,points[1:]): beam(a,b,.011,wood)
        beam(points[0],points[-1],.002,plaster)
        cylinder((-.08,.11,.49),.032,.29,leather)
        for i in range(3): beam((-.10+i*.02,.11,.52),(-.10+i*.02,.11,.71),.004,wood)
    elif heavy:
        poly('Kite shield',[(-.27,-.10,.56),(-.13,-.10,.56),(-.12,-.10,.42),(-.20,-.10,.29),(-.28,-.10,.42)],[(0,1,2,3,4)],iron)
        box((-.20,-.112,.455),(.026,.013,.19),cloth,.002)
        beam((.21,-.05,.27),(.21,-.05,.67),.013,iron)
        box((.21,-.05,.36),(.10,.02,.02),gold,.002)
    else:
        beam((.21,-.05,.03),(.21,-.05,.90),.011,wood)
        cylinder((.21,-.05,.94),.025,.13,iron,6,0)
    if kind=='sentinel':
        box((0,.01,.81),(.035,.14,.095),cloth)
        for x in [-.13,.13]: sphere((x,0,.57),(.075,.085,.035),gold)

assets = {}
def asset(name, build):
    before=set(bpy.data.objects)
    build()
    parts=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]; bpy.ops.object.join()
    o=bpy.context.object; o.name=name
    bpy.context.scene.cursor.location=(0,0,0); bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    assets[name]=o

if __name__ == '__main__':
    for name, fn in [('cottage',cottage),('keep',keep),('tower',tower),('market',market),('barracks',barracks),('workshop',workshop),('wall',wall),('pine',pine),('oak',oak),('rocks',rocks),('mountain',lambda:rocks(True)),('farm',farm),('farm2',lambda:farm(True)),('lumber',lumber),('beacon',beacon)]: asset(name,fn)
    for kind in ['scout','guardian','archer','sentinel']: asset(kind,lambda k=kind:soldier(k))

    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/'kingdom.glb'), export_format='GLB', use_selection=True, export_apply=True, export_cameras=False, export_lights=False, export_yup=True, export_image_format='AUTO')
    stats={name: {'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons)} for name,o in assets.items()}
    (OUT/'manifest.json').write_text(json.dumps({'generator':'Blender 4.5.9','assets':stats},indent=2))
    # Arrange the editable source as a clean catalog, after export of centered prototypes.
    for i,o in enumerate(assets.values()): o.location=((i%5)*1.5,(i//5)*1.5,0)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'kingdom.blend'))
    print('ASSET_BUILD_OK',json.dumps(stats))
