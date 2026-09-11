"""Original modular tribe army catalog. Blender background --python-exit-code 1.
Run: blender -b --python tools/blender/build_armies.py -- <repo root>
Regenerates armies.glb, armies.blend and two rendered review sheets only.
"""
import bpy, math, sys, pathlib, runpy, json
from mathutils import Vector
ROOT=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
lib=runpy.run_path(str(ROOT/'tools/blender/build_assets.py'),run_name='asset_library')
for key in ['box','sphere','beam','cylinder','poly','material','finish','asset','assets','iron','gold','wood','cloth','leather','skin','dark','plaster']:
    globals()[key]=lib[key]
trim=material('Tribe_trim',(.66,.47,.20),.35,.6)
metal=material('Tribe_metal',(.27,.33,.37),.3,.75)
fur=material('Tribe_fur',(.66,.65,.55),.98)
hair=material('Hair',(.075,.04,.023),.96)
hoof=material('Hoof',(.085,.062,.045),.75)
horsehair=material('Horse_coat',(.26,.12,.058),.86,pattern='noise')
camelhair=material('Camel_coat',(.55,.36,.17),.94,pattern='noise')
sail=material('Faction_sail',(.70,.75,.64),.93)
rope=material('Rope',(.47,.34,.19),.93)
blade=material('Polished_blade',(.63,.69,.72),.22,.85)
tribes=['canopy','ember','stone','tide','desert','ice','fire','water','mountain']
styles=['field','veteran','ceremonial']
roles=['scout','guardian','archer','sentinel','spearman','rider','camel','boat','ship','gunship','cutter']

def sword(x,y,z,length=.37,knife=False):
    beam((x,y,z-.085),(x,y,z),.012,leather)
    sphere((x,y,z-.09),(.017,.016,.017),trim)
    box((x,y,z),(.052 if knife else .095,.024,.018),trim,.003)
    w=.014 if knife else .022
    poly('Forged blade',[(x-w,y,z+.012),(x+w,y,z+.012),(x+w*.72,y,z+length*.83),(x,y,z+length),(x-w*.72,y,z+length*.83),(x,y-.009,z+length*.45),(x,y+.009,z+length*.45)],[(0,1,5),(1,2,5),(2,3,5),(3,4,5),(4,0,5),(1,0,6),(2,1,6),(3,2,6),(4,3,6),(0,4,6)],blade)

def shield(x=-.19,y=-.11,z=.43,small=False):
    if small:
        o=cylinder((x,y,z),.087,.028,metal,20);o.rotation_euler[0]=math.pi/2
    else:
        v=[(x-.085,y,z+.15),(x+.085,y,z+.15),(x+.093,y,z-.025),(x,y,z-.18),(x-.093,y,z-.025)]
        o=poly('Thick kite shield',v,[(0,1,2,3,4)],metal)
        mod=o.modifiers.new('Shield thickness','SOLIDIFY');mod.thickness=.018
        bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
        for a,b in zip(v,v[1:]+v[:1]):beam(a,b,.008,trim)
        box((x,y-.012,z),(.022,.013,.235),cloth,.002)
    sphere((x,y-.025,z),(.024,.013,.027),trim)

