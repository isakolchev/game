"""
Level generator: Doors-style map for Animal Ball Shooter.
Run in Blender: Scripting tab → Open → level_gen.py → Run Script

Цвета подобраны под референс (тёмное дерево, пурпурный зал, бирюзовая стартовая).
Материалы корректно экспортируются в GLB (Principled BSDF + Base Color).

После запуска:
  1. A → Ctrl+A → All Transforms
  2. File → Export → glTF 2.0 (.glb)
     ✓ +Y Up  ✓ Apply Modifiers  ✓ Materials  ✓ Draco Compression
  3. Сохрани в: public/assets/models/environment/level.glb
"""

import bpy

# ── Clear ──────────────────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for m in list(bpy.data.materials): bpy.data.materials.remove(m)

# ── Constants ──────────────────────────────────────────────────────────────────
WT = 0.2   # wall thickness
DW = 1.8   # door width
DH = 2.5   # door height
SH = 3.5   # standard ceiling height
BH = 6.0   # big hall ceiling height

# ── Material factory ───────────────────────────────────────────────────────────
def mat(name, rgb, roughness=0.85, metallic=0.0, emission=None):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    nodes = m.node_tree.nodes
    links = m.node_tree.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value  = (*rgb, 1.0)
    bsdf.inputs['Roughness'].default_value   = roughness
    bsdf.inputs['Metallic'].default_value    = metallic
    if emission:
        bsdf.inputs['Emission Color'].default_value    = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 1.5
    return m

# ── Цветовая палитра (из референса) ───────────────────────────────────────────

# Полы — тёмное дерево, разные оттенки по комнатам
FL_START  = mat('FL_Start',   (0.10, 0.07, 0.04), roughness=0.65)  # тёмный дуб
FL_TEAL   = mat('FL_Teal',    (0.04, 0.16, 0.16), roughness=0.40)  # бирюзовый бассейн/ковёр
FL_WARD   = mat('FL_Ward',    (0.16, 0.11, 0.06), roughness=0.70)  # тёплое дерево
FL_TRAP   = mat('FL_Trap',    (0.14, 0.09, 0.05), roughness=0.72)  # тёмный паркет
FL_CORR   = mat('FL_Corr',    (0.06, 0.04, 0.02), roughness=0.80)  # почти чёрный (тёмный коридор)
FL_LIB    = mat('FL_Lib',     (0.20, 0.13, 0.07), roughness=0.60)  # библиотека — светлее
FL_HALL   = mat('FL_Hall',    (0.16, 0.06, 0.18), roughness=0.55)  # большой зал — пурпурный
FL_SAFE   = mat('FL_Safe',    (0.13, 0.09, 0.05), roughness=0.68)  # комната сейфа
FL_SPARK  = mat('FL_Spark',   (0.12, 0.08, 0.04), roughness=0.72)  # комната с искрой
FL_EXIT   = mat('FL_Exit',    (0.06, 0.22, 0.06), roughness=0.75)  # зелёный выход

# Потолки — очень тёмные, почти чёрные
CL_STD    = mat('CL_Std',     (0.05, 0.04, 0.03), roughness=0.95)  # стандартный
CL_HALL   = mat('CL_Hall',    (0.04, 0.02, 0.05), roughness=0.95)  # зал — с фиолетовым

# Стены — единый тёмный камень/штукатурка
M_WALL    = mat('Wall',       (0.20, 0.15, 0.10), roughness=0.90)

# Свет в тёмном коридоре — маленький эмиссивный объект
FL_LAMP   = mat('LampGlow',   (0.30, 0.18, 0.06), roughness=0.5,
                emission=(0.80, 0.45, 0.10))

# ── Box primitive ──────────────────────────────────────────────────────────────
_n = [0]
def box(name, cx, cy, cz, sx, sy, sz, m):
    bpy.ops.mesh.primitive_cube_add(location=(cx, cy, cz))
    obj = bpy.context.active_object
    _n[0] += 1
    obj.name = f'{name}_{_n[0]:03d}'
    obj.scale = (sx/2, sy/2, sz/2)
    bpy.ops.object.transform_apply(scale=True)
    obj.data.materials.clear()
    obj.data.materials.append(m)
    return obj

# ── Geometry helpers ───────────────────────────────────────────────────────────
def slab(tag, x1, y1, x2, y2, z, m):
    box(tag, (x1+x2)/2, (y1+y2)/2, z, x2-x1, y2-y1, WT, m)

def seg(tag, x1, y1, x2, y2, z0, z1, m=None):
    box(tag, (x1+x2)/2, (y1+y2)/2, (z0+z1)/2, x2-x1, y2-y1, z1-z0, m or M_WALL)

