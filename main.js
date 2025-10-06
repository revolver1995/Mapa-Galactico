import './style.css';
import * as THREE from 'three';
import { celestialObjects } from './data.js';

let scene, camera, renderer, raycaster, mouse;
let celestialMeshes = [];
let controls = {
  showStars: true,
  showPlanets: true,
  showMoons: true,
  showNebulas: true,
  sectors: [1, 2, 3, 4, 5],
  scale: 1,
  gridVisible: true,
  autoRotate: false,
  rotationSpeed: 1
};

let gridHelper;
let selectedObject = null;
let rotationAngle = 0;
let isDragging = false;

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000510);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  camera.position.set(800, 600, 800);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById('star-canvas'),
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  addLights();
  createStarfield();
  createGrid();
  createCelestialObjects();
  setupEventListeners();

  animate();
}

function addLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambientLight);

  const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  directionalLight.position.set(500, 500, 500);
  scene.add(directionalLight);
}

function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    sizeAttenuation: false
  });

  const starsVertices = [];
  for (let i = 0; i < 5000; i++) {
    const x = (Math.random() - 0.5) * 8000;
    const y = (Math.random() - 0.5) * 8000;
    const z = (Math.random() - 0.5) * 8000;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
  const starField = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(starField);
}

function createGrid() {
  gridHelper = new THREE.GridHelper(10000, 100, 0x444444, 0x222222);
  scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(1000);
  scene.add(axesHelper);
}

function createCelestialObjects() {
  celestialObjects.forEach(obj => {
    const mesh = createCelestialMesh(obj);
    if (mesh) {
      mesh.userData = obj;
      scene.add(mesh);
      celestialMeshes.push(mesh);
    }
  });
}

function createCelestialMesh(obj) {
  let geometry, material, size, color;

  switch (obj.type) {
    case 'star':
      size = obj.distance === 0 ? 20 : 8 + (obj.distance / 10);
      geometry = new THREE.SphereGeometry(size, 16, 16);
      color = obj.distance === 0 ? 0xffff00 : 0xff6600;
      material = new THREE.MeshBasicMaterial({ color });

      if (obj.distance === 0) {
        const glowGeometry = new THREE.SphereGeometry(size * 2, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: 0xffaa00,
          transparent: true,
          opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.add(glow);
        mesh.position.set(obj.x, obj.y, obj.z);
        return mesh;
      }
      break;

    case 'planet':
      size = 4 + (obj.distance / 30);
      geometry = new THREE.SphereGeometry(size, 12, 12);
      color = 0x4488ff;
      material = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.7 });
      break;

    case 'moon':
      size = 2 + (obj.distance / 50);
      geometry = new THREE.SphereGeometry(size, 8, 8);
      color = 0x888888;
      material = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.9 });
      break;

    case 'nebula':
      size = 15 + (obj.distance / 20);
      geometry = new THREE.SphereGeometry(size, 16, 16);
      color = 0xff00ff;
      material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.4,
        wireframe: true
      });
      break;

    default:
      return null;
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(obj.x, obj.y, obj.z);

  return mesh;
}

function updateVisibility() {
  celestialMeshes.forEach(mesh => {
    const obj = mesh.userData;

    let typeVisible = false;
    switch (obj.type) {
      case 'star': typeVisible = controls.showStars; break;
      case 'planet': typeVisible = controls.showPlanets; break;
      case 'moon': typeVisible = controls.showMoons; break;
      case 'nebula': typeVisible = controls.showNebulas; break;
    }

    const sectorVisible = controls.sectors.includes(obj.sector);
    mesh.visible = typeVisible && sectorVisible;
  });
}

