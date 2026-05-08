import * as THREE from 'three';
import { GAME_CONFIG, SPRITE_CONFIG } from './config.js';
import { SpriteAnimator } from './spriteAnimator.js';

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let clock: THREE.Clock;
let floorMesh: THREE.Mesh;
let playerMesh: THREE.Mesh;
let activeEnemyMesh: THREE.Mesh;
let playerVelocity: THREE.Vector3 = new THREE.Vector3();
let idleTexture: THREE.Texture;
let walkTexture: THREE.Texture;
let playerAnimator: SpriteAnimator;
const billboardMeshes: THREE.Mesh[] = [];

export { scene, camera, renderer, clock, floorMesh, playerMesh, activeEnemyMesh, billboardMeshes, playerVelocity };

export function loadSpriteTextures(): Promise<void> {
  const loader = new THREE.TextureLoader();
  return Promise.all([
    new Promise<THREE.Texture>((resolve) => {
      loader.load(SPRITE_CONFIG.idleSheetPath, (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        idleTexture = texture;
        resolve(texture);
      });
    }),
    new Promise<THREE.Texture>((resolve) => {
      loader.load(SPRITE_CONFIG.walkSheetPath, (texture) => {
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        walkTexture = texture;
        resolve(texture);
      });
    }),
  ]).then(() => {});
}

export async function setupThreeScene(domContainer: HTMLElement) {
  console.log('Setting up scene, krpgMode:', GAME_CONFIG.krpgMode);
  if (GAME_CONFIG.krpgMode) {
    console.log('Using KRPG setup');
    return setupKRPGThreeScene(domContainer);
  }

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

  await loadSpriteTextures();

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
  const texture = idleTexture;
  playerMesh = createBillboardMesh(texture, 2.0, 2.0); // Square mesh for 16-bit

  if (idleTexture && walkTexture) {
    // Use sprite sheet
    const material = playerMesh.material as THREE.MeshBasicMaterial;
    material.map.repeat.set(SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight);
    const row = SPRITE_CONFIG.directions['down'];
    material.map.offset.set(0, (SPRITE_CONFIG.rows - 1 - row) / SPRITE_CONFIG.rows); // Default to down
    playerAnimator = new SpriteAnimator(playerMesh, idleTexture, walkTexture);
  } else {
    // Fallback to procedural
    const material = playerMesh.material as THREE.MeshBasicMaterial;
    material.map.repeat.set(1 / 4, 1 / 8);
    material.map.offset.set(0, 7 / 8); // Start at row 0 (Down)
  }

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
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    alphaTest: GAME_CONFIG.krpgMode ? 0.5 : 0
  });
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

export function getDirectionFromVelocity(vel: THREE.Vector3): string {
  const threshold = 0.3;
  const vx = vel.x > threshold ? 1 : vel.x < -threshold ? -1 : 0;
  const vz = vel.z > threshold ? 1 : vel.z < -threshold ? -1 : 0;
  if (vx === 0 && vz === 0) return 'down';
  if (vx === 0) return vz > 0 ? 'down' : 'up';
  if (vz === 0) return vx > 0 ? 'right' : 'left';
  return vz > 0 ? (vx > 0 ? 'down-right' : 'down-left') : (vx > 0 ? 'up-right' : 'up-left');
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
  const delta = clock.getDelta();
  return renderKRPG();
}

/**
 * KRPG-STYLE SCENE SETUP WITH WHIMSICAL ELEMENTS
 */
export async function setupKRPGThreeScene(domContainer: HTMLElement) {
  console.log('Initializing KRPG scene');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(GAME_CONFIG.krpgPalette.bg);
  scene.fog = new THREE.Fog(GAME_CONFIG.krpgPalette.fog, 30, 80);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
  camera.position.set(0, GAME_CONFIG.camera.verticalDistance, GAME_CONFIG.camera.followDistance);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  domContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  // Whimsical Global Illumination
  const ambient = new THREE.AmbientLight("#ffffff", 1.2);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight("#fff9e8", 0.8);
  sun.position.set(10, 20, 10);
  scene.add(sun);

  await loadSpriteTextures();

  buildKRPGWorld();
  createOrReplacePlayerMesh("Warrior");

  window.addEventListener("resize", handleResize);
}

/**
 * GENERATES HAND-PAINTED STYLE GROUND AND PROPS
 */
function buildKRPGWorld() {
  // 1. Hand-painted Grass Texture
  const floorTex = createPixelTexture(32, 32, (ctx) => {
    ctx.fillStyle = GAME_CONFIG.krpgPalette.grass_base;
    ctx.fillRect(0, 0, 32, 32);
    // Add "painted" grass tufts
    ctx.fillStyle = GAME_CONFIG.krpgPalette.grass_dark;
    for(let i=0; i<8; i++) {
      ctx.fillRect(Math.random()*32, Math.random()*32, 2, 1);
    }
    // Add pastel flowers
    ctx.fillStyle = GAME_CONFIG.krpgPalette.flower;
    for(let i=0; i<3; i++) {
      ctx.fillRect(Math.random()*32, Math.random()*32, 2, 2);
    }
  });
  floorTex.repeat.set(18, 18);
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;

  if (floorMesh) {
    scene.remove(floorMesh);
  }
  const floorSize = GAME_CONFIG.world.mapHalfExtent * 2;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(floorSize, floorSize),
    new THREE.MeshLambertMaterial({ map: floorTex })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  scene.add(floor);
  floorMesh = floor;

  // 2. Add some "Puffy" Whimsical Trees
  const propGroup = new THREE.Group();
  const treeCount = 34;
  for (let i = 0; i < treeCount; i += 1) {
    const tree = createBillboardMesh(createKRPGTreeTexture(), 4, 6);
    tree.position.x = randomInt(-21, 21);
    tree.position.z = randomInt(-21, 21);
    tree.position.y = 1.7;
    propGroup.add(tree);
  }
  scene.add(propGroup);
}

/**
 * GENERATES THE 1:3 CHIBI CHARACTER
 * With 8 directions, spiky hair, and thick outlines.
 */


function createKRPGTreeTexture(): THREE.Texture {
  return createPixelTexture(64, 96, (ctx) => {
    // Outline for the whole tree
    ctx.fillStyle = GAME_CONFIG.krpgPalette.outline;
    ctx.beginPath(); ctx.arc(32, 35, 30, 0, Math.PI*2); ctx.fill(); // Top puff
    ctx.fillRect(28, 60, 8, 30); // Trunk

    // Tree Green (Puffy/Round)
    ctx.fillStyle = "#5ba344";
    ctx.beginPath(); ctx.arc(32, 35, 28, 0, Math.PI*2); ctx.fill();

    // Highlight (Hand-painted feel)
    ctx.fillStyle = "#82d166";
    ctx.beginPath(); ctx.arc(22, 25, 12, 0, Math.PI*2); ctx.fill();

    // Trunk
    ctx.fillStyle = "#7a5843";
    ctx.fillRect(30, 60, 4, 28);
  });
}

export function renderKRPG() {
  const delta = clock.getDelta();
  for (const b of billboardMeshes) {
    b.lookAt(camera.position.x, b.position.y, camera.position.z);
  }
  if (playerAnimator) {
    playerAnimator.setMoving(playerVelocity.length() > 0.1);
    playerAnimator.setDirection(getDirectionFromVelocity(playerVelocity));
    playerAnimator.update(delta);
  }
  renderer.render(scene, camera);
}