import * as THREE from 'three';
import { useGameStore } from './state.js';
import { GAME_CONFIG } from './config.js';
import { clamp } from './utils.js';
import { camera, playerMesh, playerVelocity } from './scene.js';
import { keysDown } from './ui.js';
import { checkRoamingEncounter, updateRoamingEnemies } from './game-logic.js';
import { updateExplorationHud } from './ui.js';
import { GamePhase } from './types.js';

let isPlayerMoving = false;
let playerDirection = "down"; // Default facing direction (down)

export { isPlayerMoving, playerDirection };

export function setPlayerPosition(x: number, z: number) {
  if (!playerMesh) {
    return;
  }
  playerMesh.position.x = clamp(x, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  playerMesh.position.z = clamp(z, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  if (camera) {
    camera.position.set(playerMesh.position.x, GAME_CONFIG.camera.verticalDistance, playerMesh.position.z + GAME_CONFIG.camera.followDistance);
    camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);
  }
}

export function updateExplorationMovement(delta: number) {
  const state = useGameStore.getState();
  if (state.phase !== GamePhase.EXPLORATION || !playerMesh || state.battle) {
    return;
  }

  const horizontal = Number(keysDown.has("KeyD") || keysDown.has("ArrowRight")) - Number(keysDown.has("KeyA") || keysDown.has("ArrowLeft"));
  const vertical = Number(keysDown.has("KeyS") || keysDown.has("ArrowDown")) - Number(keysDown.has("KeyW") || keysDown.has("ArrowUp"));
  isPlayerMoving = horizontal !== 0 || vertical !== 0;
  if (!isPlayerMoving) {
    playerVelocity.set(0, 0, 0);
    return;
  }

  // Update direction based on input combination
  if (vertical > 0 && horizontal > 0) {
    playerDirection = "down-right";
  } else if (vertical > 0 && horizontal < 0) {
    playerDirection = "down-left";
  } else if (vertical < 0 && horizontal > 0) {
    playerDirection = "up-right";
  } else if (vertical < 0 && horizontal < 0) {
    playerDirection = "up-left";
  } else if (vertical > 0) {
    playerDirection = "down";
  } else if (vertical < 0) {
    playerDirection = "up";
  } else if (horizontal > 0) {
    playerDirection = "right";
  } else if (horizontal < 0) {
    playerDirection = "left";
  }

  const moveVector = new THREE.Vector3(horizontal, 0, vertical).normalize();
  playerVelocity.copy(moveVector).multiplyScalar(GAME_CONFIG.world.moveSpeed);
  const oldX = playerMesh.position.x;
  const oldZ = playerMesh.position.z;

  playerMesh.position.addScaledVector(moveVector, GAME_CONFIG.world.moveSpeed * delta);
  playerMesh.position.x = clamp(playerMesh.position.x, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  playerMesh.position.z = clamp(playerMesh.position.z, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);

  const movedDistance = Math.hypot(playerMesh.position.x - oldX, playerMesh.position.z - oldZ);
  if (movedDistance > 0) {
    updateExplorationHud();
    updateRoamingEnemies(delta);
    checkRoamingEncounter();
  }

  if (camera) {
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + GAME_CONFIG.camera.followDistance;
    camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);
  }
}