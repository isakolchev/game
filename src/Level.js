import * as THREE from 'three'
import * as CANNON from 'cannon-es'

// Смещение уровня: центрируем стартовую комнату (Blender X:0-10, Y:0-10)
// вокруг начала координат Three.js.
// Blender +Y Up export: Blender Y → Three.js -Z, поэтому offset.z = +5
export const LEVEL_OFFSET = new THREE.Vector3(-5, 0, 5)

export class Level {
  constructor(scene, world, gltf) {
    this._bodies = []

    // ── Визуал ────────────────────────────────────────────────────────────────
    this.mesh = gltf.scene
    this.mesh.position.copy(LEVEL_OFFSET)
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.receiveShadow = true
        child.castShadow   = false
      }
    })
    scene.add(this.mesh)

    // ── Физика — box-коллайдер для каждого меша уровня ───────────────────────
    // Уровень состоит только из box-примитивов, поэтому bounding box = точная форма.
    this.mesh.updateMatrixWorld(true)

    const bbox   = new THREE.Box3()
    const size   = new THREE.Vector3()
    const center = new THREE.Vector3()

    this.mesh.traverse(child => {
      if (!child.isMesh) return

      bbox.setFromObject(child)  // world space, уже включает LEVEL_OFFSET
      bbox.getSize(size)
      bbox.getCenter(center)

      // Очень тонкие слэбы пропускаем (декоративные элементы толщиной < 0.05)
      if (size.x < 0.05 || size.y < 0.05 || size.z < 0.05) return

      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2)),
        position: new CANNON.Vec3(center.x, center.y, center.z),
      })
      world.addBody(body)
      this._bodies.push(body)
    })

    console.log(`Level: ${this._bodies.length} physics bodies created`)
  }
}
