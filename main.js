// main.js - Proyecto Mapa Estelar 3D (Three.js + Vite)
// =============================================
// Requiere: npm install three
//           npm install three/examples/jsm/loaders/GLTFLoader
//           npm install three/examples/jsm/controls/OrbitControls
// =============================================

// === Imports esenciales ===
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// === Data de objetos celestes ===
import { celestialObjects } from './data.js';

// === Elementos DOM ===
const container = document.getElementById('star-canvas');
const infoText = document.getElementById('info-text');

// === Escena, cámara y renderizador ===
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  60,
  container.offsetWidth / container.offsetHeight,
  0.1,
  10000
);
camera.position.set(0, 0, 600);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(container.offsetWidth, container.offsetHeight);
container.appendChild(renderer.domElement);

// === OrbitControls para rotación interactiva ===
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // movimiento suave
controls.dampingFactor = 0.05;

// === Luz principal ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(200, 300, 400);
scene.add(directionalLight);

// === Loader de modelos GLB ===
const gltfLoader = new GLTFLoader();

// === Función para determinar ruta de modelo según tipo y nombre ===
// Convención de nombres (assets/):
// - Planetas: assets/planets/{name}.glb
// - Lunas:    assets/moons/{name}.glb
// - Estrellas:assets/stars/{name}.glb
// Ejemplo: assets/planets/earth.glb, assets/moons/moon.glb, assets/stars/sun.glb
function getModelPath(obj) {
  const normalized = obj.name
    .toLowerCase()
    .replace(/\s+/g, '') // espacios fuera
    .replace(/[^a-z0-9]/gi, ''); // solo alfanumérico
  if (obj.type === 'planet') return `assets/planets/${normalized}.glb`;
  if (obj.type === 'moon') return `assets/moons/${normalized}.glb`;
  if (obj.type === 'star') return `assets/stars/${normalized}.glb`;
  return null;
}

// === Grupo para objetos celestes ===
const objectsGroup = new THREE.Group();
scene.add(objectsGroup);

// === Material temporal para puntos ===
const tempMaterials = {
  planet: new THREE.MeshStandardMaterial({ color: 0x4f83ff, emissive: 0x182f50 }),
  moon: new THREE.MeshStandardMaterial({ color: 0x93c5fd, emissive: 0x3b82f6 }),
  star: new THREE.MeshStandardMaterial({ color: 0xffef5e, emissive: 0xffd700 }),
  nebula: new THREE.MeshStandardMaterial({ color: 0x7e22ce, emissive: 0xa78bfa }),
};

// === Tamaños estándar para cada tipo ===
const typeScale = {
  planet: 7,
  moon: 4,
  star: 14,
  nebula: 22,
};

// === Almacenar referencias para interacción ===
const objectRefs = [];

// === Carga de objetos celestes ===
celestialObjects.forEach((obj, idx) => {
  // Intenta cargar el modelo GLB
  const modelPath = getModelPath(obj);
  gltfLoader.load(
    modelPath,
    // Si carga exitosamente el modelo
    (gltf) => {
      const model = gltf.scene;
      model.position.set(obj.x, obj.y, obj.z);
      model.scale.setScalar(typeScale[obj.type] || 6);
      model.userData = { ...obj };
      objectsGroup.add(model);
      objectRefs.push(model);
    },
    undefined,
    // Si falla la carga, usa punto temporal
    () => {
      const geometry = new THREE.SphereGeometry(typeScale[obj.type] || 6, 24, 24);
      const mesh = new THREE.Mesh(geometry, tempMaterials[obj.type] || tempMaterials.planet);
      mesh.position.set(obj.x, obj.y, obj.z);
      mesh.userData = { ...obj };
      objectsGroup.add(mesh);
      objectRefs.push(mesh);
    }
  );
});

// === Ejemplo de cómo añadir más modelos GLB ===
// ---------------------------------------------
// 1. Coloca el archivo GLB en la carpeta correspondiente:
//    assets/planets/earth.glb
//    assets/moons/moon.glb
//    assets/stars/sun.glb
// 2. Asegúrate que el nombre (en data.js) coincida con el nombre de archivo GLB (todo en minúsculas, sin espacios ni símbolos).
//    Ejemplo: { name: "Earth", type: "planet", ... } --> assets/planets/earth.glb
// 3. Agrega el objeto en celestialObjects de data.js.
// 4. El sistema intentará cargar el modelo automáticamente.

// === Ejemplo de carga con comentarios ===
//    // assets/planets/earth.glb  ← poner aquí el modelo GLB de la Tierra
//    // assets/moons/moon.glb     ← poner aquí el modelo GLB de la Luna
//    // assets/stars/sun.glb      ← poner aquí el modelo GLB del Sol

// === Interacción: mostrar info al hacer click ===
renderer.domElement.addEventListener('pointerdown', (event) => {
  // Convierte click a coordenadas normalizadas
  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  // Raycaster para detectar objetos
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(objectsGroup.children, true);

  if (intersects.length > 0) {
    // Busca el objeto principal (puede estar anidado en GLTF)
    let obj = intersects[0].object;
    while (obj.parent && obj.parent.userData && obj.parent !== objectsGroup) {
      obj = obj.parent;
    }
    const data = obj.userData;
    if (data && infoText) {
      infoText.innerHTML = `
        <strong>${data.name}</strong> <br>
        Tipo: ${data.type} <br>
        Constelación: ${data.constellation || 'N/A'} <br>
