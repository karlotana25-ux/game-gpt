import * as THREE from "three";
import { CombatEngine } from "./src/combat-engine.js";
import { FINAL_BOSS_COUNT, GAME_CONFIG, GAME_PHASE, SAVE_KEY, STAT_KEYS, STAT_LABELS } from "./src/config.js";
import { SCREEN_BY_PHASE, dom } from "./src/dom.js";
import { PartyManager } from "./src/party-manager.js";
import { loadTiledMap } from "./src/tiled-map-loader.js";
import { clamp, cloneStats, pickRandom, randomInt } from "./src/utils.js";

const keysDown = new Set();
const TILE_LAYER_ELEVATION_STEP = 0.012;
const TILE_LAYER_EPSILON = 0.001;
const DEFAULT_TILE_WORLD_SIZE = 1;

let scene;
let camera;
let renderer;
let clock;
let floorMesh;
let worldGroup;
let playerMesh;
let activeEnemyMesh;
const billboardMeshes = [];
const animatedLayerTiles = [];
const tileTextureCache = new Map();
let tileMapData = null;
let tileMapCenter = { x: 0, y: 0 };
let tileMapCollision = null;
let tileWorldSize = GAME_CONFIG.world.tileMap?.tileWorldSize || DEFAULT_TILE_WORLD_SIZE;
let worldLoadRequestId = 0;
const textureLoader = new THREE.TextureLoader();
const worldBounds = createDefaultWorldBounds();

let toastTimer = null;
let eventTimer = null;

const partyManager = new PartyManager(4);
const state = {
  phase: GAME_PHASE.MAIN_MENU,
  creation: {
    className: "Warrior",
    baseStats: cloneStats(GAME_CONFIG.classes.Warrior.baseStats),
    allocatedStats: cloneStats(GAME_CONFIG.classes.Warrior.baseStats),
    pointsRemaining: GAME_CONFIG.pointBuy.pool
  },
  gold: 130,
  bossesDefeated: 0,
  monstersDefeatedSinceBoss: 0,
  encounterRateMultiplier: 1,
  distanceSinceEncounter: 0,
  battle: null
};

bootstrap();

function bootstrap() {
  setupThreeScene();
  setupUI();
  resetCreationState("Warrior");
  updateLoadScreen();
  switchPhase(GAME_PHASE.MAIN_MENU);
  animate();
}

function setupThreeScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#0a1820");
  scene.fog = new THREE.Fog("#0a1820", 22, 56);

  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(18, 18, 18);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  dom.sceneContainer.appendChild(renderer.domElement);

  clock = new THREE.Clock();

  const ambient = new THREE.AmbientLight("#f1ffe0", 0.75);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight("#ffe8bf", 1.05);
  sun.position.set(20, 26, 12);
  scene.add(sun);

  buildWorldGeometry();
  createOrReplacePlayerMesh("Warrior");

  window.addEventListener("resize", handleResize);
}

function setupUI() {
  bindMenuButtons();
  buildClassCards();
  buildStatRows();
  buildTavernRoomButtons();
  buildShopLists();
  bindBattleButtons();
  bindKeyboardInput();

  dom.playerNameInput.addEventListener("input", () => {
    const clean = dom.playerNameInput.value.replace(/\s+/g, " ").trimStart();
    if (clean !== dom.playerNameInput.value) {
      dom.playerNameInput.value = clean;
    }
  });

  dom.statPointGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-stat][data-delta]");
    if (!btn) {
      return;
    }
    const stat = btn.dataset.stat;
    const delta = Number(btn.dataset.delta);
    adjustCreationStat(stat, delta);
  });

  dom.classOptions.addEventListener("click", (event) => {
    const classBtn = event.target.closest("button[data-class]");
    if (!classBtn) {
      return;
    }
    resetCreationState(classBtn.dataset.class);
  });

  dom.confirmCharacterBtn.addEventListener("click", () => {
    createNewAdventurer();
  });

  dom.backFromCharacterBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.exploreBtn.addEventListener("click", () => {
    if (!partyManager.getAliveMembers().length) {
      showToast("Your party is wiped out. Rest at the tavern first.");
      return;
    }
    switchPhase(GAME_PHASE.EXPLORATION);
    showToast("Use WASD or arrow keys to explore.");
  });

  dom.openShopBtn.addEventListener("click", () => {
    updateShopMemberSelect();
    switchPhase(GAME_PHASE.SHOP);
  });

  dom.backToHubFromShopBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.HUB);
  });

  dom.shopMemberSelect.addEventListener("change", () => {
    updateShopMemberSelect();
  });

  dom.weaponList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-weapon-id]");
    if (!btn) {
      return;
    }
    purchaseWeapon(btn.dataset.weaponId);
  });

  dom.spellList.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-spell-id]");
    if (!btn) {
      return;
    }
    purchaseSpell(btn.dataset.spellId);
  });

  dom.saveGameBtn.addEventListener("click", saveGame);

  dom.backToMenuBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.returnHubBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.HUB);
  });

  dom.encounterRateSlider.addEventListener("input", () => {
    state.encounterRateMultiplier = Number(dom.encounterRateSlider.value) / 100;
    dom.encounterRateValue.textContent = `${state.encounterRateMultiplier.toFixed(2)}x`;
  });

  dom.backFromSettingsBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.loadSlotBtn.addEventListener("click", () => {
    const loaded = loadGame();
    if (loaded) {
      switchPhase(GAME_PHASE.HUB);
    }
  });

  dom.backFromLoadBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.restartBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.MAIN_MENU);
  });

  dom.leaveBattleBtn.addEventListener("click", () => {
    if (state.phase !== GAME_PHASE.BATTLE) {
      return;
    }
    state.battle = null;
    clearEnemyMesh();
    showToast("Retreat complete.");
    switchPhase(GAME_PHASE.HUB);
  });
}

function bindMenuButtons() {
  dom.startGameBtn.addEventListener("click", () => {
    resetCreationState("Warrior");
    dom.playerNameInput.value = "";
    switchPhase(GAME_PHASE.CHARACTER_CREATION);
  });

  dom.loadGameBtn.addEventListener("click", () => {
    updateLoadScreen();
    switchPhase(GAME_PHASE.LOAD);
  });

  dom.settingsBtn.addEventListener("click", () => {
    switchPhase(GAME_PHASE.SETTINGS);
  });

  dom.exitBtn.addEventListener("click", () => {
    showToast("Exit requested. Close the browser tab to leave the prototype.");
  });
}

function bindBattleButtons() {
  for (const btn of dom.battleActionBtns) {
    btn.addEventListener("click", () => {
      if (state.phase !== GAME_PHASE.BATTLE || !state.battle) {
        return;
      }
      resolveBattleRound(btn.dataset.action);
    });
  }
}

function bindKeyboardInput() {
  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) {
      return;
    }

    if (event.code === "Escape") {
      if (state.phase === GAME_PHASE.EXPLORATION) {
        switchPhase(GAME_PHASE.HUB);
      }
      return;
    }

    keysDown.add(event.code);
  });

  window.addEventListener("keyup", (event) => {
    keysDown.delete(event.code);
  });
}

