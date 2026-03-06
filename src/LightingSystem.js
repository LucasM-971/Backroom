import * as THREE from 'three';
import { CONFIG } from './config.js';

export class LightingSystem {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.flashlight = null;
    this.playerLight = null;
    this.ceilingLights = [];
    this.exitLight = null;
    this.torchGroup = null;

    this.flashlightPos = new THREE.Vector3();
    this.flashlightDir = new THREE.Vector3();
    this.flashlightTargetPos = new THREE.Vector3();

    this.flickerAccumulator = 0;
    this.visibilityAccumulator = 0;
  }

  createFlashlight() {
    this.flashlight = new THREE.SpotLight(
      0xfff2cc,
      CONFIG.FLASHLIGHT_INTENSITY,
      CONFIG.FLASHLIGHT_DISTANCE,
      CONFIG.FLASHLIGHT_ANGLE,
      CONFIG.FLASHLIGHT_PENUMBRA,
      CONFIG.FLASHLIGHT_DECAY
    );
    this.flashlight.position.set(0, 0, 0);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.width = CONFIG.SHADOW_MAP_SIZE;
    this.flashlight.shadow.mapSize.height = CONFIG.SHADOW_MAP_SIZE;
    this.flashlight.shadow.camera.near = 10;
    this.flashlight.shadow.camera.far = CONFIG.FLASHLIGHT_DISTANCE;
    this.flashlight.shadow.bias = CONFIG.SHADOW_BIAS;

    this.flashlight.target.position.set(0, 0, -1);

    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    this.playerLight = new THREE.PointLight(0xfff5cc, CONFIG.PLAYER_LIGHT_INTENSITY, CONFIG.PLAYER_LIGHT_DISTANCE);
    this.scene.add(this.playerLight);
  }

  createTorch() {
    this.torchGroup = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 10, 60, 8),
      new THREE.MeshLambertMaterial({ color: 0x333333 })
    );
    this.torchGroup.add(body);

    const hand = new THREE.Mesh(
      new THREE.CylinderGeometry(12, 8, 20, 8),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    hand.position.y = 40;
    this.torchGroup.add(hand);

    const glass = new THREE.Mesh(
      new THREE.CircleGeometry(11, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffaa })
    );
    glass.position.y = 51;
    glass.rotation.x = -Math.PI / 2;
    this.torchGroup.add(glass);

    this.torchGroup.position.set(30, -30, -60);
    this.torchGroup.rotation.x = Math.PI / 2;
    this.torchGroup.castShadow = true;
    this.camera.add(this.torchGroup);
  }

  createCeilingLights(map) {
    map.map.forEach((row, z) => {
      row.forEach((cell, x) => {
        if (cell === 0 && Math.random() < CONFIG.CEILING_LIGHT_PROBABILITY) {
          const light = new THREE.PointLight(0xffffcc, CONFIG.CEILING_LIGHT_INTENSITY, CONFIG.CEILING_LIGHT_DISTANCE);
          light.position.set(x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2, CONFIG.WALL_HEIGHT - 20, z * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2);
          light.userData.flicker = Math.random() < CONFIG.CEILING_LIGHT_FLICKER_PROBABILITY;
          light.userData.offset = Math.random() * 100;
          light.userData.baseIntensity = CONFIG.CEILING_LIGHT_INTENSITY;
          light.visible = false;
          this.scene.add(light);
          this.ceilingLights.push(light);
        }
      });
    });
  }

  createExitLight(exitPos) {
    this.exitLight = new THREE.PointLight(0x00ff88, CONFIG.EXIT_LIGHT_INTENSITY, CONFIG.EXIT_LIGHT_DISTANCE);
    this.exitLight.position.set(exitPos.x, CONFIG.WALL_HEIGHT/2, exitPos.z);
    this.scene.add(this.exitLight);
  }

  updateFlashlight(time, isRunning) {
    this.camera.getWorldPosition(this.flashlightPos);
    this.camera.getWorldDirection(this.flashlightDir);

    this.flashlight.position.copy(this.flashlightPos);
    this.flashlightTargetPos.copy(this.flashlightPos).addScaledVector(this.flashlightDir, 600);
    this.flashlight.target.position.copy(this.flashlightTargetPos);

    const shake = isRunning ? CONFIG.SHAKE_RUN : CONFIG.SHAKE_WALK;
    this.flashlight.target.position.x += Math.sin(time * 8) * shake;
    this.flashlight.target.position.y += Math.sin(time * 6) * shake * 0.5;
    this.flashlight.target.updateMatrixWorld();

    this.playerLight.position.copy(this.flashlightPos);
  }

  updateTorch(time, isMoving, isRunning) {
    const bobSpeed = isRunning ? CONFIG.TORCH_BOB_SPEED_RUN : CONFIG.TORCH_BOB_SPEED_WALK;
    const bobAmount = isMoving ? CONFIG.TORCH_BOB_AMOUNT : CONFIG.TORCH_BOB_AMOUNT_IDLE;
    this.torchGroup.position.y = -30 + Math.sin(time * bobSpeed) * bobAmount;
    this.torchGroup.position.x = 30 + Math.sin(time * bobSpeed * 0.5) * bobAmount * 0.5;
  }

  updateCeilingLights(time, delta) {
    this.visibilityAccumulator += delta;
    if (this.visibilityAccumulator >= CONFIG.CEILING_LIGHT_VISIBILITY_UPDATE_INTERVAL) {
      this.visibilityAccumulator = 0;
      const activeDistSq = CONFIG.CEILING_LIGHT_ACTIVE_DISTANCE * CONFIG.CEILING_LIGHT_ACTIVE_DISTANCE;

      for (const light of this.ceilingLights) {
        const dx = light.position.x - this.flashlightPos.x;
        const dz = light.position.z - this.flashlightPos.z;
        light.visible = (dx * dx + dz * dz) <= activeDistSq;
      }
    }

    this.flickerAccumulator += delta;
    if (this.flickerAccumulator < CONFIG.CEILING_LIGHT_FLICKER_UPDATE_INTERVAL) return;
    this.flickerAccumulator = 0;

    for (const light of this.ceilingLights) {
      if (!light.visible) continue;

      if (light.userData.flicker) {
        light.intensity = Math.sin(time * 20 + light.userData.offset) > 0.7
          ? Math.random() * 0.5
          : light.userData.baseIntensity;
      }
    }
  }

  update(time, isMoving, isRunning, delta) {
    this.updateFlashlight(time, isRunning);
    this.updateTorch(time, isMoving, isRunning);
    this.updateCeilingLights(time, delta);
  }
}