def human(kind='guardian',mounted=False):
    heavy=kind in ['guardian','sentinel','spearman','rider']
    armor=metal if heavy else leather
    # Consistent attachment frames: shoulders at .54, head at .70, feet at zero.
    for side in [-1,1]:
        hip=(side*.052,0,.38);knee=(side*(.13 if mounted else .058),-.015,.23);ankle=(side*(.15 if mounted else .066),.018,.065)
        beam(hip,knee,.043,cloth);sphere(knee,(.043,.042,.047),armor);beam(knee,ankle,.032,leather)
        sphere((ankle[0],-.026,.038),(.043,.073,.038),leather,16)
        for z in [.085,.15]:beam((ankle[0]-.033,-.011,z),(ankle[0]+.033,-.011,z),.008,trim)
    sphere((0,0,.44),(.10,.064,.10),cloth,16)
    sphere((0,0,.515),(.108,.070,.085),armor,20)
    box((0,-.068,.485),(.126,.014,.14),cloth,.006)
    for side in [-1,1]:
        beam((side*.071,-.076,.555),(side*.066,-.074,.418),.005,trim)
        for z in [.44,.48,.52]:sphere((side*.063,-.081,z),(.007,.004,.007),trim,8)
    cylinder((0,0,.385),.105,.027,leather,20)
    box((0,-.103,.385),(.031,.012,.026),trim,.004)
    # Scabbard, belt pouch and stitched hanging fabric.
    beam((-.115,.012,.38),(-.12,.017,.16),.014,leather)
    box((.105,.025,.37),(.047,.048,.059),leather,.012)
    poly('Split tunic',[(-.09,-.056,.38),(0,-.074,.37),(.09,-.056,.38),(-.106,-.06,.29),(-.008,-.067,.28),(.008,-.067,.28),(.106,-.06,.29)],[(0,1,4,3),(1,2,6,5)],cloth)
    for side in [-1,1]:
        a=(side*.115,0,.55);b=(side*.158,-.018,.444);c=(side*.19,-.060,.367)
        sphere(a,(.049,.060,.051),armor,16);beam(a,b,.031,cloth);sphere(b,(.033,.030,.033),armor);beam(b,c,.026,leather)
        sphere(c,(.028,.025,.031),skin,16)
        for j in range(3):beam((c[0]-.018+j*.015,c[1]-.02,c[2]),(c[0]-.018+j*.015,c[1]-.022,c[2]-.023),.005,skin)
    cylinder((0,0,.612),.028,.060,skin,16)
    sphere((0,0,.69),(.060,.052,.079),skin,24)
    sphere((0,-.009,.645),(.041,.04,.033),skin,16)
    sphere((0,-.051,.688),(.013,.019,.021),skin,12)
    for side in [-1,1]:
        sphere((side*.059,0,.69),(.012,.012,.022),skin,12)
        sphere((side*.023,-.049,.711),(.011,.006,.006),dark,12)
        beam((side*.011,-.051,.723),(side*.036,-.043,.721),.004,hair)
    beam((-.017,-.047,.662),(.017,-.047,.662),.003,leather)
    sphere((0,.018,.728),(.061,.046,.044),hair,16)
    if kind=='archer':
        points=[(.20,-.08,.22),(.27,-.09,.32),(.29,-.09,.48),(.27,-.09,.64),(.20,-.08,.75)]
        for a,b in zip(points,points[1:]):beam(a,b,.009,wood)
        beam(points[0],points[-1],.002,rope)
        beam((.19,-.10,.48),(.38,-.10,.48),.003,wood)
        cylinder((-.07,.1,.47),.031,.27,leather,16)
        for j in range(5):
            x=-.09+j*.009;beam((x,.10,.50),(x,.10,.69),.003,wood)
            box((x,.10,.678),(.008,.007,.028),plaster,.001)
    elif kind in ['spearman','camel']:
        beam((.19,-.06,.08),(.19,-.06,1.04),.011,wood)
        cylinder((.19,-.06,1.095),.028,.16,blade,8,0)
        shield(small=True)
    else:
        sword(.19,-.06,.39,.19 if kind=='scout' else .53 if kind=='sentinel' else .40,kind=='scout')
        if heavy:shield()
    if kind=='sentinel':
        for side in [-1,1]:
            for z in [.44,.48,.52]:box((side*.084,-.042,z),(.031,.08,.030),metal,.005)

def mount(camel=False):
    coat=camelhair if camel else horsehair
    sphere((0,.03,.44),(.145,.29,.16),coat,20)
    if camel:sphere((0,.04,.58),(.10,.17,.16),coat,16)
    for side in [-1,1]:
        for front in [-1,1]:
            a=(side*.10,front*.20,.44);b=(side*.115,front*.22,.24);c=(side*.105,front*.23,.035)
            sphere(a,(.06,.075,.085),coat,16);beam(a,b,.032,coat);sphere(b,(.036,.035,.04),coat);beam(b,c,.020,coat)
            sphere((c[0],c[1]-.015,.028),(.038,.05,.028),hoof,12)
    beam((0,-.18,.47),(0,-.30,.76 if camel else .71),.075,coat)
    sphere((0,-.33,.77 if camel else .74),(.064,.11,.077),coat,20)
    sphere((0,-.415,.745 if camel else .68),(.061,.079,.056),coat,16)
    for side in [-1,1]:
        sphere((side*.052,-.363,.797 if camel else .765),(.009,.012,.009),dark,12)
        sphere((side*.044,-.29,.87 if camel else .835),(.019,.025,.050),coat,12)
    for y,z in [(-.23,.65),(-.26,.70),(-.28,.75)]:sphere((0,y+.035,z),(.026,.047,.05),hair)
    for side in [-1,1]:
        beam((side*.06,-.43,.77),(side*.06,-.27,.73),.006,leather)
        beam((side*.06,-.38,.73),(side*.12,-.08,.82),.003,rope)
    beam((0,.29,.50),(0,.40,.30),.022,hair)
    box((0,.005,.595),(.28,.27,.055),cloth,.02)
    box((0,.015,.645),(.20,.20,.048),leather,.015)
    for side in [-1,1]:
        box((side*.16,.1,.49),(.055,.13,.12),leather,.018)
        beam((side*.12,0,.63),(side*.17,0,.33),.006,leather)
        box((side*.17,-.018,.32),(.055,.065,.014),iron,.003)
    before=set(bpy.data.objects);human('camel' if camel else 'rider',True)
    for o in set(bpy.data.objects)-before:
        o.location.z += .27