function createDefaultWorldBounds() {
  const maxOffset = Math.max(1, GAME_CONFIG.world.mapHalfExtent - 1);
  return {
    minX: -maxOffset,
    maxX: maxOffset,
    minZ: -maxOffset,
    maxZ: maxOffset
  };
}

function applyWorldBounds(nextBounds) {
  worldBounds.minX = nextBounds.minX;
  worldBounds.maxX = nextBounds.maxX;
  worldBounds.minZ = nextBounds.minZ;
  worldBounds.maxZ = nextBounds.maxZ;
}

function getWorldBounds() {
  return worldBounds;
}

function clampToWorldBounds(x, z) {
  const bounds = getWorldBounds();
  return {
    x: clamp(x, bounds.minX, bounds.maxX),
    z: clamp(z, bounds.minZ, bounds.maxZ)
  };
}

function toTileKey(x, y) {
  return `${x},${y}`;
}

function worldToTileCoordinates(x, z) {
  if (!tileMapData) {
    return null;
  }
  const scaledX = x / tileWorldSize + tileMapCenter.x;
  const scaledY = z / tileWorldSize + tileMapCenter.y;
  return {
    x: Math.floor(scaledX),
    y: Math.floor(scaledY)
  };
}

function isTileWalkable(tileX, tileY) {
  if (!tileMapCollision) {
    return true;
  }
  if (
    tileX < tileMapCollision.minTileX ||
    tileX > tileMapCollision.maxTileX ||
    tileY < tileMapCollision.minTileY ||
    tileY > tileMapCollision.maxTileY
  ) {
    return false;
  }

  const key = toTileKey(tileX, tileY);
  if (tileMapCollision.passable.has(key)) {
    return true;
  }
  return !tileMapCollision.blocked.has(key);
}

function isWalkableWorldPosition(x, z) {
  const tileCoords = worldToTileCoordinates(x, z);
  if (!tileCoords) {
    return true;
  }
  return isTileWalkable(tileCoords.x, tileCoords.y);
}

function findNearestWalkablePosition(startX, startZ, maxRadius = 14) {
  const originTile = worldToTileCoordinates(startX, startZ);
  if (!originTile) {
    return { x: startX, z: startZ };
  }

  for (let radius = 0; radius <= maxRadius; radius += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
          continue;
        }
        const tileX = originTile.x + dx;
        const tileY = originTile.y + dy;
        if (!isTileWalkable(tileX, tileY)) {
          continue;
        }

        return {
          x: (tileX + 0.5 - tileMapCenter.x) * tileWorldSize,
          z: (tileY + 0.5 - tileMapCenter.y) * tileWorldSize
        };
      }
    }
  }

  return { x: startX, z: startZ };
}

function syncCameraToPlayer() {
  if (!playerMesh) {
    return;
  }
  camera.position.x = playerMesh.position.x + 18;
  camera.position.z = playerMesh.position.z + 18;
  camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);
}

function clearWorldGroup() {
  if (!worldGroup) {
    return;
  }

  scene.remove(worldGroup);

  worldGroup.traverse((node) => {
    if (!node.isMesh) {
      return;
    }
    if (node.geometry) {
      node.geometry.dispose();
    }
    if (node.material) {
      node.material.dispose();
    }
  });

  worldGroup = null;
  floorMesh = null;
}

function resetTileMapState() {
  tileMapData = null;
  tileMapCollision = null;
  tileMapCenter = { x: 0, y: 0 };
  tileWorldSize = GAME_CONFIG.world.tileMap?.tileWorldSize || DEFAULT_TILE_WORLD_SIZE;
  animatedLayerTiles.length = 0;
  applyWorldBounds(createDefaultWorldBounds());
}

function buildFallbackWorldGeometry() {
  resetTileMapState();
  clearWorldGroup();

  worldGroup = new THREE.Group();

  const floorTexture = createFloorTexture();
  floorTexture.wrapS = THREE.RepeatWrapping;
  floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(18, 18);

  const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTexture });
  const floorSize = GAME_CONFIG.world.mapHalfExtent * 2;
  floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(floorSize, floorSize), floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0;
  worldGroup.add(floorMesh);

  scene.add(worldGroup);
}

function getPatternList(configValue, fallbackList) {
  if (Array.isArray(configValue) && configValue.length) {
    return configValue
      .map((entry) => String(entry || "").trim().toLowerCase())
      .filter(Boolean);
  }
  return fallbackList;
}

function layerNameMatches(layerName, patterns) {
  const normalizedName = String(layerName || "").toLowerCase();
  return patterns.some((pattern) => normalizedName.includes(pattern));
}

function buildCollisionDataFromMap(mapData) {
  const blockingPatterns = getPatternList(
    GAME_CONFIG.world.tileMap?.blockingLayerNamePatterns,
    ["water"]
  );
  const passablePatterns = getPatternList(
    GAME_CONFIG.world.tileMap?.passableOverrideLayerNamePatterns,
    ["bridge", "stairs"]
  );

  const blocked = new Set();
  const passable = new Set();

  for (const layer of mapData.layers) {
    if (!layer.visible || !layer.tiles.length) {
      continue;
    }
    const isBlockingLayer = layerNameMatches(layer.name, blockingPatterns);
    const isPassableLayer = layerNameMatches(layer.name, passablePatterns);
    if (!isBlockingLayer && !isPassableLayer) {
      continue;
    }

    for (const tile of layer.tiles) {
      const key = toTileKey(tile.x, tile.y);
      if (isBlockingLayer) {
        blocked.add(key);
      }
      if (isPassableLayer) {
        passable.add(key);
      }
    }
  }

  return {
    blocked,
    passable,
    minTileX: mapData.mapBounds.minTileX,
    maxTileX: mapData.mapBounds.maxTileX,
    minTileY: mapData.mapBounds.minTileY,
    maxTileY: mapData.mapBounds.maxTileY
  };
}

async function loadTextureForTileset(tileset) {
  const cacheKey = tileset.imageUrl;
  if (tileTextureCache.has(cacheKey)) {
    return tileTextureCache.get(cacheKey);
  }

  const texture = await textureLoader.loadAsync(cacheKey);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  tileTextureCache.set(cacheKey, texture);
  return texture;
}

function applyTileFlip(uvCorners, flipH, flipV, flipD) {
  if (flipD) {
    const temp = uvCorners.tr;
    uvCorners.tr = uvCorners.bl;
    uvCorners.bl = temp;
  }
  if (flipH) {
    const topSwap = uvCorners.tl;
    uvCorners.tl = uvCorners.tr;
    uvCorners.tr = topSwap;

    const bottomSwap = uvCorners.bl;
    uvCorners.bl = uvCorners.br;
    uvCorners.br = bottomSwap;
  }
  if (flipV) {
    const leftSwap = uvCorners.tl;
    uvCorners.tl = uvCorners.bl;
    uvCorners.bl = leftSwap;

    const rightSwap = uvCorners.tr;
    uvCorners.tr = uvCorners.br;
    uvCorners.br = rightSwap;
  }
}

