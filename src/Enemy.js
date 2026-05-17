import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js'

// Если персонаж выглядит слишком большим или маленьким — измени это значение.
// Mixamo FBX с применёнными трансформами обычно ~1.7 единиц в высоту (норм).
// Если персонаж огромный (170 единиц) — поставь 0.01.
const MODEL_SCALE = 1.0

const DEATH_DURATION = 0.5

export class Enemy {
  constructor(scene, world, enemyBodyMap, position, gltfs, onDamagePlayer) {
    this.hp       = 3
    this.dead     = false
    this._speed   = 2.5
    this._scene   = scene
    this._world   = world
    this._bodyMap = enemyBodyMap
    this._deathT  = 0
    this._damageCooldown = 0       // чтобы не снимать HP каждый кадр
    this._onDamagePlayer = onDamagePlayer

    // ── Модель ──────────────────────────────────────────────────────────────
    // skeletonClone нужен для skinned mesh — обычный clone() ломает анимации
    this.mesh = skeletonClone(gltfs.rabbit.scene)
    this.mesh.scale.setScalar(MODEL_SCALE)
    this.mesh.position.copy(position)
    this.mesh.castShadow = true
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.material = child.material.clone() // у каждого врага свой материал
        child.castShadow = true
        child.receiveShadow = true
      }
    })
    scene.add(this.mesh)

    // ── Анимация ─────────────────────────────────────────────────────────────
    this._mixer = new THREE.AnimationMixer(this.mesh)
    const clips = gltfs.rabbit.animations
    const clip = THREE.AnimationClip.findByName(clips, 'run') ?? clips[0]
    if (clip) {
      // Убираем root motion: position-трек на корневой кости (Hips/Root)
      // двигает меш в мировом пространстве и конфликтует с физикой
      clip.tracks = clip.tracks.filter(t =>
        !(t.name.toLowerCase().includes('hips') && t.name.endsWith('.position')) &&
        !(t.name.toLowerCase().includes('root') && t.name.endsWith('.position'))
      )
      this._mixer.clipAction(clip).play()
    } else {
      console.warn('Enemy: анимация не найдена в rabbit.glb')
    }

    // ── Физика ───────────────────────────────────────────────────────────────
    this.body = new CANNON.Body({
      mass: 5,
      shape: new CANNON.Cylinder(0.35, 0.35, 1.6, 8),
      position: new CANNON.Vec3(position.x, position.y, position.z),
      linearDamping: 0.9,
      angularDamping: 1.0,
    })
    this.body.allowSleep = false
    world.addBody(this.body)
    enemyBodyMap.set(this.body, this)
  }

  // Возвращает true если этот удар убил врага
  takeDamage(amount) {
    if (this.dead) return false
    this.hp -= amount

    // вспышка белого
    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.material.emissive?.setHex(0xffffff)
        setTimeout(() => child.material.emissive?.setHex(0x000000), 80)
      }
    })

    if (this.hp <= 0) {
      this._startDeath()
      return true
    }
    return false
  }

  _startDeath() {
    this.dead = true
    this._world.removeBody(this.body)
    this._bodyMap.delete(this.body)
    this._mixer.stopAllAction()
  }

  // Возвращает true когда анимация смерти завершена — сигнал удалить из списка
  update(delta, playerPos) {
    if (this.dead) {
      this._deathT += delta
      const s = MODEL_SCALE * Math.max(0, 1 - this._deathT / DEATH_DURATION)
      this.mesh.scale.setScalar(s)
      if (this._deathT >= DEATH_DURATION) {
        this._scene.remove(this.mesh)
        return true
      }
      return false
    }

    // AI: движение к игроку
    const dx = playerPos.x - this.body.position.x
    const dz = playerPos.z - this.body.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    this._damageCooldown = Math.max(0, this._damageCooldown - delta)

    if (dist < 1.2) {
      // контакт — наносим урон раз в секунду
      if (this._damageCooldown === 0) {
        this._onDamagePlayer(10)
        this._damageCooldown = 1.0
      }
    } else {
      const inv = 1 / dist
      this.body.velocity.x = dx * inv * this._speed
      this.body.velocity.z = dz * inv * this._speed
      this.mesh.rotation.y = Math.atan2(dx, dz)
    }

    // синхронизация меша с физическим телом
    this.mesh.position.set(
      this.body.position.x,
      this.body.position.y - 0.8, // смещение: центр физ.тела выше низа меша
      this.body.position.z,
    )

    this._mixer.update(delta)
    return false
  }
}
