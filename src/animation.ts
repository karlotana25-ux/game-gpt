import * as THREE from 'three';
import { playerMesh } from './scene.js';
import { isPlayerMoving, playerDirection } from './movement.js';

let walkAnimationTimer = 0;
let currentWalkFrame = 0;

export { walkAnimationTimer, currentWalkFrame };

export function updateAnimation(delta: number) {
  if (playerMesh && (playerMesh.material as THREE.MeshBasicMaterial).map) {
    walkAnimationTimer += delta;
    const frameTime = 0.15; // Speed of walk cycle

    if (isPlayerMoving) {
      if (walkAnimationTimer >= frameTime) {
        walkAnimationTimer = 0;
        currentWalkFrame = (currentWalkFrame + 1) % 4;

        // Update Animation Frame (Horizontal)
        (playerMesh.material as THREE.MeshBasicMaterial).map.offset.x = currentWalkFrame / 4;

        // Update Direction Row (Vertical)
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
        const row = dirToRow[playerDirection] || 0;
        (playerMesh.material as THREE.MeshBasicMaterial).map.offset.y = (7 - row) / 8;
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