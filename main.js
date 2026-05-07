import { setupThreeScene, renderScene, clock } from "./src/scene.ts";
import { setupUI } from "./src/ui.ts";
import { updateExplorationMovement } from "./src/movement.ts";
import { updateAnimation } from "./src/animation.ts";

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