import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export class Player {
  constructor(world, camera, startPos = { x: 0, y: 1.5, z: 5 }) {
    this._camera = camera
    this._keys = {}
    this._jumpCooldown = 0
    this._euler = new THREE.Euler(0, 0, 0, 'YXZ')
    // pre-allocated to avoid per-frame GC
    this._front   = new THREE.Vector3()
    this._right   = new THREE.Vector3()
    this._moveDir = new THREE.Vector3()
    this._up      = new THREE.Vector3(0, 1, 0)

    this.body = new CANNON.Body({
      mass: 70,
      shape: new CANNON.Sphere(0.5),
      position: new CANNON.Vec3(startPos.x, startPos.y, startPos.z),
      linearDamping: 0.9,
      angularDamping: 1.0,
    })
    this.body.allowSleep = false
    world.addBody(this.body)

    this._setupControls()
  }

  _setupControls() {
    document.addEventListener('keydown', (e) => { this._keys[e.code] = true })
    document.addEventListener('keyup',   (e) => { this._keys[e.code] = false })

    const PI_2 = Math.PI / 2
    document.addEventListener('mousemove', (e) => {
      if (!document.pointerLockElement) return
      this._euler.setFromQuaternion(this._camera.quaternion)
      this._euler.y -= e.movementX * 0.002
      this._euler.x -= e.movementY * 0.002
      this._euler.x = Math.max(-PI_2, Math.min(PI_2, this._euler.x))
      this._camera.quaternion.setFromEuler(this._euler)
    })
  }

  update(delta) {
    const speed = 8
    this._jumpCooldown = Math.max(0, this._jumpCooldown - delta)

    this._camera.getWorldDirection(this._front)
    this._front.y = 0
    this._front.normalize()
    this._right.crossVectors(this._front, this._up).normalize()

    this._moveDir.set(0, 0, 0)
    if (this._keys['KeyW']) this._moveDir.addScaledVector(this._front, 1)
    if (this._keys['KeyS']) this._moveDir.addScaledVector(this._front, -1)
    if (this._keys['KeyA']) this._moveDir.addScaledVector(this._right, -1)
    if (this._keys['KeyD']) this._moveDir.addScaledVector(this._right, 1)

    if (this._moveDir.lengthSq() > 0) {
      this._moveDir.normalize()
      this.body.velocity.x = this._moveDir.x * speed
      this.body.velocity.z = this._moveDir.z * speed
    }

    if (this._keys['Space'] && this._jumpCooldown === 0 && Math.abs(this.body.velocity.y) < 1) {
      this.body.velocity.y = 7
      this._jumpCooldown = 0.8
    }

    this._camera.position.set(
      this.body.position.x,
      this.body.position.y + 1.2,
      this.body.position.z,
    )
  }

  get position() { return this.body.position }
}