def outfit(tribe,tier):
    level=styles.index(tier)
    # Mantles and helmet modules share the infantry head/shoulder coordinates.
    poly('Tribal mantle',[(-.113,.045,.566),(.113,.045,.566),(-.133,.098,.31),(.133,.098,.31),(0,.123,.28)],[(0,1,3,4,2)],cloth)
    sphere((0,.004,.752),(.066,.056,.035),metal if tribe in ['stone','fire','mountain','ember','water'] else cloth,20)
    for side in [-1,1]:
        if tribe in ['ice','canopy']:
            for j in range(5):sphere((side*(.03+j*.018),.014,.588-j*.003),(.032,.04,.027),fur if tribe=='ice' else cloth,12)
        else:box((side*.116,.012,.574),(.073,.094,.025),metal if level else leather,.009)
    if tribe=='desert':
        for j in range(4):
            o=cylinder((0,.004,.739+j*.009),.068-j*.002,.012,cloth,24);o.rotation_euler[1]=.05*j
        box((0,-.054,.673),(.093,.018,.045),cloth,.008)
        poly('Desert wrap',[(.057,.015,.74),(.076,.025,.73),(.079,.04,.57),(.054,.046,.59)],[(0,1,2,3)],cloth)
    elif tribe=='tide':
        cylinder((0,0,.747),.100,.012,leather,24)
        cylinder((0,.01,.782),.056,.061,cloth,20,.048)
        for j in range(3):beam((-.09,.068,.55-j*.012),(.09,.068,.55-j*.012),.004,rope)
    elif tribe=='canopy':
        cylinder((0,.019,.79),.052,.11,cloth,12,0)
    elif tribe=='ice':
        for j in range(10):
            a=j*math.tau/10;sphere((math.cos(a)*.062,math.sin(a)*.05,.735),(.021,.021,.020),fur,12)
        sphere((0,.01,.78),(.06,.05,.039),cloth,16)
    elif tribe=='fire':
        for x in [-.037,0,.037]:cylinder((x,.005,.804),.018,.13 if x==0 else .09,trim,6,0)
        box((0,-.058,.716),(.108,.012,.013),metal,.003)
    elif tribe=='water':
        poly('Fin crest',[(0,-.045,.766),(0,.08,.753),(0,.06,.88),(0,-.015,.82)],[(0,1,2,3)],trim)
    elif tribe=='mountain':
        for side in [-1,1]:beam((side*.047,.01,.77),(side*.10,.014,.82),.017,trim)
    elif tribe=='ember':
        for j in range(7):
            a=j*math.pi/6;beam((math.cos(a)*.035,.025,.78+math.sin(a)*.025),(math.cos(a)*.078,.025,.78+math.sin(a)*.067),.006,trim)
    else:box((0,-.059,.726),(.12,.014,.023),metal,.004)
    if level:
        for side in [-1,1]:
            box((side*.119,-.004,.59),(.079,.087,.021),trim,.007)
            for z in [.42,.47,.52]:sphere((side*.085,.079,z),(.007,.006,.007),trim,8)
    if level==2:
        beam((-.082,.09,.34),(-.082,.09,.98),.005,wood)
        poly('Ceremonial back pennant',[(-.082,.09,.97),(.035,.09,.94),(-.005,.09,.84),(-.082,.09,.86)],[(0,1,2,3)],cloth)
        sphere((0,-.078,.551),(.018,.008,.020),trim,12)