def wall_ns(tag, x1, x2, y, h, door_x=None):
    y2 = y + WT
    if door_x is None:
        seg(tag, x1, y, x2, y2, 0, h)
        return
    d0, d1 = door_x - DW/2, door_x + DW/2
    if d0 > x1:  seg(f'{tag}L', x1, y, d0, y2, 0, h)
    if d1 < x2:  seg(f'{tag}R', d1, y, x2, y2, 0, h)
    if h > DH:   seg(f'{tag}T', d0, y, d1, y2, DH, h)

def wall_ew(tag, y1, y2, x, h, door_y=None):
    x2 = x + WT
    if door_y is None:
        seg(tag, x, y1, x2, y2, 0, h)
        return
    d0, d1 = door_y - DW/2, door_y + DW/2
    if d0 > y1:  seg(f'{tag}B', x, y1, x2, d0, 0, h)
    if d1 < y2:  seg(f'{tag}A', x, d1, x2, y2, 0, h)
    if h > DH:   seg(f'{tag}T', x, d0, x2, d1, DH, h)

def room(tag, x1, y1, x2, y2, h,
         dS=None, dN=None, dW=None, dE=None,
         fl=None, cl=None):
    slab(f'{tag}_FL', x1, y1, x2, y2, 0,       fl or FL_START)
    slab(f'{tag}_CL', x1, y1, x2, y2, h,       cl or CL_STD)
    wall_ns(f'{tag}_S', x1, x2, y1,      h, dS)
    wall_ns(f'{tag}_N', x1, x2, y2 - WT, h, dN)
    wall_ew(f'{tag}_W', y1, y2, x1,      h, dW)
    wall_ew(f'{tag}_E', y1, y2, x2 - WT, h, dE)

# ── Комнаты ────────────────────────────────────────────────────────────────────

# 1 — Стартовая комната (тёмный дуб + бирюзовый ковёр по центру)
room('R1_Start',  0,  0, 10, 10, SH,
     dN=4.0, dE=4.0, fl=FL_START)
# Бирюзовый элемент по центру стартовой (ковёр / бассейн)
slab('R1_Teal', 1.5, 1.5, 8.5, 8.5, 0.01, FL_TEAL)

# 2 — Гардероб
room('R2_Ward',   0, 10,  7, 17, SH,
     dS=3.5, fl=FL_WARD)

# 3 — Комната с ловушками
room('R3_Trap',  10,  0, 17,  8, SH,
     dW=4.0, dN=12.5, dE=3.0, fl=FL_TRAP)

# 4 — Тёмный коридор (самый тёмный пол)
room('R4_Corr',  10,  8, 15, 20, SH,
     dS=12.5, dN=12.5, fl=FL_CORR)
# Имитация фонаря на полу коридора (эмиссивный диск)
slab('R4_Lamp', 11.5, 13.0, 13.5, 15.0, 0.02, FL_LAMP)

# 5 — Библиотека
room('R5_Lib',   10, 20, 18, 26, SH,
     dS=12.5, dE=23.0, fl=FL_LIB)

# 6 — Большой зал (высокий потолок, пурпурный)
room('R6_Hall',  18, 17, 30, 26, BH,
     dW=23.0, dS=26.0, fl=FL_HALL, cl=CL_HALL)

# 7 — Комната сейфа
room('R7_Safe',  23,  9, 30, 17, SH,
     dN=26.0, dS=26.0, fl=FL_SAFE)

# 8 — Комната с искрой
room('R8_Spark', 23,  1, 30,  9, SH,
     dN=26.0, dW=3.0, fl=FL_SPARK)

# 9 — Выход
room('R9_Exit',  17,  1, 23,  5, SH,
     dW=3.0, dE=3.0, dS=20.0, fl=FL_EXIT)

# ── Коллекция ──────────────────────────────────────────────────────────────────
col = bpy.data.collections.new('Level')
bpy.context.scene.collection.children.link(col)
for obj in list(bpy.context.scene.collection.objects):
    bpy.context.scene.collection.objects.unlink(obj)
    col.objects.link(obj)

# ── Готово ─────────────────────────────────────────────────────────────────────
print('=' * 54)
print(f'✓  Level generated — {_n[0]} objects, 14 materials')
print()
print('   Palette:')
print('   · Старт    — тёмный дуб + бирюзовый ковёр')
print('   · Коридор  — почти чёрный + свет фонаря')
print('   · Библ.    — тёплое светлое дерево')
print('   · Зал      — пурпурный пол, тёмный потолок')
print('   · Выход    — зелёный пол')
print()
print('   Экспорт:')
print('   File → Export → glTF 2.0 (.glb)')
print('   ✓ +Y Up  ✓ Apply Modifiers')
print('   ✓ Materials  ✓ Draco Compression')
print('   → public/assets/models/environment/level.glb')
print('=' * 54)
