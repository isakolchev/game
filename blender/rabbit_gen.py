"""
Rabbit model generator for Animal Ball Shooter.
Run in Blender: Scripting tab → Open → rabbit_gen.py → Run Script
Blender 3.x / 4.x compatible.

Coordinate convention: character faces -Y, Z is up.
After running: apply scale (Ctrl+A) before exporting to GLB.
"""

import bpy
import math

# ── Очистить сцену ────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for col in bpy.data.collections:
    bpy.data.collections.remove(col)

# ── Материалы ─────────────────────────────────────────────────────────────────
def make_mat(name, rgb, roughness=0.85, specular=0.1):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*rgb, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Specular IOR Level'].default_value = specular
    return mat

cream = make_mat('Cream', (0.96, 0.90, 0.76))
pink  = make_mat('Pink',  (0.93, 0.60, 0.65))
dark  = make_mat('Dark',  (0.06, 0.04, 0.08))
white = make_mat('White', (1.00, 1.00, 1.00), roughness=0.4)

# ── Хелперы ───────────────────────────────────────────────────────────────────
rabbit_parts = []

def sphere(name, loc, scale, mat, subd=1):
    """Создаёт UV-сферу с subdivision surface для мягких краёв."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=14, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    if subd:
        mod = obj.modifiers.new('Subd', 'SUBSURF')
        mod.levels = subd
        mod.render_levels = 2
    rabbit_parts.append(obj)
    return obj

def rot_y(obj, deg):
    obj.rotation_euler.y = math.radians(deg)

# ── ЧАСТИ МОДЕЛИ ──────────────────────────────────────────────────────────────

# Голова — большая, круглая
head = sphere('Head', (0, 0, 1.52), (0.325, 0.310, 0.325), cream)

# Тело — вытянутый овал, значительно уже головы
body = sphere('Body', (0, 0.015, 0.82), (0.195, 0.180, 0.340), cream)

# Шея — маленький шар для плавного перехода голова→тело
neck = sphere('Neck', (0, 0, 1.20), (0.105, 0.095, 0.085), cream, subd=0)

# ── УШИ ───────────────────────────────────────────────────────────────────────
# Внешнее ухо (кремовое) — очень длинное и тонкое
ear_l = sphere('Ear_L', ( 0.120, 0, 2.08), (0.066, 0.056, 0.430), cream)
ear_r = sphere('Ear_R', (-0.120, 0, 2.08), (0.066, 0.056, 0.430), cream)
rot_y(ear_l,  6); rot_y(ear_r, -6)

# Внутреннее ухо (розовое) — чуть меньше, сдвинуто вперёд
inn_l = sphere('InnerEar_L', ( 0.120, -0.028, 2.08), (0.038, 0.022, 0.355), pink, subd=0)
inn_r = sphere('InnerEar_R', (-0.120, -0.028, 2.08), (0.038, 0.022, 0.355), pink, subd=0)
rot_y(inn_l,  6); rot_y(inn_r, -6)

# ── ЛИЦО ─────────────────────────────────────────────────────────────────────
eye_l   = sphere('Eye_L',    ( 0.128, -0.285, 1.56), (0.062, 0.044, 0.062), dark,  subd=0)
eye_r   = sphere('Eye_R',    (-0.128, -0.285, 1.56), (0.062, 0.044, 0.062), dark,  subd=0)
shine_l = sphere('Shine_L',  ( 0.142, -0.314, 1.59), (0.020, 0.015, 0.020), white, subd=0)
shine_r = sphere('Shine_R',  (-0.112, -0.314, 1.59), (0.020, 0.015, 0.020), white, subd=0)
nose    = sphere('Nose',     ( 0,     -0.318, 1.43), (0.042, 0.028, 0.034), pink,  subd=0)

# ── РУКИ ─────────────────────────────────────────────────────────────────────
# Плечо/предплечье — тонкий вытянутый шар
arm_l = sphere('Arm_L', ( 0.330, 0, 0.870), (0.062, 0.057, 0.265), cream)
arm_r = sphere('Arm_R', (-0.330, 0, 0.870), (0.062, 0.057, 0.265), cream)
rot_y(arm_l,  14); rot_y(arm_r, -14)

# Кисть — небольшой круглый шар
hand_l = sphere('Hand_L', ( 0.400, 0, 0.520), (0.090, 0.078, 0.078), cream)
hand_r = sphere('Hand_R', (-0.400, 0, 0.520), (0.090, 0.078, 0.078), cream)

# ── НОГИ ─────────────────────────────────────────────────────────────────────
leg_l = sphere('Leg_L', ( 0.135, 0, 0.340), (0.080, 0.074, 0.290), cream)
leg_r = sphere('Leg_R', (-0.135, 0, 0.340), (0.080, 0.074, 0.290), cream)

# ── СТУПНИ — большие, плоские, вытянуты вперёд (-Y) ──────────────────────────
foot_l = sphere('Foot_L', ( 0.135, -0.150, -0.040), (0.130, 0.245, 0.085), cream)
foot_r = sphere('Foot_R', (-0.135, -0.150, -0.040), (0.130, 0.245, 0.085), cream)

# ── ХВОСТ — белый пушистый шарик ─────────────────────────────────────────────
tail = sphere('Tail', (0, 0.205, 0.840), (0.092, 0.085, 0.092), white)

# ── Объединить всё в коллекцию ────────────────────────────────────────────────
col = bpy.data.collections.new('Rabbit')
bpy.context.scene.collection.children.link(col)
for obj in rabbit_parts:
    # перенести из Scene Collection в Rabbit
    bpy.context.scene.collection.objects.unlink(obj)
    col.objects.link(obj)

# ── Выбрать всё в коллекции ───────────────────────────────────────────────────
bpy.ops.object.select_all(action='DESELECT')
for obj in col.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = col.objects[0]

print("=" * 50)
print(f"✓  Rabbit created — {len(rabbit_parts)} parts")
print("   Next steps:")
print("   1. Inspect & tweak shapes in Edit Mode")
print("   2. Ctrl+A → Apply All Transforms on each part")
print("   3. File → Export → glTF 2.0 (.glb)")
print("      Options: Selected Objects, +Y Up, Draco Compression ON")
print("   4. Save to: public/assets/models/animals/rabbit.glb")
print("=" * 50)