function computeTileUvCorners(tileset, gid, flipH, flipV, flipD) {
  const localTileId = gid - tileset.firstGid;
  const col = localTileId % tileset.columns;
  const row = Math.floor(localTileId / tileset.columns);

  const u0 = (col * tileset.tileWidth) / tileset.imageWidth;
  const v0 = (row * tileset.tileHeight) / tileset.imageHeight;
  const u1 = ((col + 1) * tileset.tileWidth) / tileset.imageWidth;
  const v1 = ((row + 1) * tileset.tileHeight) / tileset.imageHeight;

  const uvCorners = {
    tl: [u0, v0],
    tr: [u1, v0],
    br: [u1, v1],
    bl: [u0, v1]
  };

  applyTileFlip(uvCorners, flipH, flipV, flipD);
  return uvCorners;
}

function writeUvForTile(uvArray, tileIndex, uvCorners) {
  const uvOffset = tileIndex * 8;
  uvArray[uvOffset + 0] = uvCorners.tl[0];
  uvArray[uvOffset + 1] = uvCorners.tl[1];
  uvArray[uvOffset + 2] = uvCorners.tr[0];
  uvArray[uvOffset + 3] = uvCorners.tr[1];
  uvArray[uvOffset + 4] = uvCorners.br[0];
  uvArray[uvOffset + 5] = uvCorners.br[1];
  uvArray[uvOffset + 6] = uvCorners.bl[0];
  uvArray[uvOffset + 7] = uvCorners.bl[1];
}

function buildLayerMesh(tileset, tiles, layerHeightOffset, material) {
  const vertexCount = tiles.length * 4;
  const positions = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const IndexArrayType = vertexCount > 65535 ? Uint32Array : Uint16Array;
  const indexArray = new IndexArrayType(tiles.length * 6);

  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    const x0 = (tile.x - tileMapCenter.x) * tileWorldSize;
    const z0 = (tile.y - tileMapCenter.y) * tileWorldSize;
    const x1 = x0 + tileWorldSize;
    const z1 = z0 + tileWorldSize;

    const vertexOffset = i * 12;
    positions[vertexOffset + 0] = x0;
    positions[vertexOffset + 1] = layerHeightOffset;
    positions[vertexOffset + 2] = z0;
    positions[vertexOffset + 3] = x1;
    positions[vertexOffset + 4] = layerHeightOffset;
    positions[vertexOffset + 5] = z0;
    positions[vertexOffset + 6] = x1;
    positions[vertexOffset + 7] = layerHeightOffset;
    positions[vertexOffset + 8] = z1;
    positions[vertexOffset + 9] = x0;
    positions[vertexOffset + 10] = layerHeightOffset;
    positions[vertexOffset + 11] = z1;

    const uvCorners = computeTileUvCorners(tileset, tile.gid, tile.flipH, tile.flipV, tile.flipD);
    writeUvForTile(uvs, i, uvCorners);

    const indexOffset = i * 6;
    const v = i * 4;
    indexArray[indexOffset + 0] = v + 0;
    indexArray[indexOffset + 1] = v + 2;
    indexArray[indexOffset + 2] = v + 1;
    indexArray[indexOffset + 3] = v + 0;
    indexArray[indexOffset + 4] = v + 3;
    indexArray[indexOffset + 5] = v + 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  for (let i = 0; i < tiles.length; i += 1) {
    const tile = tiles[i];
    const animationFrames = tileMapData.animationsByGlobalGid.get(tile.gid);
    if (!animationFrames || !animationFrames.length) {
      continue;
    }
    animatedLayerTiles.push({
      uvArray: uvs,
      uvAttribute: geometry.getAttribute("uv"),
      tileIndex: i,
      tileset,
      frames: animationFrames,
      flipH: tile.flipH,
      flipV: tile.flipV,
      flipD: tile.flipD,
      frameIndex: 0,
      elapsedMs: 0
    });
  }

  return mesh;
}

async function applyTileMapWorld(mapData) {
  tileMapData = mapData;
  tileWorldSize = Math.max(0.2, Number(GAME_CONFIG.world.tileMap?.tileWorldSize) || DEFAULT_TILE_WORLD_SIZE);
  tileMapCenter = {
    x: (mapData.mapBounds.minTileX + mapData.mapBounds.maxTileX + 1) / 2,
    y: (mapData.mapBounds.minTileY + mapData.mapBounds.maxTileY + 1) / 2
  };

  const minX = (mapData.mapBounds.minTileX - tileMapCenter.x) * tileWorldSize + 0.5 * tileWorldSize;
  const maxX = (mapData.mapBounds.maxTileX + 1 - tileMapCenter.x) * tileWorldSize - 0.5 * tileWorldSize;
  const minZ = (mapData.mapBounds.minTileY - tileMapCenter.y) * tileWorldSize + 0.5 * tileWorldSize;
  const maxZ = (mapData.mapBounds.maxTileY + 1 - tileMapCenter.y) * tileWorldSize - 0.5 * tileWorldSize;

  applyWorldBounds({ minX, maxX, minZ, maxZ });
  tileMapCollision = buildCollisionDataFromMap(mapData);
  animatedLayerTiles.length = 0;

  clearWorldGroup();
  worldGroup = new THREE.Group();

  for (let layerIndex = 0; layerIndex < mapData.layers.length; layerIndex += 1) {
    const layer = mapData.layers[layerIndex];
    if (!layer.visible || !layer.tiles.length) {
      continue;
    }

    const tilesByTileset = new Map();
    for (const tile of layer.tiles) {
      const tileset = mapData.resolveTileset(tile.gid);
      if (!tileset) {
        continue;
      }
      if (!tilesByTileset.has(tileset.firstGid)) {
        tilesByTileset.set(tileset.firstGid, { tileset, tiles: [] });
      }
      tilesByTileset.get(tileset.firstGid).tiles.push(tile);
    }

    for (const { tileset, tiles } of tilesByTileset.values()) {
      const texture = await loadTextureForTileset(tileset);
      const layerMaterial = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: true,
        alphaTest: 0.22,
        depthWrite: true,
        opacity: layer.opacity
      });

      const layerHeightOffset = TILE_LAYER_EPSILON + layerIndex * TILE_LAYER_ELEVATION_STEP;
      const layerMesh = buildLayerMesh(tileset, tiles, layerHeightOffset, layerMaterial);
      worldGroup.add(layerMesh);
    }
  }

  scene.add(worldGroup);

  if (playerMesh) {
    const clamped = clampToWorldBounds(playerMesh.position.x, playerMesh.position.z);
    let nextX = clamped.x;
    let nextZ = clamped.z;
    if (!isWalkableWorldPosition(nextX, nextZ)) {
      const fallbackPos = findNearestWalkablePosition(nextX, nextZ);
      nextX = fallbackPos.x;
      nextZ = fallbackPos.z;
    }
    playerMesh.position.x = nextX;
    playerMesh.position.z = nextZ;
    syncCameraToPlayer();
    updateExplorationHud();
  }
}

function buildWorldGeometry() {
  buildFallbackWorldGeometry();

  if (!GAME_CONFIG.world.tileMap?.enabled || !GAME_CONFIG.world.tileMap?.path) {
    return;
  }

  const loadRequestId = ++worldLoadRequestId;

  loadTiledMap(GAME_CONFIG.world.tileMap.path)
    .then(async (mapData) => {
      if (loadRequestId !== worldLoadRequestId) {
        return;
      }
      await applyTileMapWorld(mapData);
    })
    .catch((error) => {
      if (loadRequestId !== worldLoadRequestId) {
        return;
      }
      console.error(error);
      showToast("Undead tileset map failed to load. Using fallback terrain.");
      buildFallbackWorldGeometry();
      if (playerMesh) {
        setPlayerPosition(playerMesh.position.x, playerMesh.position.z);
      }
    });
}

