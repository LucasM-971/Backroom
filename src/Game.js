import * as THREE from 'three';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  VignetteEffect,
  NoiseEffect,
  ScanlineEffect,
  BloomEffect,
  ChromaticAberrationEffect,
} from 'postprocessing';

import { CONFIG } from './config.js';
import { UIManager } from './UIManager.js';
import { AudioManager } from './AudioManager.js';
import { Map } from './Map.js';
import { LightingSystem } from './LightingSystem.js';
import { Player } from './Player.js';
import { InputController } from './InputController.js';

export class Game {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.composer = null;
    this.canvas = null;
    
    this.ui = null;
    this.audio = null;
    this.map = null;
    this.lighting = null;
    this.player = null;
    this.input = null;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.moveDir = new THREE.Vector3();

    this.isPaused = false;
    this.gameOver = false;
    this.totalSeconds = CONFIG.GAME_DURATION_SECONDS;
    this.timerInterval = null;

    this.chromaticEffect = null;
    this.vignetteEffect = null;

    this.currentPixelRatio = 1;
    this.adaptiveFrameCount = 0;
    this.adaptiveTimeAccumulator = 0;

    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  async init() {
    this.ui = new UIManager();
    this.audio = new AudioManager();

    this.setupScene();
    this.setupRenderer();
    this.setupPostProcessing();
    
    this.ui.setLoadingProgress(30);
    
    await this.generateMap();
    this.ui.setLoadingProgress(60);
    
    this.buildMap();
    this.setupLighting();
    this.ui.setLoadingProgress(80);
    
    this.setupPlayer();
    this.setupInput();
    this.setupTimer();
    this.setupCollision();
    this.setupResize();
    
    this.ui.hideLoadingScreen();
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.canvas = document.getElementById('webgl');
    this.camera = new THREE.PerspectiveCamera(60, this.sizes.width / this.sizes.height, 1, 8000);

    this.scene.add(new THREE.AmbientLight(0xffffcc, 0.04));
    this.scene.background = new THREE.Color(0x000000);
    this.scene.fog = new THREE.Fog(0x000000, 200, 7000);
    this.scene.add(this.camera);
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(this.sizes.width, this.sizes.height);
    this.currentPixelRatio = Math.min(window.devicePixelRatio, CONFIG.MAX_PIXEL_RATIO);
    this.renderer.setPixelRatio(this.currentPixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = CONFIG.TONE_MAPPING_EXPOSURE;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  setupPostProcessing() {
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: 0,
    });
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomEffect = new BloomEffect({
      intensity: CONFIG.BLOOM_INTENSITY,
      luminanceThreshold: CONFIG.BLOOM_THRESHOLD,
      luminanceSmoothing: CONFIG.BLOOM_SMOOTHING,
      mipmapBlur: true,
      resolutionScale: CONFIG.BLOOM_RESOLUTION,
    });

    this.chromaticEffect = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(CONFIG.CHROMATIC_BASE, CONFIG.CHROMATIC_BASE),
    });

    const noiseEffect = new NoiseEffect({ premultiply: true });
    noiseEffect.blendMode.opacity.value = CONFIG.NOISE_OPACITY;

    this.vignetteEffect = new VignetteEffect({ 
      offset: 0.4, 
      darkness: CONFIG.VIGNETTE_DARKNESS 
    });

    const scanLineEffect = new ScanlineEffect({ density: 1.0 });
    scanLineEffect.blendMode.opacity.value = CONFIG.SCANLINE_OPACITY;

    this.composer.addPass(new EffectPass(
      this.camera, 
      bloomEffect, 
      this.chromaticEffect, 
      noiseEffect, 
      this.vignetteEffect, 
      scanLineEffect
    ));
  }

  async generateMap() {
    this.map = new Map(this.scene, new THREE.TextureLoader());
    this.map.generate();
  }

  buildMap() {
    this.map.build();
  }

  setupLighting() {
    this.lighting = new LightingSystem(this.scene, this.camera);
    this.lighting.createFlashlight();
    this.lighting.createTorch();
    this.lighting.createCeilingLights(this.map);
    this.lighting.createExitLight(this.map.getExitPosition());
  }

  setupPlayer() {
    this.player = new Player(this.camera);
    const startX = CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
    const startZ = CONFIG.TILE_SIZE + CONFIG.TILE_SIZE/2;
    this.player.setStartPosition(startX, startZ);
  }

  setupInput() {
    this.input = new InputController(this.camera, this.canvas);
    
    this.input.onClickCallback = () => {
      if (this.isPaused || this.gameOver) return;
      this.input.lock();
      this.audio.loadSounds();
      this.audio.playAmbience();
    };

    this.input.onPauseToggle = () => {
      if (this.gameOver) return;
      this.togglePause();
    };

    this.input.onRunToggle = (isRunning) => {
      this.player.setRunning(isRunning);
    };
  }

  setupCollision() {
    this.raycaster.far = CONFIG.COLLISION_DIST + 50;
  }

  setupTimer() {
    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  setupResize() {
    window.addEventListener('resize', () => {
      this.sizes.width = window.innerWidth;
      this.sizes.height = window.innerHeight;
      this.camera.aspect = this.sizes.width / this.sizes.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.composer.setSize(this.sizes.width, this.sizes.height);
    });
  }

  updateAdaptiveQuality(delta) {
    if (!CONFIG.ADAPTIVE_QUALITY) return;

    this.adaptiveFrameCount++;
    this.adaptiveTimeAccumulator += delta;

    if (this.adaptiveTimeAccumulator < CONFIG.ADAPTIVE_QUALITY_SAMPLE_SECONDS) return;

    const fps = this.adaptiveFrameCount / this.adaptiveTimeAccumulator;

    let nextPixelRatio = this.currentPixelRatio;
    const deviceMax = Math.min(window.devicePixelRatio, CONFIG.MAX_PIXEL_RATIO);

    if (fps < CONFIG.TARGET_FPS - 3) {
      nextPixelRatio = Math.max(
        CONFIG.MIN_PIXEL_RATIO,
        this.currentPixelRatio - CONFIG.ADAPTIVE_PIXEL_RATIO_STEP
      );
    } else if (fps > CONFIG.TARGET_FPS + 6) {
      nextPixelRatio = Math.min(
        deviceMax,
        this.currentPixelRatio + CONFIG.ADAPTIVE_PIXEL_RATIO_STEP
      );
    }

    if (Math.abs(nextPixelRatio - this.currentPixelRatio) >= 0.01) {
      this.currentPixelRatio = nextPixelRatio;
      this.renderer.setPixelRatio(this.currentPixelRatio);
      this.renderer.setSize(this.sizes.width, this.sizes.height);
      this.composer.setSize(this.sizes.width, this.sizes.height);
    }

    this.adaptiveFrameCount = 0;
    this.adaptiveTimeAccumulator = 0;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.ui.showPauseScreen();
      this.input.unlock();
      this.audio.stopAll();
    } else {
      this.ui.hidePauseScreen();
      this.audio.playAmbience();
    }
  }

  updateTimer() {
    if (this.isPaused) return;
    
    if (this.totalSeconds <= 0) {
      clearInterval(this.timerInterval);
      if (!this.gameOver) {
        this.gameOver = true;
        this.audio.stopAll();
        window.location.href = 'index.html';
      }
      return;
    }
    
    this.totalSeconds--;
    this.ui.updateTimer(this.totalSeconds);
  }

  checkCollision(direction) {
    this.raycaster.set(this.camera.position, direction.clone().normalize());
    const hits = this.raycaster.intersectObject(this.map.instancedWalls);
    if (hits.length > 0 && hits[0].distance < CONFIG.COLLISION_DIST) return true;
    const exitHits = this.raycaster.intersectObjects(this.map.wallMeshes);
    return exitHits.length > 0 && exitHits[0].distance < CONFIG.COLLISION_DIST;
  }

  checkExit() {
    const exitPos = this.map.getExitPosition();
    const dist = Math.hypot(
      this.camera.position.x - exitPos.x,
      this.camera.position.z - exitPos.z
    );
    
    if (dist < CONFIG.TILE_SIZE / 2) {
      this.gameOver = true;
      clearInterval(this.timerInterval);
      this.audio.stopAll();
      this.input.unlock();
      this.ui.showEndingVideo();
    }
  }

  updatePanicEffects(time) {
    if (this.totalSeconds < CONFIG.PANIC_THRESHOLD_SECONDS) {
      const ratio = 1 - this.totalSeconds / CONFIG.PANIC_THRESHOLD_SECONDS;
      const pulse = Math.sin(time * 4) * 0.5 + 0.5;
      
      this.vignetteEffect.darkness = CONFIG.VIGNETTE_DARKNESS + ratio * pulse * CONFIG.PANIC_VIGNETTE_INCREASE;
      
      const chromaticOffset = CONFIG.CHROMATIC_BASE + 
        (this.player.isRunning ? CONFIG.CHROMATIC_RUN : 0) + 
        ratio * CONFIG.PANIC_CHROMATIC_INCREASE * pulse;
      
      this.chromaticEffect.offset.set(chromaticOffset, chromaticOffset);
    } else {
      this.vignetteEffect.darkness = CONFIG.VIGNETTE_DARKNESS;
      
      const chromaticOffset = CONFIG.CHROMATIC_BASE + 
        (this.player.isRunning ? CONFIG.CHROMATIC_RUN : 0);
      
      this.chromaticEffect.offset.set(chromaticOffset, chromaticOffset);
    }
  }

  handleMovement(delta) {
    const speed = this.player.getSpeed();
    
    if (this.input.moveForward) {
      this.camera.getWorldDirection(this.moveDir);
      if (!this.checkCollision(this.moveDir)) {
        this.input.controls.moveForward(delta * speed);
        this.player.updateBasePosition();
      }
    }
    
    if (this.input.moveBackward) {
      this.camera.getWorldDirection(this.moveDir).negate();
      if (!this.checkCollision(this.moveDir)) {
        this.input.controls.moveForward(-delta * speed);
        this.player.updateBasePosition();
      }
    }
    
    if (this.input.moveLeft) {
      this.camera.getWorldDirection(this.moveDir).cross(this.camera.up).negate();
      if (!this.checkCollision(this.moveDir)) {
        this.input.controls.moveRight(-delta * speed);
        this.player.updateBasePosition();
      }
    }
    
    if (this.input.moveRight) {
      this.camera.getWorldDirection(this.moveDir).cross(this.camera.up);
      if (!this.checkCollision(this.moveDir)) {
        this.input.controls.moveRight(delta * speed);
        this.player.updateBasePosition();
      }
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    
    if (this.gameOver || this.isPaused) return;

    const delta = this.clock.getDelta();
    const time = this.clock.elapsedTime;
    const isMoving = this.input.isMoving();

    // Update player
    this.player.updateStamina(delta, isMoving);
    this.player.updateFOV();

    // Update UI
    this.ui.updateStamina(this.player.stamina);

    // Update lighting
    this.lighting.update(time, isMoving, this.player.isRunning, delta);

    // Update effects
    this.updatePanicEffects(time);

    // Update audio
    this.audio.update(isMoving, this.player.isRunning);

    // Handle movement
    this.handleMovement(delta);

    // Check exit
    this.checkExit();

    // Adaptive quality
    this.updateAdaptiveQuality(delta);

    // Render
    this.composer.render(delta);
  }

  start() {
    this.animate();
  }
}
