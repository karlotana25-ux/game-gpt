/**
 * @fileoverview Main entry point for the TypeScript version of the game, initializing scene, UI, battle listeners, and animation loop.
 */

import { setupThreeScene, renderScene, clock } from "./src/scene.js";
import { setupUI } from "./src/ui.js";
import { updateExplorationMovement } from "./src/movement.js";
import { updateAnimation } from "./src/animation.js";
import { initBattleListeners } from "./src/battle.js";
import { GAME_CONFIG } from "./src/config.js";

bootstrap();

/**
 * Initializes the game by setting up the scene, UI, battle listeners, then starting the animation loop.
 * Assumes DOM is ready.
 */
function bootstrap() {
  setupThreeScene(document.getElementById("scene-container"));
  setupUI();
  initBattleListeners();
  animate();
}

/**
 * The main animation loop that updates game logic and renders the scene each frame.
 * Skips animation update in KRPG mode.
 */
function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateExplorationMovement(delta);
  if (!GAME_CONFIG.krpgMode) {
    updateAnimation(delta);
  }

  renderScene();
}