function setupEventListeners() {
  document.getElementById('show-stars').addEventListener('change', e => {
    controls.showStars = e.target.checked;
    updateVisibility();
  });

  document.getElementById('show-planets').addEventListener('change', e => {
    controls.showPlanets = e.target.checked;
    updateVisibility();
  });

  document.getElementById('show-moons').addEventListener('change', e => {
    controls.showMoons = e.target.checked;
    updateVisibility();
  });

  document.getElementById('show-nebulas').addEventListener('change', e => {
    controls.showNebulas = e.target.checked;
    updateVisibility();
  });

  document.querySelectorAll('.sector').forEach(checkbox => {
    checkbox.addEventListener('change', e => {
      const sector = parseInt(e.target.value);
      if (e.target.checked) {
        controls.sectors.push(sector);
      } else {
        controls.sectors = controls.sectors.filter(s => s !== sector);
      }
      updateVisibility();
    });
  });

  document.getElementById('scale').addEventListener('input', e => {
    controls.scale = parseFloat(e.target.value);
    celestialMeshes.forEach(mesh => {
      const obj = mesh.userData;
      mesh.position.set(obj.x * controls.scale, obj.y * controls.scale, obj.z * controls.scale);
    });
  });

  document.getElementById('reset-view').addEventListener('click', () => {
    camera.position.set(800, 600, 800);
    camera.lookAt(0, 0, 0);
  });

  document.getElementById('toggle-grid').addEventListener('click', () => {
    controls.gridVisible = !controls.gridVisible;
    gridHelper.visible = controls.gridVisible;
  });

  document.getElementById('toggle-rotation').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    const button = document.getElementById('toggle-rotation');
    button.textContent = controls.autoRotate ? '⏸️ Pausar Rotación' : '🔄 Rotación Automática';
  });

  document.getElementById('rotation-speed').addEventListener('input', e => {
    controls.rotationSpeed = parseFloat(e.target.value);
  });

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onMouseClick);

  let previousMousePosition = { x: 0, y: 0 };

  renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    controls.autoRotate = false;
    const button = document.getElementById('toggle-rotation');
    button.textContent = '🔄 Rotación Automática';
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });

  renderer.domElement.addEventListener('mouseup', () => {
    isDragging = false;
  });

  renderer.domElement.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      const rotationSpeed = 0.005;
      const radius = Math.sqrt(
        camera.position.x ** 2 +
        camera.position.y ** 2 +
        camera.position.z ** 2
      );

      const theta = Math.atan2(camera.position.x, camera.position.z) - deltaX * rotationSpeed;
      const phi = Math.acos(camera.position.y / radius) + deltaY * rotationSpeed;

      camera.position.x = radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = radius * Math.cos(phi);
      camera.position.z = radius * Math.sin(phi) * Math.cos(theta);

      camera.lookAt(0, 0, 0);

      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  });

  renderer.domElement.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 50;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    if (e.deltaY < 0) {
      camera.position.addScaledVector(direction, zoomSpeed);
    } else {
      camera.position.addScaledVector(direction, -zoomSpeed);
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onMouseClick() {
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(celestialMeshes);

  if (intersects.length > 0) {
    const obj = intersects[0].object.userData;
    displayObjectInfo(obj);

    if (selectedObject) {
      selectedObject.material.emissive = new THREE.Color(0x000000);
    }

    selectedObject = intersects[0].object;
    if (selectedObject.material.emissive) {
      selectedObject.material.emissive = new THREE.Color(0x444444);
    }
  }
}

function displayObjectInfo(obj) {
  const typeEmoji = {
    star: '⭐',
    planet: '🪐',
    moon: '🌙',
    nebula: '💫'
  };

  document.getElementById('info-text').innerHTML = `
    <strong>${typeEmoji[obj.type]} ${obj.name}</strong><br/>
    <em>${obj.constellation}</em><br/>
    Tipo: ${obj.type}<br/>
    Coordenadas: (${obj.x}, ${obj.y}, ${obj.z})<br/>
    Distancia: ${obj.distance} años luz<br/>
    Sector: ${obj.sector === 0 ? 'Sistema Solar' : obj.sector}
  `;
}

function animate() {
  requestAnimationFrame(animate);

  if (controls.autoRotate && !isDragging) {
    rotationAngle += 0.001 * controls.rotationSpeed;
    const radius = Math.sqrt(
      camera.position.x ** 2 +
      camera.position.y ** 2 +
      camera.position.z ** 2
    );

    const currentPhi = Math.acos(camera.position.y / radius);

    camera.position.x = radius * Math.sin(currentPhi) * Math.sin(rotationAngle);
    camera.position.z = radius * Math.sin(currentPhi) * Math.cos(rotationAngle);

    camera.lookAt(0, 0, 0);
  }

  celestialMeshes.forEach(mesh => {
    if (mesh.userData.type === 'star' && mesh.userData.distance > 0) {
      mesh.rotation.y += 0.001;
    }
    if (mesh.userData.type === 'planet') {
      mesh.rotation.y += 0.005;
    }
  });

  renderer.render(scene, camera);
}

init();
