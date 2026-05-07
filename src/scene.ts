import * as THREE from 'three';
import { Pane } from 'tweakpane';
import { GAME_CONFIG } from './config.js';

// To avoid too large, keep here for now.

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;
let floorMesh: THREE.Mesh;
let playerMesh: THREE.Mesh;
let activeEnemyMesh: THREE.Mesh;
const billboardMeshes: THREE.Mesh[] = [];

export { scene, camera, renderer, clock, floorMesh, playerMesh, activeEnemyMesh, billboardMeshes };

export function setupThreeScene(domContainer: HTMLElement) {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#0a1820");
  scene.fog = new THREE.Fog("#0a1820", 22, 56);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, GAME_CONFIG.camera.verticalDistance, GAME_CONFIG.camera.followDistance);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  domContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const ambient = new THREE.AmbientLight("#f1ffe0", 0.75);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#ffe8bf", 1.05);
  sun.position.set(20, 26, 12);
  scene.add(sun);

  buildWorldGeometry();
  createOrReplacePlayerMesh("Warrior");

  window.addEventListener("resize", handleResize);

  // Tweakpane debug - commented out for tsc fix
  // const pane = new Pane();
  // pane.addBinding(camera.position, 'x', { min: -50, max: 50, step: 0.1 });
  // etc.
}

export function buildWorldGeometry() {
  if (floorMesh) {
    scene.remove(floorMesh);
  }

  const floorTexture = createFloorTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(18, 18);

  const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
  const floorSize = GAME_CONFIG.world.mapHalfExtent * 2;
  floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  scene.add(floorMesh);

  const propGroup = new THREE.Group();
  const treeCount = 34;
  for (let i = 0; i < treeCount; i += 1) {
    const treeTexture = createTreeTexture();
    const tree = createBillboardMesh(treeTexture, 2, 3.4);
    tree.position.x = randomInt(-21, 21);
    tree.position.z = randomInt(-21, 21);
    tree.position.y = 1.7;
    propGroup.add(tree);
  }
  scene.add(propGroup);
}

export function createOrReplacePlayerMesh(className: string) {
  if (playerMesh) {
    removeBillboard(playerMesh);
    scene.remove(playerMesh);
  }
  const texture = createCharacterTexture(className);
  playerMesh = createBillboardMesh(texture, 2.0, 2.0); // Square mesh for 16-bit

  // Set view to 1/4 of the width and 1/8 of the height
  const material = playerMesh.material as THREE.MeshBasicMaterial;
  material.map.repeat.set(1 / 4, 1 / 8);
  material.map.offset.set(0, 7 / 8); // Start at row 0 (Down)

  playerMesh.position.set(0, 1, 0);
  scene.add(playerMesh);
}

export function createEnemyMesh(isBoss: boolean) {
  clearEnemyMesh();
  const enemyTexture = createEnemyTexture(isBoss);
  activeEnemyMesh = createBillboardMesh(enemyTexture, 2.2, 2.8);
  activeEnemyMesh.position.set(
    playerMesh.position.x + randomInt(-3, 3),
    1.4,
    playerMesh.position.z + randomInt(-3, 3)
  );
  scene.add(activeEnemyMesh);
}

export function clearEnemyMesh() {
  if (!activeEnemyMesh) {
    return;
  }
  removeBillboard(activeEnemyMesh);
  scene.remove(activeEnemyMesh);
  activeEnemyMesh = null;
}

export function createBillboardMesh(texture: THREE.Texture, width: number, height: number): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  billboardMeshes.push(mesh);
  return mesh;
}

export function removeBillboard(mesh: THREE.Mesh) {
  const index = billboardMeshes.indexOf(mesh);
  if (index >= 0) {
    billboardMeshes.splice(index, 1);
  }
}

export function createFloorTexture(): THREE.Texture {
  return createPixelTexture(16, 16, (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 16, 16);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        const isDark = (x + y) % 2 === 0;
        ctx.fillStyle = isDark ? "#375b55" : "#2d4844";
        ctx.fillRect(x, y, 1, 1);
      }
    }

    ctx.fillStyle = "#4d756a";
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(i, 0, 1, 16);
      ctx.fillRect(0, i, 16, 1);
    }
  });
}

