import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.stamina = CONFIG.STAMINA_MAX;
    this.baseCameraX = 0;
    this.baseCameraZ = 0;
    this.isRunning = false;
  }

  setStartPosition(x, z) {
    this.baseCameraX = x;
    this.baseCameraZ = z;
    this.camera.position.set(x, CONFIG.PLAYER_HEIGHT, z);
  }

  updateStamina(delta, isMoving) {
    if (this.isRunning && isMoving) {
      this.stamina -= delta * CONFIG.STAMINA_DRAIN_RATE;
      if (this.stamina <= 0) {
        this.stamina = 0;
        this.isRunning = false;
      }
    } else {
      this.stamina = Math.min(CONFIG.STAMINA_MAX, this.stamina + delta * CONFIG.STAMINA_REGEN_RATE);
    }
  }

  updateCameraBob(time, isMoving) {
    if (isMoving) {
      const cameraBobSpeed = this.isRunning ? CONFIG.BOB_SPEED_RUN : CONFIG.BOB_SPEED_WALK;
      const cameraBobAmount = this.isRunning ? CONFIG.BOB_AMOUNT_RUN : CONFIG.BOB_AMOUNT_WALK;

      const verticalBob = Math.sin(time * cameraBobSpeed) * cameraBobAmount;
      const horizontalBob = Math.sin(time * cameraBobSpeed * 0.5) * (cameraBobAmount * CONFIG.BOB_HORIZONTAL_FACTOR);
      const diagonalBob = Math.cos(time * cameraBobSpeed * 0.7) * (cameraBobAmount * CONFIG.BOB_DIAGONAL_FACTOR);

      this.camera.position.y = CONFIG.PLAYER_HEIGHT + verticalBob;
      this.camera.position.x = this.baseCameraX + horizontalBob;
      this.camera.position.z = this.baseCameraZ + diagonalBob;
    } else {
      this.camera.position.y += (CONFIG.PLAYER_HEIGHT - this.camera.position.y) * 0.1;
      this.camera.position.x += (this.baseCameraX - this.camera.position.x) * 0.1;
      this.camera.position.z += (this.baseCameraZ - this.camera.position.z) * 0.1;
    }
  }

  updateFOV() {
    const targetFOV = this.isRunning ? CONFIG.FOV_RUNNING : CONFIG.FOV_NORMAL;
    this.camera.fov += (targetFOV - this.camera.fov) * CONFIG.FOV_TRANSITION_SPEED;
    this.camera.updateProjectionMatrix();
  }

  updateBasePosition() {
    this.baseCameraX = this.camera.position.x;
    this.baseCameraZ = this.camera.position.z;
  }

  getSpeed() {
    return this.isRunning ? CONFIG.RUN_SPEED : CONFIG.WALK_SPEED;
  }

  setRunning(value) {
    if (value && this.stamina > 0) {
      this.isRunning = true;
    } else {
      this.isRunning = false;
    }
  }
}