def hull(kind):
    length=.86 if kind=='boat' else 1.12 if kind=='cutter' else 1.02
    width=.30 if kind=='boat' else .31 if kind=='cutter' else .41
    # Cross-section loft with raised bow/stern and a tapered keel.
    sections=[(-length/2,.025,.22),(-length*.34,width*.83,.17),(0,width,.17),(length*.34,width*.83,.20),(length/2,.045,.27)]
    v=[]
    for y,w,z in sections:v.extend([(-w/2,y,z),(w/2,y,z),(w*.27,y,.065),(-w*.27,y,.065)])
    faces=[]
    for i in range(4):
        a=i*4;b=a+4
        for j in range(4):faces.append((a+j,a+(j+1)%4,b+(j+1)%4,b+j))
    faces.extend([(0,3,2,1),(16,17,18,19)])
    poly('Planked hull',v,faces,wood)
    for side in [-1,1]:
        for (y,w,z),(ny,nw,nz) in zip(sections,sections[1:]):beam((side*w/2,y,z),(side*nw/2,ny,nz),.013,trim)
        for j in range(6):
            y=-length*.29+j*length*.11
            beam((side*width*.49,y,.08),(side*width*.49,y,.178),.004,iron)
    box((0,0,.168),(width*.75,length*.65,.024),wood,.008)
    if kind=='boat':
        for y in [-.2,0,.2]:box((0,y,.21),(width*.82,.04,.026),wood,.004)
        for side in [-1,1]:
            beam((side*.085,-.06,.25),(side*.31,.14,.08),.008,wood)
            o=box((side*.29,.12,.10),(.04,.15,.013),wood,.004);o.rotation_euler[2]=-side*.6
    else:
        beam((0,-.02,.18),(0,-.02,.86 if kind=='cutter' else .91),.014,wood)
        if kind=='cutter':
            verts=[(0,-.04,.84),(0,.35,.25),(0,-.04,.25)]
        else:verts=[(-.22,-.03,.82),(.22,-.03,.82),(.18,-.055,.40),(-.18,-.055,.40),(0,-.105,.61)]
        poly('Woven sail',verts,[(0,1,2)] if kind=='cutter' else [(0,1,4),(1,2,4),(2,3,4),(3,0,4)],sail)
        beam((-.23,-.03,.84),(.23,-.03,.84),.009,wood)
        for side in [-1,1]:beam((0,-.02,.85),(side*width*.44,.29,.20),.0025,rope)
        box((0,.30,.23),(width*.6,.18,.08),wood,.01)
        beam((0,length*.49,.18),(0,length*.49,.32),.010,wood)
    if kind=='gunship':
        for side in [-1,1]:
            for y in [-.20,.16]:
                box((side*.105,y,.205),(.07,.075,.04),wood,.004)
                beam((side*.065,y,.255),(side*.25,y,.275),.027,iron)
                muzzle=cylinder((side*.252,y,.275),.020,.003,dark,16,bevel=0);muzzle.rotation_euler[1]=math.pi/2
                for dy in [-.032,.032]:sphere((side*.10,y+dy,.198),(.026,.012,.026),iron,12)
    if kind!='boat':
        for y in [-.23,.21]:
            cylinder((.08,y,.27),.027,.12,cloth,12,.019)
            sphere((.08,y,.36),(.026,.024,.03),skin,12)

def prow(tribe,tier):
    i=tribes.index(tribe);level=styles.index(tier)
    beam((0,-.46,.20),(0,-.49,.38),.010,trim)
    if tribe in ['ice','fire','mountain']:
        for j in [-1,0,1]:cylinder((j*.025,-.49,.40),.018,.10+level*.02 if j==0 else .065,trim,5,0)
    elif tribe in ['water','canopy']:
        for side in [-1,1]:poly('Prow wing',[(0,-.49,.34),(side*.095,-.43,.44),(side*.06,-.50,.34)],[(0,1,2)],cloth)
    elif tribe in ['ember','desert']:
        for j in range(8 if tribe=='ember' else 5):
            a=j*math.tau/8;beam((math.cos(a)*.023,-.49,.40+math.sin(a)*.023),(math.cos(a)*.049,-.49,.40+math.sin(a)*.049),.005,trim)
    else:box((0,-.49,.41),(.07,.033,.065),trim,.006)
    if level:
        beam((0,.35,.25),(0,.35,.49+level*.05),.006,wood)
        poly('Naval pennant',[(0,.35,.47+level*.05),(.12,.35,.45+level*.05),(.085,.35,.39+level*.05),(0,.35,.4+level*.05)],[(0,1,2,3)],cloth)