export function createCharacterTexture(className: string): THREE.Texture {
  const classConfig = GAME_CONFIG.classes[className] || GAME_CONFIG.classes.Warrior;
  const [light, mid, dark, shadow] = classConfig.color;

  return createPixelTexture(128, 256, (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 128, 256);

    const drawCharacterFrame = (dirRow: number, frameCol: number, direction: string) => {
      const ox = frameCol * 32;
      const oy = dirRow * 32;
      const isStepping = frameCol === 1 || frameCol === 3;
      const stepSide = frameCol === 1 ? 'L' : 'R';
      const bob = isStepping ? 1 : 0;

      // 1. Shadow
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.beginPath();
      ctx.ellipse(ox + 16, oy + 28, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Legs
      ctx.fillStyle = dark;
      if (['down', 'up', 'down-left', 'down-right', 'up-left', 'up-right'].includes(direction)) {
        ctx.fillRect(ox + 10, oy + 22 + bob, 4, 6 - bob);
        ctx.fillRect(ox + 18, oy + 22 + bob, 4, 6 - bob);
      } else {
        ctx.fillRect(ox + 13, oy + 22 + bob, 6, 6 - bob);
      }

      // 3. Torso
      ctx.fillStyle = mid;
      ctx.fillRect(ox + 9, oy + 12 + bob, 14, 11);
      ctx.fillStyle = shadow;
      ctx.fillRect(ox + 9, oy + 21 + bob, 14, 2);

      // 4. Arms & Face (Diagonal Logic)
      ctx.fillStyle = light;

      // Face/Eyes logic
      const hasFace = !direction.includes('up');

      if (direction === 'down-left') {
        ctx.fillRect(ox + 7, oy + 14 + bob, 3, 7); // Back arm
        if (hasFace) {
          ctx.fillStyle = shadow;
          ctx.fillRect(ox + 10, oy + 7 + bob, 2, 2); // Closer eye
          ctx.fillRect(ox + 14, oy + 7 + bob, 2, 2); // Farther eye
        }
      } else if (direction === 'down-right') {
        ctx.fillRect(ox + 22, oy + 14 + bob, 3, 7);
        if (hasFace) {
          ctx.fillStyle = shadow;
          ctx.fillRect(ox + 16, oy + 7 + bob, 2, 2);
          ctx.fillRect(ox + 20, oy + 7 + bob, 2, 2);
        }
      } else if (direction === 'down') {
        const armOffset = isStepping ? (stepSide === 'L' ? -2 : 2) : 0;
        ctx.fillRect(ox + 6, oy + 14 + bob + armOffset, 3, 7);
        ctx.fillRect(ox + 23, oy + 14 + bob - armOffset, 3, 7);
        ctx.fillStyle = shadow;
        ctx.fillRect(ox + 12, oy + 7 + bob, 2, 2);
        ctx.fillRect(ox + 18, oy + 7 + bob, 2, 2);
      } else if (direction.includes('left')) {
        ctx.fillRect(ox + 14, oy + 14 + bob, 3, 8);
        if (hasFace) { ctx.fillStyle = shadow; ctx.fillRect(ox + 11, oy + 7 + bob, 2, 2); }
      } else if (direction.includes('right')) {
        ctx.fillRect(ox + 15, oy + 14 + bob, 3, 8);
        if (hasFace) { ctx.fillStyle = shadow; ctx.fillRect(ox + 19, oy + 7 + bob, 2, 2); }
      }

      // 5. Head & Hair
      ctx.fillStyle = mid;
      ctx.fillRect(ox + 10, oy + 3 + bob, 12, 10);
      ctx.fillStyle = dark;
      ctx.fillRect(ox + 9, oy + 2 + bob, 14, 5);
    };

    // Draw 8-direction grid
    const dirs = [
      'down', 'up', 'left', 'right',
      'down-left', 'down-right', 'up-left', 'up-right'
    ];

    dirs.forEach((dir, row) => {
      for (let col = 0; col < 4; col++) {
        drawCharacterFrame(row, col, dir);
      }
    });
  });
}

export function createEnemyTexture(isBoss: boolean): THREE.Texture {
  const tone = isBoss
    ? { light: "#ffb193", mid: "#d64f45", dark: "#64191f" }
    : { light: "#ffd589", mid: "#d67834", dark: "#663116" };

  return createPixelTexture(24, 24, (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 24, 24);
    ctx.fillStyle = tone.dark;
    ctx.fillRect(5, 6, 14, 13);
    ctx.fillRect(3, 14, 4, 6);
    ctx.fillRect(17, 14, 4, 6);
    ctx.fillRect(8, 2, 3, 4);
    ctx.fillRect(13, 2, 3, 4);

    ctx.fillStyle = tone.mid;
    ctx.fillRect(6, 8, 12, 9);
    ctx.fillRect(9, 18, 2, 4);
    ctx.fillRect(13, 18, 2, 4);

    ctx.fillStyle = tone.light;
    ctx.fillRect(9, 10, 2, 2);
    ctx.fillRect(13, 10, 2, 2);
    ctx.fillRect(10, 14, 4, 2);
  });
}

export function createTreeTexture(): THREE.Texture {
  return createPixelTexture(24, 32, (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 24, 32);

    ctx.fillStyle = "#314f2f";
    ctx.fillRect(7, 4, 10, 12);
    ctx.fillRect(4, 10, 16, 8);
    ctx.fillRect(6, 16, 12, 8);

    ctx.fillStyle = "#4f7a49";
    ctx.fillRect(8, 6, 8, 8);
    ctx.fillRect(6, 12, 12, 7);

    ctx.fillStyle = "#5f3a26";
    ctx.fillRect(10, 22, 4, 8);
  });
}

function createPixelTexture(width: number, height: number, painter: (ctx: CanvasRenderingContext2D) => void): THREE.Texture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  painter(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function handleResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

export function renderScene() {
  for (const billboard of billboardMeshes) {
    billboard.lookAt(camera.position.x, billboard.position.y, camera.position.z);
  }
  renderer.render(scene, camera);
}