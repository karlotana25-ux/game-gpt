/**
 * @fileoverview Sprite animator for managing animated sprites in Three.js scenes.
 * Handles idle/walk animations, direction changes, and frame updates.
 */

import * as THREE from 'three';
import { SPRITE_CONFIG } from './config.js';

/** Class for animating sprites with idle and walk states, direction changes. */
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

  /**
   * Initializes the animator with mesh and textures.
   * Sets up initial idle state.
   * @param {THREE.Mesh} mesh - The mesh to animate.
   * @param {THREE.Texture} idleTexture - Idle animation texture.
   * @param {THREE.Texture} walkTexture - Walk animation texture.
   */
  constructor(mesh: THREE.Mesh, idleTexture: THREE.Texture, walkTexture: THREE.Texture) {
    this.mesh = mesh;
    this.idleTexture = idleTexture;
    this.walkTexture = walkTexture;
    this.currentTexture = idleTexture;
    this.applyFrame();
  }

  /**
   * Sets the moving state, switching between idle and walk textures.
   * Resets animation frame when state changes.
   * @param {boolean} moving - True for walk animation, false for idle.
   */
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

  /**
   * Sets the direction for animation, updating the sprite row.
   * Assumes dir is a valid key in SPRITE_CONFIG.directions.
   * @param {string} dir - The direction (e.g., 'down', 'up').
   */
  setDirection(dir: string): void {
    this.direction = dir;
    this.applyFrame();
  }

  /**
   * Updates the animation frame based on elapsed time.
   * Cycles through frames at the set FPS.
   * @param {number} delta - Time elapsed since last update in seconds.
   */
  update(delta: number): void {
    this.timeAccum += delta;
    const frameDuration = 1 / this.fps;
    if (this.timeAccum >= frameDuration) {
      this.frame = (this.frame + 1) % SPRITE_CONFIG.columns;
      this.timeAccum -= frameDuration;
      this.applyFrame();
    }
  }

  /**
   * Applies the current frame and direction to the mesh material.
   * Calculates texture offset based on frame and row.
   * Assumes texture is a sprite sheet with defined rows and columns.
   */
  private applyFrame(): void {
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.map = this.currentTexture;
    material.map.repeat.set(SPRITE_CONFIG.frameWidth, SPRITE_CONFIG.frameHeight);
    const row = SPRITE_CONFIG.directions[this.direction as keyof typeof SPRITE_CONFIG.directions];
    const offsetX = this.frame * SPRITE_CONFIG.frameWidth;
    const offsetY = (SPRITE_CONFIG.rows - 1 - row) / SPRITE_CONFIG.rows; // Invert row for correct orientation
    material.map.offset.set(offsetX, offsetY);
  }
}