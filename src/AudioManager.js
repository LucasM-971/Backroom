import { CONFIG } from './config.js';

export class AudioManager {
  constructor() {
    this.walkSound = new Audio(CONFIG.SOUNDS.WALK);
    this.runSound = new Audio(CONFIG.SOUNDS.RUN);
    this.ambienceSound = new Audio(CONFIG.SOUNDS.AMBIENCE);

    this.walkSound.loop = true;
    this.runSound.loop = true;
    this.ambienceSound.loop = true;
    this.ambienceSound.volume = 1;

    this.isPlaying = false;
  }

  loadSounds() {
    this.walkSound.load();
    this.runSound.load();
  }

  playAmbience() {
    if (!this.isPlaying) {
      this.ambienceSound.play();
      this.isPlaying = true;
    }
  }

  pauseAmbience() {
    this.ambienceSound.pause();
    this.isPlaying = false;
  }

  update(isMoving, isRunning) {
    if (isMoving && isRunning) {
      if (!this.walkSound.paused) this.walkSound.pause();
      if (this.runSound.paused) this.runSound.play();
    } else if (isMoving) {
      if (!this.runSound.paused) this.runSound.pause();
      if (this.walkSound.paused) this.walkSound.play();
    } else {
      this.walkSound.pause();
      this.runSound.pause();
    }
  }

  stopAll() {
    this.walkSound.pause();
    this.runSound.pause();
    this.pauseAmbience();
  }
}
