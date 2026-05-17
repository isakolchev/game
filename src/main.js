import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Player } from './Player.js'
import { BallShooter } from './BallShooter.js'
import { EnemySpawner } from './EnemySpawner.js'
import { Level } from './Level.js'
import { loadAssets } from './AssetLoader.js'

// --- Renderer ---
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

// --- Scene ---
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x1a1008)
scene.fog = new THREE.Fog(0x1a1008, 15, 45)

// --- Camera ---
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200)

// --- Lights ---
const sun = new THREE.DirectionalLight(0xfff5e0, 0.8)
sun.position.set(5, 20, 5)
sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048)
sun.shadow.camera.near = 0.5
sun.shadow.camera.far = 80
sun.shadow.camera.left = -30
sun.shadow.camera.right = 30
sun.shadow.camera.top = 30
sun.shadow.camera.bottom = -30
scene.add(sun, new THREE.AmbientLight(0x4a3820, 1.2))

// --- Physics ---
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = true

// Бесконечная плоскость — страховка чтобы игрок не провалился
const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() })
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
world.addBody(groundBody)

// --- DOM ---
const overlay     = document.getElementById('overlay')
const overlayMsg  = document.getElementById('overlay-msg')
const hud         = document.getElementById('hud')
const crosshair   = document.getElementById('crosshair')
const hudEnemies  = document.getElementById('hud-enemies')
const hudScore    = document.getElementById('hud-score')
const hudHpFill   = document.getElementById('hud-hp-fill')
const deathScreen = document.getElementById('death-screen')
const deathScore  = document.getElementById('death-score')
const restartBtn  = document.getElementById('restart-btn')

// --- Pointer lock ---
let gameReady = false

overlay.addEventListener('click', () => {
  if (!gameReady) return
  renderer.domElement.requestPointerLock()
})

document.addEventListener('pointerlockchange', () => {
  const locked = document.pointerLockElement === renderer.domElement
  overlay.classList.toggle('hidden', locked)
  hud.classList.toggle('visible', locked)
  crosshair.style.display = locked ? 'block' : 'none'
})

// --- Загрузка ассетов ---
overlayMsg.textContent = 'Загрузка...'

let gltfs
try {
  gltfs = await loadAssets()
  console.log('Анимации в rabbit.glb:', gltfs.rabbit.animations.map(a => a.name))
} catch (e) {
  console.error('Ошибка загрузки ассетов:', e)
  overlayMsg.textContent = 'Ошибка загрузки. Проверь консоль (F12).'
  throw e
}

overlayMsg.textContent = 'Нажмите, чтобы начать'
gameReady = true

// --- Уровень ---
const level = new Level(scene, world, gltfs.level)

// --- HP ---
const MAX_HP = 100
let hp    = MAX_HP
let score = 0
let alive = true

function onDamagePlayer(amount) {
  if (!alive) return
  hp = Math.max(0, hp - amount)
  const pct = hp / MAX_HP
  hudHpFill.style.width = (pct * 100) + '%'
  hudHpFill.style.background = pct > 0.5 ? '#4cdb6a' : pct > 0.25 ? '#f0a500' : '#e03030'
  if (hp === 0) onDeath()
}

function onDeath() {
  alive = false
  document.exitPointerLock()
  hud.classList.remove('visible')
  crosshair.style.display = 'none'
  deathScore.textContent = score
  deathScreen.classList.remove('hidden')
}

restartBtn.addEventListener('click', () => location.reload())

// --- Игровые модули ---
const enemyBodyMap = new Map()

// Игрок стартует в центре стартовой комнаты (комната 1: X:-5..5, Z:-5..5)
const player  = new Player(world, camera, { x: 0, y: 1.5, z: 0 })
const shooter = new BallShooter(scene, world, camera, enemyBodyMap, () => {
  score++
  hudScore.textContent = score
})
const spawner = new EnemySpawner(scene, world, enemyBodyMap, gltfs, onDamagePlayer)

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// --- Game loop ---
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  const delta = Math.min(clock.getDelta(), 0.05)

  renderer.render(scene, camera)
  if (!alive) return

  world.step(1 / 60, delta, 3)
  player.update(delta)
  shooter.update(delta)
  spawner.update(delta, player.position)
  hudEnemies.textContent = spawner.count
}

animate()