for role in roles:
    asset('unit_'+role,lambda k=role: hull(k) if k in ['boat','ship','gunship','cutter'] else mount(k=='camel') if k in ['rider','camel'] else human(k))
for tribe in tribes:
    for tier in styles:
        asset('outfit_'+tribe+'_'+tier,lambda t=tribe,v=tier:outfit(t,v))
        asset('prow_'+tribe+'_'+tier,lambda t=tribe,v=tier:prow(t,v))

out=ROOT/'public/models';out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(out/'armies.glb'),export_format='GLB',use_selection=True,export_apply=True,export_cameras=False,export_lights=False,export_yup=True)
stats={name:{'vertices':len(o.data.vertices),'triangles':sum(len(p.vertices)-2 for p in o.data.polygons),'bounds':[list(map(float,o.dimensions))]} for name,o in assets.items()}
(out/'armies-manifest.json').write_text(json.dumps({'generator':'Blender 4.5.9','assets':stats},indent=2))
for i,o in enumerate(assets.values()):o.location=((i%8)*1.5,(i//8)*1.5,0)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'art/armies.blend'))
print('ARMIES_BUILD_OK',len(assets),sum(x['triangles'] for x in stats.values()))

# Render assembled bodies + outfits with the same offsets used in the browser.
for o in assets.values():o.hide_render=True
preview_colors=[(.18,.46,.32),(.65,.16,.10),(.32,.42,.57),(.24,.55,.52),(.65,.46,.18),(.68,.82,.88),(.70,.07,.035),(.08,.38,.67),(.44,.25,.52)]
preview_materials={}
def instance(name,position=(0,0,0),tribe='canopy'):
    o=assets[name].copy();o.data=assets[name].data.copy();bpy.context.collection.objects.link(o);o.hide_render=False;o.location=position
    for i,m in enumerate(o.data.materials):
        if m.name in ['Faction_cloth','Faction_sail']:
            key=(m.name,tribe)
            if key not in preview_materials:
                clone=m.copy();clone.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(*preview_colors[tribes.index(tribe)],1);preview_materials[key]=clone
            o.data.materials[i]=preview_materials[key]
    return o
def label(text,x,y):
    bpy.ops.object.text_add(location=(x,y,.01));o=bpy.context.object;o.data.body=text;o.data.align_x='CENTER';o.data.size=.11;o.data.extrude=.001;o.data.materials.append(gold)

scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20;scene.cycles.use_denoising=True
if scene.world is None:scene.world=bpy.data.worlds.new('Army studio')
scene.world.color=(.22,.22,.22)
bpy.ops.object.light_add(type='AREA',location=(1,-3,8));bpy.context.object.data.energy=1700;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=7
bpy.ops.object.camera_add(location=(5,-10,10));camera=bpy.context.object;camera.rotation_euler=(Vector((4,1,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=10.5;scene.camera=camera
scene.render.resolution_x=1800;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
preview=ROOT/'public/art';preview.mkdir(parents=True,exist_ok=True)
before=set(bpy.data.objects)
for i,role in enumerate(roles):
    pos=((i%6)*1.48,(i//6)*1.65,0);instance('unit_'+role,pos,tribes[i%9])
    if role not in ['boat','ship','gunship','cutter']:instance('outfit_'+tribes[i%9]+'_veteran',(pos[0],pos[1],.27 if role in ['rider','camel'] else 0),tribes[i%9])
    else:instance('prow_'+tribes[i%9]+'_veteran',pos,tribes[i%9])
    label(role,pos[0],pos[1]-.58)
box((3.6,.8,-.06),(9,4.4,.10),dark,.03)
scene.render.filepath=str(preview/'unit-roster.png');bpy.ops.render.render(write_still=True)
for o in set(bpy.data.objects)-before:bpy.data.objects.remove(o,do_unlink=True)
for i,tribe in enumerate(tribes):
    for j,tier in enumerate(styles):
        pos=(i*1.05,j*1.30,0);instance('unit_guardian',pos,tribe);instance('outfit_'+tribe+'_'+tier,pos,tribe)
    label(tribe,i*1.05,-.53)
box((4.1,1.2,-.06),(10,4.8,.10),dark,.03)
camera.location=(4.3,-7.8,9);camera.rotation_euler=(Vector((4.2,1.1,.2))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=11
scene.render.filepath=str(preview/'tribe-styles.png');bpy.ops.render.render(write_still=True)
print('ARMY_PREVIEWS_OK')
