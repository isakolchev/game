import * as THREE from 'three'
import * as CANNON from 'cannon-es'

const BALL_SPEED    = 25
const BALL_LIFETIME = 4
const BALL_RADIUS   = 0.15

const ballGeo = new THREE.SphereGeometry(BALL_RADIUS, 8, 8)
const ballMat = new THREE.MeshLambertMaterial({ color: 0xff4400 })

export class BallShooter {
  constructor(scene, world, camera, enemyBodyMap, onKill) {
    this._scene        = scene
    this._world        = world
    this._camera       = camera
    this._enemyBodyMap = enemyBodyMap
    this._onKill       = onKill
    this._balls        = []
    // pre-allocated
    this._dir      = new THREE.Vector3()
    this._startPos = new THREE.Vector3()

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.pointerLockElement) this._shoot()
    })
  }

  _shoot() {
    this._camera.getWorldDirection(this._dir)
    this._startPos.copy(this._camera.position).addScaledVector(this._dir, 0.6)

    const mesh = new THREE.Mesh(ballGeo, ballMat.clone())
    mesh.castShadow = true
    mesh.position.copy(this._startPos)
    this._scene.add(mesh)

    const body = new CANNON.Body({
      mass: 0.5,
      shape: new CANNON.Sphere(BALL_RADIUS),
      position: new CANNON.Vec3(this._startPos.x, this._startPos.y, this._startPos.z),
      linearDamping: 0.0,
    })
    const d = this._dir
    body.velocity.set(d.x * BALL_SPEED, d.y * BALL_SPEED, d.z * BALL_SPEED)
    this._world.addBody(body)

    const ball = { mesh, body, age: 0, dead: false }

    body.addEventListener('collide', (e) => {
      if (ball.dead) return
      const enemy = this._enemyBodyMap.get(e.body)
      if (enemy) {
        const killed = enemy.takeDamage(1)
        if (killed) this._onKill()
        this._removeBall(ball)
      }
    })

    this._balls.push(ball)
  }

  _removeBall(ball) {
    if (ball.dead) return
    ball.dead = true
    this._scene.remove(ball.mesh)
    this._world.removeBody(ball.body)
  }

  update(delta) {
    for (const ball of this._balls) {
      if (ball.dead) continue
      ball.age += delta
      if (ball.age >= BALL_LIFETIME) { this._removeBall(ball); continue }
      ball.mesh.position.set(ball.body.position.x, ball.body.position.y, ball.body.position.z)
    }
    this._balls = this._balls.filter(b => !b.dead)
  }
}
