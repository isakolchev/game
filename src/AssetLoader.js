import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

function loadGLTF(url) {
  return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject))
}

export async function loadAssets() {
  const [rabbit, level] = await Promise.all([
    loadGLTF(import.meta.env.BASE_URL + 'assets/models/animals/rabbit.glb'),
    loadGLTF(import.meta.env.BASE_URL + 'assets/models/environment/level.glb'),
  ])
  return { rabbit, level }
}
