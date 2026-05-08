import { setupThreeScene, renderScene, clock } from "./src/scene.js";
import { setupUI } from "./src/ui.js";
import { updateExplorationMovement } from "./src/movement.js";
import { updateAnimation } from "./src/animation.js";
import { initBattleListeners } from "./src/battle.js";

bootstrap();

function bootstrap() {
  setupThreeScene(document.getElementById("scene-container"));
  setupUI();
  initBattleListeners();
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateExplorationMovement(delta);
  updateAnimation(delta);

  renderScene();
}