function createOrReplacePlayerMesh(className) {
  if (playerMesh) {
    removeBillboard(playerMesh);
    scene.remove(playerMesh);
  }
  const texture = createCharacterTexture(className);
  playerMesh = createBillboardMesh(texture, 1.8, 2.4);
  playerMesh.position.set(0, 1.2, 0);
  scene.add(playerMesh);
  updateExplorationHud();
}

function createEnemyMesh(isBoss) {
  clearEnemyMesh();
  const enemyTexture = createEnemyTexture(isBoss);
  activeEnemyMesh = createBillboardMesh(enemyTexture, 2.2, 2.8);
  const candidate = clampToWorldBounds(
    playerMesh.position.x + randomInt(-3, 3),
    playerMesh.position.z + randomInt(-3, 3)
  );
  let enemyX = candidate.x;
  let enemyZ = candidate.z;
  if (!isWalkableWorldPosition(enemyX, enemyZ)) {
    const fallback = findNearestWalkablePosition(enemyX, enemyZ, 8);
    enemyX = fallback.x;
    enemyZ = fallback.z;
  }

  activeEnemyMesh.position.set(enemyX, 1.4, enemyZ);
  scene.add(activeEnemyMesh);
}

function clearEnemyMesh() {
  if (!activeEnemyMesh) {
    return;
  }
  removeBillboard(activeEnemyMesh);
  scene.remove(activeEnemyMesh);
  activeEnemyMesh = null;
}

function createBillboardMesh(texture, width, height) {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
  const mesh = new THREE.Mesh(geometry, material);
  billboardMeshes.push(mesh);
  return mesh;
}

function removeBillboard(mesh) {
  const index = billboardMeshes.indexOf(mesh);
  if (index >= 0) {
    billboardMeshes.splice(index, 1);
  }
}

