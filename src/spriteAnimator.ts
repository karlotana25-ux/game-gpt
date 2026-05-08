import * as THREE from 'three';
import { SPRITE_CONFIG } from './config.js';

export class SpriteAnimator {
  private mesh: THREE.Mesh;
  private idleTexture: THREE.Texture;
  private walkTexture: THREE.Texture;
  private currentTexture: THREE.Texture;
  private isMoving: boolean = false;
  private direction: string = 'down';
  private frame: number = 0;
  private timeAccum: number = 0;
  private fps: number = SPRITE_CONFIG.fps.idle;

  constructor(mesh: THREE.Mesh, idleTexture: THREE.Texture, walkTexture: THREE.Texture) {
    this.mesh = mesh;
    this.idleTexture = idleTexture;
    this.walkTexture = walkTexture;
    this.currentTexture = idleTexture;
    this.applyFrame();
  }

  setMoving(moving: boolean): void {
    if (moving !== this.isMoving) {
      this.isMoving = moving;
      this.currentTexture = moving ? this.walkTexture : this.idleTexture;
      this.fps = moving ? SPRITE_CONFIG.fps.walk : SPRITE_CONFIG.fps.idle;
      this.frame = 0;
      this.timeAccum = 0;
      this.applyFrame();
    }
  }

  setDirection(dir: string): void {
    this.direction = dir;
    this.applyFrame();
  }

  update(delta: number): void {
    this.timeAccum += delta;
    const frameDuration = 1 / this.fps;
    if (this.timeAccum >= frameDuration) {
      this.frame = (this.frame + 1) % SPRITE_CONFIG.columns;
      this.timeAccum -= frameDuration;
      this.applyFrame();
    }
  }

  private applyFrame(): void {
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.map = this.currentTexture;
    material.map.repeat.set(SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight);
    const row = SPRITE_CONFIG.directions[this.direction as keyof typeof SPRITE_CONFIG.directions];
    const offsetX = this.frame * SPRITE_CONFIG.frameWidth;
    const offsetY = (SPRITE_CONFIG.rows - 1 - row) / SPRITE_CONFIG.rows;
    material.map.offset.set(offsetX, offsetY);
  }
}