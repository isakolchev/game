import * as THREE from 'three'
import { Enemy } from './Enemy.js'

export class EnemySpawner {
  constructor(scene, world, enemyBodyMap, gltfs, onDamagePlayer) {
    this._scene          = scene
    this._world          = world
    this._bodyMap        = enemyBodyMap
    this._gltfs          = gltfs
    this._onDamagePlayer = onDamagePlayer
    this._enemies        = []
    this._spawnTimer     = 0
    this._diffTimer      = 0
    this._interval       = 3.5
    this._batchSize      = 1
  }

  update(delta, playerPos) {
    this._spawnTimer += delta
    this._diffTimer  += delta

    if (this._diffTimer >= 30) {
      this._diffTimer = 0
      this._interval  = Math.max(1.0, this._interval - 0.5)
      this._batchSize = Math.min(4, this._batchSize + 1)
    }

    if (this._spawnTimer >= this._interval) {
      this._spawnTimer = 0
      for (let i = 0; i < this._batchSize; i++) this._spawnOne(playerPos)
    }

    this._enemies = this._enemies.filter(e => !e.update(delta, playerPos))
  }

  _spawnOne(playerPos) {
    const angle = Math.random() * Math.PI * 2
    const dist  = 14 + Math.random() * 6
    const pos = new THREE.Vector3(
      playerPos.x + Math.cos(angle) * dist,
      1.0,
      playerPos.z + Math.sin(angle) * dist,
    )
    this._enemies.push(new Enemy(this._scene, this._world, this._bodyMap, pos, this._gltfs, this._onDamagePlayer))
  }

  get count() { return this._enemies.length }
}
