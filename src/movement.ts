/**
 * @fileoverview Movement system for player character in exploration mode, including input handling, direction updates, and camera following.
 */

import * as THREE from 'three';
import { useGameStore } from './state.js';
import { GAME_CONFIG } from './config.js';
import { clamp } from './utils.js';
import { camera, playerMesh, playerVelocity } from './scene.js';
import { keysDown } from './ui.js';
import { checkRoamingEncounter, updateRoamingEnemies } from './game-logic.js';
import { updateExplorationHud } from './ui.js';
import { GamePhase } from './types.js';

/** Whether the player is currently moving. */
/** Current facing direction of the player. */
let isPlayerMoving = false;
let playerDirection = "down"; // Default facing direction (down)

export { isPlayerMoving, playerDirection };

/**
 * Sets the player's position, clamping to world bounds and updating camera.
 * Assumes playerMesh and camera are initialized.
 * @param {number} x - X coordinate.
 * @param {number} z - Z coordinate.
 */
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

/**
 * Updates player movement in exploration mode based on keyboard input.
 * Handles direction calculation, position updates, collision clamping, and triggers encounters.
 * Only active in EXPLORATION phase and when not in battle.
 * @param {number} delta - Time elapsed since last frame in seconds.
 */
export function updateExplorationMovement(delta: number) {
  const state = useGameStore.getState();
  if (state.phase !== GamePhase.EXPLORATION || !playerMesh || state.battle) {
    return;
  }

  // Calculate input direction: 1 for right/down, -1 for left/up, 0 for neutral
  const horizontal = Number(keysDown.has("KeyD") || keysDown.has("ArrowRight")) - Number(keysDown.has("KeyA") || keysDown.has("ArrowLeft"));
  const vertical = Number(keysDown.has("KeyS") || keysDown.has("ArrowDown")) - Number(keysDown.has("KeyW") || keysDown.has("ArrowUp"));
  isPlayerMoving = horizontal !== 0 || vertical !== 0;
  if (!isPlayerMoving) {
    playerVelocity.set(0, 0, 0);
    return;
  }

  // Update direction based on input combination - prioritizes diagonal then cardinal
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

  const moveVector = new THREE.Vector3(horizontal, 0, vertical).normalize(); // Normalized for consistent diagonal speed
  playerVelocity.copy(moveVector).multiplyScalar(GAME_CONFIG.world.moveSpeed);
  const oldX = playerMesh.position.x;
  const oldZ = playerMesh.position.z;

  playerMesh.position.addScaledVector(moveVector, GAME_CONFIG.world.moveSpeed * delta);
  // Clamp position to world bounds to prevent going outside map
  playerMesh.position.x = clamp(playerMesh.position.x, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);
  playerMesh.position.z = clamp(playerMesh.position.z, -GAME_CONFIG.world.mapHalfExtent + 1, GAME_CONFIG.world.mapHalfExtent - 1);

  const movedDistance = Math.hypot(playerMesh.position.x - oldX, playerMesh.position.z - oldZ);
  if (movedDistance > 0) {
    updateExplorationHud(); // Update UI distance counter
    updateRoamingEnemies(delta); // Move roaming enemies
    checkRoamingEncounter(); // Check for random encounters
  }

  if (camera) {
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + GAME_CONFIG.camera.followDistance;
    camera.lookAt(playerMesh.position.x, 0, playerMesh.position.z);
  }
}