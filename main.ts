import { setupThreeScene, renderScene, clock } from "./src/scene.js";
import { setupUI } from "./src/ui.js";
import { updateExplorationMovement } from "./src/movement.js";
import { updateAnimation } from "./src/animation.js";

bootstrap();

function bootstrap() {
  setupThreeScene(document.getElementById("scene-container"));
  setupUI();
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  updateExplorationMovement(delta);
  updateAnimation(delta);

  renderScene();
}