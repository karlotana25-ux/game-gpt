/**
 * @fileoverview Main entry point for the game, initializing the Three.js scene, UI, and animation loop.
 */

import { setupThreeScene, renderScene, clock } from "./src/scene.ts";
import { setupUI } from "./src/ui.ts";
import { updateExplorationMovement } from "./src/movement.ts";
import { updateAnimation } from "./src/animation.ts";

bootstrap();

/**
 * Initializes the game by setting up the scene and UI, then starting the animation loop.
 * Assumes the DOM element with id "scene-container" exists.
 */
function bootstrap() {
  setupThreeScene(document.getElementById("scene-container"));
  setupUI();
  animate();
}

/**
 * The main animation loop that updates game logic and renders the scene each frame.
 * Uses requestAnimationFrame for smooth animation.
 */
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateExplorationMovement(delta);
  updateAnimation(delta);

  renderScene();
}