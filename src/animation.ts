/**
 * @fileoverview Animation system for player character, managing walk cycle and direction-based sprite animation.
 * Handles sprite sheet offset updates based on movement state and direction.
 */

import * as THREE from 'three';
import { playerMesh } from './scene.js';
import { isPlayerMoving, playerDirection } from './movement.js';

let walkAnimationTimer = 0;
let currentWalkFrame = 0;

/** Timer for walk animation cycle. */
/** Current frame index in the walk cycle (0-3). */
export { walkAnimationTimer, currentWalkFrame };

/**
 * Updates the player's animation based on movement state and direction.
 * Assumes playerMesh has a texture map with 4x8 sprite sheet (4 frames horizontal, 8 directions vertical).
 * @param {number} delta - Time delta since last frame in seconds.
 */
export function updateAnimation(delta: number) {
  if (playerMesh && (playerMesh.material as THREE.MeshBasicMaterial).map) {
    walkAnimationTimer += delta;
    const frameTime = 0.15; // Speed of walk cycle - adjust for animation speed

    if (isPlayerMoving) {
      if (walkAnimationTimer >= frameTime) {
        walkAnimationTimer = 0;
        currentWalkFrame = (currentWalkFrame + 1) % 4;

        // Update Animation Frame (Horizontal) - each frame is 1/4 of texture width
        (playerMesh.material as THREE.MeshBasicMaterial).map.offset.x = currentWalkFrame / 4;

        // Update Direction Row (Vertical) - map directions to rows 0-7
        const dirToRow: Record<string, number> = {
          'down': 0,
          'up': 1,
          'left': 2,
          'right': 3,
          'down-left': 4,
          'down-right': 5,
          'up-left': 6,
          'up-right': 7
        };
        const row = dirToRow[playerDirection] || 0; // Default to down if invalid direction
        (playerMesh.material as THREE.MeshBasicMaterial).map.offset.y = (7 - row) / 8; // Invert row for correct orientation
      }
    } else {
      // Reset to Idle frame (Frame 0) when not moving
      if (currentWalkFrame !== 0) {
        currentWalkFrame = 0;
        (playerMesh.material as THREE.MeshBasicMaterial).map.offset.x = 0;
      }
      walkAnimationTimer = 0;
    }
  }
}