function createFloorTexture() {
  return createPixelTexture(16, 16, (ctx) => {
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

function createCharacterTexture(className) {
  const classConfig = GAME_CONFIG.classes[className] || GAME_CONFIG.classes.Warrior;
  const [light, mid, dark] = classConfig.color;

  return createPixelTexture(24, 24, (ctx) => {
    ctx.clearRect(0, 0, 24, 24);

    ctx.fillStyle = dark;
    ctx.fillRect(8, 4, 8, 4);
    ctx.fillRect(6, 8, 12, 10);

    ctx.fillStyle = mid;
    ctx.fillRect(7, 9, 10, 8);
    ctx.fillRect(9, 18, 3, 4);
    ctx.fillRect(13, 18, 3, 4);

    ctx.fillStyle = light;
    ctx.fillRect(9, 5, 6, 3);
    ctx.fillRect(10, 11, 2, 2);
    ctx.fillRect(13, 11, 2, 2);
  });
}

function createEnemyTexture(isBoss) {
  const tone = isBoss
    ? { light: "#ffb193", mid: "#d64f45", dark: "#64191f" }
    : { light: "#ffd589", mid: "#d67834", dark: "#663116" };

  return createPixelTexture(24, 24, (ctx) => {
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

function createPixelTexture(width, height, painter) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  painter(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function buildClassCards() {
  dom.classOptions.innerHTML = "";
  for (const [className, classConfig] of Object.entries(GAME_CONFIG.classes)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "class-card";
    btn.dataset.class = className;
    btn.innerHTML = `<strong>${className}</strong><span>${classConfig.focus}</span>`;
    dom.classOptions.appendChild(btn);
  }
}

function buildStatRows() {
  dom.statPointGrid.innerHTML = "";
  for (const statKey of STAT_KEYS) {
    const row = document.createElement("div");
    row.className = "stat-row";
    row.innerHTML = `
      <span class="stat-name">${STAT_LABELS[statKey]}</span>
      <button type="button" class="stat-btn secondary" data-stat="${statKey}" data-delta="-1">-</button>
      <span class="stat-val" data-stat-value="${statKey}">0</span>
      <button type="button" class="stat-btn" data-stat="${statKey}" data-delta="1">+</button>
    `;
    dom.statPointGrid.appendChild(row);
  }
}

function buildTavernRoomButtons() {
  dom.tavernRoomButtons.innerHTML = "";
  for (const room of GAME_CONFIG.tavernRooms) {
    const wrapper = document.createElement("div");
    wrapper.className = "room-item";
    wrapper.innerHTML = `
      <strong>${room.name}</strong>
      <span>Cost: ${room.cost}g</span>
      <span>Recover: ${Math.round(room.hpRecover * 100)}% HP / ${Math.round(room.mpRecover * 100)}% MP</span>
      <button type="button" data-room-id="${room.id}">Stay Here</button>
    `;
    dom.tavernRoomButtons.appendChild(wrapper);
  }

  dom.tavernRoomButtons.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-room-id]");
    if (!btn) {
      return;
    }
    visitTavernRoom(btn.dataset.roomId);
  });
}

function buildShopLists() {
  dom.weaponList.innerHTML = "";
  for (const weapon of GAME_CONFIG.shop.weapons) {
    const wrapper = document.createElement("div");
    wrapper.className = "shop-item";
    wrapper.innerHTML = `
      <strong>${weapon.name}</strong>
      <span>${weapon.description}</span>
      <span>Bonus: +${weapon.bonuses.strength || 0} STR / +${weapon.bonuses.dexterity || 0} DEX</span>
      <span>Cost: ${weapon.cost}g</span>
      <button type="button" data-weapon-id="${weapon.id}">Buy Weapon</button>
    `;
    dom.weaponList.appendChild(wrapper);
  }

  dom.spellList.innerHTML = "";
  for (const spell of GAME_CONFIG.shop.spells) {
    const wrapper = document.createElement("div");
    wrapper.className = "shop-item";
    wrapper.innerHTML = `
      <strong>${spell.name}</strong>
      <span>${spell.description}</span>
      <span>INT ${spell.requiresInt}+ | MP ${spell.mpCost}</span>
      <span>Cost: ${spell.cost}g</span>
      <button type="button" data-spell-id="${spell.id}">Buy Spell</button>
    `;
    dom.spellList.appendChild(wrapper);
  }
}

function resetCreationState(className) {
  const resolvedClass = GAME_CONFIG.classes[className] ? className : "Warrior";
  const base = cloneStats(GAME_CONFIG.classes[resolvedClass].baseStats);
  state.creation.className = resolvedClass;
  state.creation.baseStats = base;
  state.creation.allocatedStats = cloneStats(base);
  state.creation.pointsRemaining = GAME_CONFIG.pointBuy.pool;
  renderCreationState();
}

function renderCreationState() {
  dom.pointsRemaining.textContent = String(state.creation.pointsRemaining);
  dom.classSummary.textContent = `${GAME_CONFIG.classes[state.creation.className].description}`;

  const classButtons = Array.from(dom.classOptions.querySelectorAll("button[data-class]"));
  for (const btn of classButtons) {
    btn.classList.toggle("selected", btn.dataset.class === state.creation.className);
  }

  for (const statKey of STAT_KEYS) {
    const statNode = dom.statPointGrid.querySelector(`[data-stat-value="${statKey}"]`);
    if (statNode) {
      statNode.textContent = String(state.creation.allocatedStats[statKey]);
    }
  }
}

function adjustCreationStat(statKey, delta) {
  if (!STAT_KEYS.includes(statKey)) {
    return;
  }

  const current = state.creation.allocatedStats[statKey];
  const base = state.creation.baseStats[statKey];

  if (delta > 0) {
    if (state.creation.pointsRemaining <= 0) {
      showToast("No points remaining.");
      return;
    }
    if (current >= GAME_CONFIG.pointBuy.max) {
      showToast(`${STAT_LABELS[statKey]} is at maximum.`);
      return;
    }
    state.creation.allocatedStats[statKey] += 1;
    state.creation.pointsRemaining -= 1;
  } else if (delta < 0) {
    if (current <= base) {
      return;
    }
    state.creation.allocatedStats[statKey] -= 1;
    state.creation.pointsRemaining += 1;
  }

  renderCreationState();
}

function createNewAdventurer() {
  const name = dom.playerNameInput.value.trim();
  if (!name) {
    showToast("Please enter a player name.");
    return;
  }
  if (state.creation.pointsRemaining > 0) {
    showToast("Spend all point-buy stats before continuing.");
    return;
  }

  partyManager.reset();
  const hero = partyManager.createMember(name, state.creation.className, state.creation.allocatedStats);
  partyManager.addMember(hero);

  state.gold = 130;
  state.bossesDefeated = 0;
  state.monstersDefeatedSinceBoss = 0;
  state.distanceSinceEncounter = 0;
  state.battle = null;

  createOrReplacePlayerMesh(state.creation.className);
  setPlayerPosition(0, 0);
  clearEnemyMesh();
  updateHubPanel();
  switchPhase(GAME_PHASE.HUB);
  showBanner(`${hero.name}, your legend begins.`);
}

function setPlayerPosition(x, z) {
  if (!playerMesh) {
    return;
  }

  const clamped = clampToWorldBounds(x, z);
  let targetX = clamped.x;
  let targetZ = clamped.z;

  if (!isWalkableWorldPosition(targetX, targetZ)) {
    const nearest = findNearestWalkablePosition(targetX, targetZ);
    targetX = nearest.x;
    targetZ = nearest.z;
  }

  playerMesh.position.x = targetX;
  playerMesh.position.z = targetZ;
  syncCameraToPlayer();
}

function updateHubPanel() {
  const leader = partyManager.getLeader();
  dom.hubPlayerName.textContent = leader ? leader.name : "-";
  dom.hubGold.textContent = String(state.gold);
  dom.hubBosses.textContent = String(state.bossesDefeated);
  dom.hubPartySize.textContent = `${partyManager.members.length}/${partyManager.maxMembers}`;

  dom.hubPartyRoster.innerHTML = "";
  for (const member of partyManager.members) {
    const card = document.createElement("div");
    card.className = "party-member";
    const weaponText = member.equipment.weapon ? member.equipment.weapon.name : "None";
    const spellText = member.spells.length ? member.spells.map((spell) => spell.name).join(", ") : "None";
    card.innerHTML = `
      <strong>${member.name} (${member.className})</strong>
      <small>HP ${member.hp}/${member.maxHp} | MP ${member.mp}/${member.maxMp}</small>
      <small>STR ${member.stats.strength} | AGI ${member.stats.agility} | DEX ${member.stats.dexterity} | VIT ${member.stats.vitality} | INT ${member.stats.intelligence}</small>
      <small>Weapon: ${weaponText}</small>
      <small>Spells: ${spellText}</small>
    `;
    dom.hubPartyRoster.appendChild(card);
  }

  updateExplorationHud();
}

function visitTavernRoom(roomId) {
  const room = GAME_CONFIG.tavernRooms.find((entry) => entry.id === roomId);
  if (!room) {
    return;
  }
  if (state.gold < room.cost) {
    showToast("Not enough gold for that room.");
    return;
  }
  state.gold -= room.cost;
  partyManager.healAllByPercent(room.hpRecover, room.mpRecover);
  updateHubPanel();
  showToast(`${room.name} restored the party.`);
}

function updateShopMemberSelect() {
  const previousValue = dom.shopMemberSelect.value;
  dom.shopMemberSelect.innerHTML = "";

  for (const member of partyManager.members) {
    const option = document.createElement("option");
    option.value = member.id;
    option.textContent = `${member.name} (${member.className})`;
    dom.shopMemberSelect.appendChild(option);
  }

  if (!partyManager.members.length) {
    return;
  }

  const validPrevious = partyManager.members.some((member) => member.id === previousValue);
  dom.shopMemberSelect.value = validPrevious ? previousValue : partyManager.members[0].id;
}

function purchaseWeapon(weaponId) {
  const weapon = GAME_CONFIG.shop.weapons.find((entry) => entry.id === weaponId);
  if (!weapon) {
    return;
  }
  const targetMemberId = dom.shopMemberSelect.value;
  if (!targetMemberId) {
    showToast("Choose a party member first.");
    return;
  }
  if (state.gold < weapon.cost) {
    showToast("Not enough gold.");
    return;
  }

  const equipResult = partyManager.equipWeapon(targetMemberId, weapon);
  if (!equipResult.ok) {
    showToast(equipResult.message);
    return;
  }

  state.gold -= weapon.cost;
  updateHubPanel();
  showToast(equipResult.message);
}

function purchaseSpell(spellId) {
  const spell = GAME_CONFIG.shop.spells.find((entry) => entry.id === spellId);
  if (!spell) {
    return;
  }
  const targetMemberId = dom.shopMemberSelect.value;
  if (!targetMemberId) {
    showToast("Choose a party member first.");
    return;
  }
  if (state.gold < spell.cost) {
    showToast("Not enough gold.");
    return;
  }

  const learnResult = partyManager.learnSpell(targetMemberId, spell);
  if (!learnResult.ok) {
    showToast(learnResult.message);
    return;
  }

  state.gold -= spell.cost;
  updateHubPanel();
  showToast(learnResult.message);
}

function buildEnemy(isBoss) {
  const difficultyBase = 1 + state.bossesDefeated * 2;
  const level = difficultyBase + randomInt(0, 2) + (isBoss ? 2 : 0);

  const name = isBoss
    ? GAME_CONFIG.enemies.bosses[Math.min(state.bossesDefeated, GAME_CONFIG.enemies.bosses.length - 1)]
    : pickRandom(GAME_CONFIG.enemies.regular);

  const stats = {
    strength: 5 + level * 2 + (isBoss ? 3 : 0),
    agility: 4 + level + (isBoss ? 2 : 0),
    dexterity: 4 + level + (isBoss ? 2 : 0),
    vitality: 5 + level * 2 + (isBoss ? 5 : 0),
    intelligence: 4 + level + (isBoss ? 4 : 0)
  };

  const maxHp = stats.vitality * 10 + stats.strength * 2 + (isBoss ? 40 : 12);
  const maxMp = stats.intelligence * 5 + (isBoss ? 16 : 0);

  return {
    id: `enemy-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name,
    isBoss,
    level,
    stats,
    hp: maxHp,
    maxHp,
    mp: maxMp,
    maxMp,
    goldReward: 18 + level * (isBoss ? 12 : 5),
    critBonus: isBoss ? 4 : 0,
    accuracyBonus: isBoss ? 8 : 0,
    guard: false
  };
}

function shouldSpawnBoss() {
  if (state.bossesDefeated >= FINAL_BOSS_COUNT) {
    return false;
  }
  const requiredMonsterWins = Math.max(2, 4 - state.bossesDefeated);
  if (state.monstersDefeatedSinceBoss >= requiredMonsterWins) {
    return true;
  }
  const randomBossChance = 0.05 + state.bossesDefeated * 0.03;
  return Math.random() < randomBossChance;
}

function triggerEncounterIfNeeded() {
  if (state.phase !== GAME_PHASE.EXPLORATION || state.battle) {
    return;
  }
  const threshold = GAME_CONFIG.world.encounterDistance / state.encounterRateMultiplier;
  if (state.distanceSinceEncounter < threshold) {
    return;
  }
  state.distanceSinceEncounter = 0;

  const baseChance = GAME_CONFIG.encounters.baseChance + state.bossesDefeated * GAME_CONFIG.encounters.scalePerBoss;
  const rolled = Math.random() < clamp(baseChance * state.encounterRateMultiplier, 0.07, 0.95);
  if (!rolled) {
    updateExplorationHud();
    return;
  }

  const enemy = buildEnemy(shouldSpawnBoss());
  startBattle(enemy);
}

function startBattle(enemy) {
  state.battle = {
    enemy,
    round: 1,
    log: []
  };
  createEnemyMesh(enemy.isBoss);
  switchPhase(GAME_PHASE.BATTLE);
  appendBattleLog(`A ${enemy.isBoss ? "Boss" : "Monster"} appears: ${enemy.name}!`);
  appendBattleLog("Choose your action.");
  renderBattlePanel();
}

function resolveBattleRound(playerAction) {
  const battle = state.battle;
  if (!battle) {
    return;
  }
  const enemy = battle.enemy;
  const leader = partyManager.getLeader();
  const aliveParty = partyManager.getAliveMembers();
  if (!leader || !aliveParty.length) {
    handlePartyDefeat();
    return;
  }

  if (playerAction === "run") {
    if (enemy.isBoss) {
      appendBattleLog("You cannot flee from a boss.");
      playerAction = "guard";
    } else {
      const runChance = clamp(42 + leader.stats.agility * 1.5 - enemy.stats.agility, 20, 85);
      if (Math.random() * 100 < runChance) {
        appendBattleLog(`${leader.name} escaped the battle.`);
        finishBattle("escape");
        return;
      }
      appendBattleLog(`${leader.name} failed to escape.`);
      playerAction = "guard";
    }
  }

  for (const member of partyManager.members) {
    member.guard = false;
  }

  const actionMap = new Map();
  for (const member of aliveParty) {
    if (member.id === leader.id) {
      actionMap.set(member.id, playerAction);
    } else {
      actionMap.set(member.id, chooseAutoAction(member));
    }
  }

  const turnOrder = [];
  for (const member of aliveParty) {
    turnOrder.push({
      kind: "party",
      actor: member,
      initiative: CombatEngine.initiative(member)
    });
  }
  turnOrder.push({
    kind: "enemy",
    actor: enemy,
    initiative: CombatEngine.initiative(enemy) + 2
  });
  turnOrder.sort((a, b) => b.initiative - a.initiative);

  for (const turn of turnOrder) {
    if (enemy.hp <= 0 || !partyManager.getAliveMembers().length) {
      break;
    }

    if (turn.kind === "party") {
      if (turn.actor.hp <= 0) {
        continue;
      }
      executePartyAction(turn.actor, actionMap.get(turn.actor.id) || "attack");
    } else {
      executeEnemyAction(enemy);
    }
  }

  if (enemy.hp <= 0) {
    handleEnemyDefeat(enemy);
    return;
  }
  if (!partyManager.getAliveMembers().length) {
    handlePartyDefeat();
    return;
  }

  battle.round += 1;
  renderBattlePanel();
  updateHubPanel();
}

function chooseAutoAction(member) {
  const needsHealing = member.hp / member.maxHp < 0.35;
  const healSpell = member.spells.find((spell) => spell.type === "heal" && member.mp >= spell.mpCost);
  if (needsHealing && healSpell) {
    return "heal";
  }

  const damageSpell = member.spells.find((spell) => spell.type === "damage" && member.mp >= spell.mpCost);
  if (damageSpell && member.stats.intelligence >= member.stats.strength) {
    return "magic";
  }

  if (member.hp / member.maxHp < 0.25) {
    return "guard";
  }

  return "attack";
}

function executePartyAction(member, action) {
  const battle = state.battle;
  if (!battle) {
    return;
  }
  const enemy = battle.enemy;

  if (action === "guard") {
    member.guard = true;
    appendBattleLog(`${member.name} braces for impact.`);
    return;
  }

  if (action === "heal") {
    const healSpell = member.spells.find((spell) => spell.type === "heal" && member.mp >= spell.mpCost);
    const defaultCost = 5;
    const manaCost = healSpell ? healSpell.mpCost : defaultCost;
    if (member.mp < manaCost) {
      appendBattleLog(`${member.name} tried to heal but lacked MP.`);
      performPhysicalAttack(member, enemy, "party");
      return;
    }
    member.mp -= manaCost;
    const healTarget = getLowestHealthPartyMember();
    if (!healTarget) {
      performPhysicalAttack(member, enemy, "party");
      return;
    }
    const baseHeal = CombatEngine.healAmount(member);
    const powerMultiplier = healSpell ? healSpell.power : 0.9;
    const totalHeal = Math.floor(baseHeal * powerMultiplier);
    healTarget.hp = clamp(healTarget.hp + totalHeal, 0, healTarget.maxHp);
    appendBattleLog(`${member.name} restores ${healTarget.name} for ${totalHeal} HP.`);
    return;
  }

  if (action === "magic") {
    const damageSpell = member.spells.find((spell) => spell.type === "damage" && member.mp >= spell.mpCost);
    const defaultCost = 6;
    const manaCost = damageSpell ? damageSpell.mpCost : defaultCost;
    if (member.mp < manaCost) {
      appendBattleLog(`${member.name} has no MP for magic.`);
      performPhysicalAttack(member, enemy, "party");
      return;
    }
    member.mp -= manaCost;
    const baseDamage = CombatEngine.magicDamage(member, enemy);
    const powerMultiplier = damageSpell ? damageSpell.power : 1;
    const dealt = Math.floor(baseDamage * powerMultiplier);
    enemy.hp = clamp(enemy.hp - dealt, 0, enemy.maxHp);
    appendBattleLog(`${member.name} casts ${damageSpell ? damageSpell.name : "Arcane Burst"} for ${dealt} damage.`);
    return;
  }

  performPhysicalAttack(member, enemy, "party");
}

function executeEnemyAction(enemy) {
  const livingMembers = partyManager.getAliveMembers();
  if (!livingMembers.length) {
    return;
  }
  const target = pickRandom(livingMembers);

  const useMagic = enemy.mp >= 8 && enemy.stats.intelligence > enemy.stats.strength && Math.random() < 0.35;
  if (useMagic) {
    enemy.mp -= 8;
    const damage = CombatEngine.magicDamage(enemy, target);
    target.hp = clamp(target.hp - damage, 0, target.maxHp);
    appendBattleLog(`${enemy.name} unleashes Void Pulse on ${target.name} for ${damage}.`);
    if (target.hp <= 0) {
      appendBattleLog(`${target.name} has fallen.`);
    }
    return;
  }

  performPhysicalAttack(enemy, target, "enemy");
}

function performPhysicalAttack(attacker, defender, side) {
  const attackerName = attacker.name;
  const defenderName = defender.name;

  if (!CombatEngine.didHit(attacker, defender)) {
    appendBattleLog(`${attackerName}'s attack misses ${defenderName}.`);
    return;
  }
  const crit = CombatEngine.didCrit(attacker);
  const damage = CombatEngine.physicalDamage(attacker, defender, crit);
  defender.hp = clamp(defender.hp - damage, 0, defender.maxHp);

  const critTag = crit ? " critical" : "";
  appendBattleLog(`${attackerName} lands a${critTag} hit on ${defenderName} for ${damage}.`);
  if (defender.hp <= 0) {
    if (side === "enemy") {
      appendBattleLog(`${defenderName} is knocked out.`);
    } else {
      appendBattleLog(`${defenderName} collapses.`);
    }
  }
}

function getLowestHealthPartyMember() {
  const alive = partyManager.getAliveMembers();
  if (!alive.length) {
    return null;
  }
  return alive.reduce((lowest, current) => {
    const lowestRatio = lowest.hp / lowest.maxHp;
    const currentRatio = current.hp / current.maxHp;
    return currentRatio < lowestRatio ? current : lowest;
  });
}

function appendBattleLog(message) {
  if (!state.battle) {
    return;
  }
  state.battle.log.push(message);
  if (state.battle.log.length > 16) {
    state.battle.log.shift();
  }
  renderBattlePanel();
}

function renderBattlePanel() {
  if (!state.battle) {
    dom.enemyName.textContent = "Enemy: -";
    dom.enemyStats.textContent = "-";
    dom.enemyHpFill.style.width = "0%";
    dom.battleLog.innerHTML = "";
    return;
  }

  const enemy = state.battle.enemy;
  const enemyRole = enemy.isBoss ? "Boss" : "Monster";
  dom.enemyName.textContent = `${enemyRole}: ${enemy.name}`;
  dom.enemyStats.textContent = `Lvl ${enemy.level} | HP ${enemy.hp}/${enemy.maxHp} | MP ${enemy.mp}/${enemy.maxMp}`;
  dom.enemyHpFill.style.width = `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`;
  dom.battleLog.innerHTML = "";
  for (const line of state.battle.log) {
    const row = document.createElement("div");
    row.textContent = line;
    dom.battleLog.appendChild(row);
  }
  dom.battleLog.scrollTop = dom.battleLog.scrollHeight;
}

function handleEnemyDefeat(enemy) {
  appendBattleLog(`${enemy.name} has been defeated.`);

  state.gold += enemy.goldReward;
  partyManager.healAllByPercent(0.12, 0.08);

  if (enemy.isBoss) {
    state.bossesDefeated += 1;
    state.monstersDefeatedSinceBoss = 0;
    appendBattleLog("Hero Freed event triggered!");

    const newHero = unlockFreedHero();
    if (newHero) {
      appendBattleLog(`${newHero.name} joins the party.`);
    } else {
      appendBattleLog("No new class remained to unlock.");
    }
  } else {
    state.monstersDefeatedSinceBoss += 1;
  }

  updateHubPanel();
  saveGame();

  const isFinalVictory = state.bossesDefeated >= FINAL_BOSS_COUNT && partyManager.members.length >= partyManager.maxMembers;
  if (isFinalVictory) {
    finishBattle("victory");
    return;
  }

  if (enemy.isBoss) {
    finishBattle("boss_win");
  } else {
    finishBattle("monster_win");
  }
}

function handlePartyDefeat() {
  appendBattleLog("Your party has been defeated.");
  state.gold = Math.max(0, state.gold - 24);
  partyManager.healAllByPercent(0.35, 0.35);
  finishBattle("party_defeat");
}

function finishBattle(reason) {
  state.battle = null;
  clearEnemyMesh();

  if (reason === "escape") {
    switchPhase(GAME_PHASE.EXPLORATION);
    showToast("You escaped.");
    return;
  }

  if (reason === "victory") {
    const leader = partyManager.getLeader();
    dom.endingTitle.textContent = "Final Boss Defeated";
    dom.endingSummary.textContent = `${leader ? leader.name : "Your party"} cleared the final boss with a full 4-member team. The realm is free.`;
    showBanner("The final seal breaks. Peace returns.");
    switchPhase(GAME_PHASE.ENDING);
    return;
  }

  if (reason === "monster_win") {
    switchPhase(GAME_PHASE.EXPLORATION);
    showToast("Victory. Continue exploring.");
    return;
  }

  if (reason === "boss_win") {
    switchPhase(GAME_PHASE.HUB);
    showBanner("Boss defeated. A new hero has been freed.");
    return;
  }

  if (reason === "party_defeat") {
    switchPhase(GAME_PHASE.HUB);
    showToast("Defeat. The tavern patched your wounds.");
    return;
  }
}

function unlockFreedHero() {
  if (partyManager.members.length >= partyManager.maxMembers) {
    return null;
  }

  const currentClasses = new Set(partyManager.getClassNames());
  const missingClasses = Object.keys(GAME_CONFIG.classes).filter((className) => !currentClasses.has(className));
  if (!missingClasses.length) {
    return null;
  }

  const className = pickRandom(missingClasses);
  const baseStats = cloneStats(GAME_CONFIG.classes[className].baseStats);
  let pointsToSpend = GAME_CONFIG.pointBuy.pool;
  let safety = 120;
  while (pointsToSpend > 0 && safety > 0) {
    safety -= 1;
    const stat = pickRandom(STAT_KEYS);
    if (baseStats[stat] >= GAME_CONFIG.pointBuy.max) {
      continue;
    }
    baseStats[stat] += 1;
    pointsToSpend -= 1;
  }

  const randomName = pickRandom(GAME_CONFIG.heroNames);
  const heroName = `${randomName} the ${className}`;
  const newHero = partyManager.createMember(heroName, className, baseStats);
  const added = partyManager.addMember(newHero);
  if (!added) {
    return null;
  }
  showBanner(`Hero Freed: ${heroName}`);
  return newHero;
}

function saveGame() {
  if (!partyManager.members.length) {
    return;
  }

  const payload = {
    version: 1,
    savedAt: new Date().toISOString(),
    gold: state.gold,
    bossesDefeated: state.bossesDefeated,
    monstersDefeatedSinceBoss: state.monstersDefeatedSinceBoss,
    encounterRateMultiplier: state.encounterRateMultiplier,
    position: {
      x: playerMesh ? playerMesh.position.x : 0,
      z: playerMesh ? playerMesh.position.z : 0
    },
    creationClass: state.creation.className,
    party: partyManager.snapshot()
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  updateLoadScreen();
}

function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    showToast("No save data found.");
    return false;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    showToast("Save file corrupted.");
    return false;
  }

  const loaded = partyManager.loadSnapshot(data.party);
  if (!loaded) {
    showToast("Save file is missing party data.");
    return false;
  }

  state.gold = Number(data.gold) || 120;
  state.bossesDefeated = clamp(Number(data.bossesDefeated) || 0, 0, FINAL_BOSS_COUNT);
  state.monstersDefeatedSinceBoss = clamp(Number(data.monstersDefeatedSinceBoss) || 0, 0, 99);
  state.encounterRateMultiplier = clamp(Number(data.encounterRateMultiplier) || 1, 0.4, 1.8);
  state.creation.className = GAME_CONFIG.classes[data.creationClass] ? data.creationClass : partyManager.getLeader()?.className || "Warrior";
  state.distanceSinceEncounter = 0;
  state.battle = null;

  dom.encounterRateSlider.value = String(Math.round(state.encounterRateMultiplier * 100));
  dom.encounterRateValue.textContent = `${state.encounterRateMultiplier.toFixed(2)}x`;

  const leader = partyManager.getLeader();
  createOrReplacePlayerMesh(leader ? leader.className : "Warrior");
  setPlayerPosition(Number(data.position?.x) || 0, Number(data.position?.z) || 0);
  clearEnemyMesh();
  updateHubPanel();
  showToast("Save loaded.");
  return true;
}

function updateLoadScreen() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    dom.loadInfo.textContent = "No save data found.";
    dom.loadSlotBtn.disabled = true;
    return;
  }

  try {
    const data = JSON.parse(raw);
    const savedDate = data.savedAt ? new Date(data.savedAt).toLocaleString() : "Unknown time";
    const partySize = Array.isArray(data.party) ? data.party.length : 0;
    dom.loadInfo.textContent = `Save found: ${savedDate} | Gold ${data.gold ?? "?"} | Bosses ${data.bossesDefeated ?? "?"} | Party ${partySize}/4`;
    dom.loadSlotBtn.disabled = false;
  } catch (error) {
    dom.loadInfo.textContent = "Save file exists but is invalid.";
    dom.loadSlotBtn.disabled = true;
  }
}

function switchPhase(phase) {
  state.phase = phase;

  for (const screen of Object.values(dom.screens)) {
    screen.classList.remove("active");
  }

  const screenId = SCREEN_BY_PHASE[phase];
  const targetScreen = screenId ? document.getElementById(screenId) : null;
  if (targetScreen) {
    targetScreen.classList.add("active");
  }

  if (phase === GAME_PHASE.HUB) {
    updateHubPanel();
  } else if (phase === GAME_PHASE.SHOP) {
    updateShopMemberSelect();
  } else if (phase === GAME_PHASE.EXPLORATION) {
    updateExplorationHud();
  } else if (phase === GAME_PHASE.BATTLE) {
    renderBattlePanel();
  } else if (phase === GAME_PHASE.LOAD) {
    updateLoadScreen();
  }
}

function updateExplorationHud() {
  if (!playerMesh) {
    return;
  }
  const pulse = clamp(
    Math.floor((state.distanceSinceEncounter / (GAME_CONFIG.world.encounterDistance / state.encounterRateMultiplier)) * 100),
    0,
    100
  );
  dom.hudLocation.textContent = `Position: (${playerMesh.position.x.toFixed(1)}, ${playerMesh.position.z.toFixed(1)})`;
  dom.hudEncounter.textContent = `Encounter Pulse: ${pulse}%`;
  dom.hudGold.textContent = `Gold: ${state.gold}`;
  dom.hudBosses.textContent = `Bosses Defeated: ${state.bossesDefeated}`;
}

function updateExplorationMovement(delta) {
  if (state.phase !== GAME_PHASE.EXPLORATION || !playerMesh || state.battle) {
    return;
  }

  const horizontal = Number(keysDown.has("KeyD") || keysDown.has("ArrowRight")) - Number(keysDown.has("KeyA") || keysDown.has("ArrowLeft"));
  const vertical = Number(keysDown.has("KeyS") || keysDown.has("ArrowDown")) - Number(keysDown.has("KeyW") || keysDown.has("ArrowUp"));
  if (horizontal === 0 && vertical === 0) {
    return;
  }

  const moveVector = new THREE.Vector3(horizontal, 0, vertical).normalize();
  const oldX = playerMesh.position.x;
  const oldZ = playerMesh.position.z;

  const movementStep = GAME_CONFIG.world.moveSpeed * delta;
  const proposedX = oldX + moveVector.x * movementStep;
  const proposedZ = oldZ + moveVector.z * movementStep;
  const clamped = clampToWorldBounds(proposedX, proposedZ);

  if (isWalkableWorldPosition(clamped.x, clamped.z)) {
    playerMesh.position.x = clamped.x;
    playerMesh.position.z = clamped.z;
  }

  const movedDistance = Math.hypot(playerMesh.position.x - oldX, playerMesh.position.z - oldZ);
  if (movedDistance > 0) {
    state.distanceSinceEncounter += movedDistance;
    updateExplorationHud();
    triggerEncounterIfNeeded();
  }

  syncCameraToPlayer();
}

function updateAnimatedTileLayers(delta) {
  if (!animatedLayerTiles.length) {
    return;
  }

  const deltaMs = delta * 1000;
  for (const animatedTile of animatedLayerTiles) {
    animatedTile.elapsedMs += deltaMs;

    let activeFrame = animatedTile.frames[animatedTile.frameIndex];
    let frameChanged = false;

    while (animatedTile.elapsedMs >= activeFrame.durationMs) {
      animatedTile.elapsedMs -= activeFrame.durationMs;
      animatedTile.frameIndex = (animatedTile.frameIndex + 1) % animatedTile.frames.length;
      activeFrame = animatedTile.frames[animatedTile.frameIndex];
      frameChanged = true;
    }

    if (!frameChanged) {
      continue;
    }

    const uvCorners = computeTileUvCorners(
      animatedTile.tileset,
      activeFrame.gid,
      animatedTile.flipH,
      animatedTile.flipV,
      animatedTile.flipD
    );
    writeUvForTile(animatedTile.uvArray, animatedTile.tileIndex, uvCorners);
    animatedTile.uvAttribute.needsUpdate = true;
  }
}

function showToast(message) {
  dom.toast.textContent = message;
  dom.toast.classList.remove("hidden");
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    dom.toast.classList.add("hidden");
  }, 2200);
}

function showBanner(message) {
  dom.eventBanner.textContent = message;
  dom.eventBanner.classList.remove("hidden");
  dom.eventBanner.style.opacity = "1";
  if (eventTimer) {
    clearTimeout(eventTimer);
  }
  eventTimer = setTimeout(() => {
    dom.eventBanner.style.opacity = "0";
    setTimeout(() => {
      dom.eventBanner.classList.add("hidden");
      dom.eventBanner.style.opacity = "1";
    }, 240);
  }, 2500);
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateExplorationMovement(delta);
  updateAnimatedTileLayers(delta);

  for (const billboard of billboardMeshes) {
    billboard.lookAt(camera.position.x, billboard.position.y, camera.position.z);
  }

  renderer.render(scene, camera);
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
