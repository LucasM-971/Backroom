import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class InputController {
  constructor(camera, canvas) {
    this.controls = new PointerLockControls(camera, document.body);
    this.canvas = canvas;
    
    this.moveForward = false;
    this.moveBackward = false;
    this.moveLeft = false;
    this.moveRight = false;

    this.onPauseToggle = null;
    this.onRunToggle = null;
    this.onClickCallback = null;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('click', () => {
      if (this.onClickCallback) {
        this.onClickCallback();
      }
    });

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
    document.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  handleKeyDown(e) {
    if (e.code === 'Escape') {
      if (this.onPauseToggle) {
        this.onPauseToggle();
      }
      return;
    }

    switch (e.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'ShiftLeft': 
        if (this.onRunToggle) {
          this.onRunToggle(true);
        }
        break;
    }
  }

  handleKeyUp(e) {
    switch (e.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'ShiftLeft':
        if (this.onRunToggle) {
          this.onRunToggle(false);
        }
        break;
    }
  }

  isMoving() {
    return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
  }

  lock() {
    this.controls.lock();
  }

  unlock() {
    this.controls.unlock();
  }
}
