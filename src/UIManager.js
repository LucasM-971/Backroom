import { CONFIG } from './config.js';

export class UIManager {
  constructor() {
    this.loadingScreen = null;
    this.loadingBar = null;
    this.pauseScreen = null;
    this.staminaWrapper = null;
    this.staminaBar = null;
    this.timerElement = null;
    this.endingVideo = null;

    this.createLoadingScreen();
    this.createPauseScreen();
    this.createStaminaBar();
    this.createEndingVideo();
  }

  createLoadingScreen() {
    this.loadingScreen = document.createElement('div');
    this.loadingScreen.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:#000; display:flex; flex-direction:column;
      align-items:center; justify-content:center; z-index:9999;
      font-family:monospace; color:#ffffcc;
    `;
    this.loadingScreen.innerHTML = `
      <div style="font-size:22px; margin-bottom:24px; letter-spacing:5px;">GENERATING MAZE...</div>
      <div style="width:280px; height:4px; background:#222; border-radius:2px;">
        <div id="loading-bar" style="width:0%; height:100%; background:#ffffcc; border-radius:2px; transition:width 0.3s;"></div>
      </div>
    `;
    document.body.appendChild(this.loadingScreen);
    this.loadingBar = document.getElementById('loading-bar');
  }

  createPauseScreen() {
    this.pauseScreen = document.createElement('div');
    this.pauseScreen.style.cssText = `
      position:fixed; top:0; left:0; width:100%; height:100%;
      background:rgba(0,0,0,0.85); display:none; flex-direction:column;
      align-items:center; justify-content:center; z-index:888;
      font-family:monospace; color:#ffffcc;
    `;
    this.pauseScreen.innerHTML = `
      <div style="font-size:34px; margin-bottom:20px; letter-spacing:6px;">PAUSE</div>
      <div style="font-size:13px; opacity:0.5; letter-spacing:3px; margin-bottom:40px;">ÉCHAP pour reprendre</div>
      <button id="restart-btn" style="
        padding:12px 30px; margin:10px; font-size:14px; letter-spacing:2px;
        background:transparent; border:2px solid #ffffcc; color:#ffffcc;
        font-family:monospace; cursor:pointer; transition:all 0.3s;
      ">RELANCER LA PARTIE</button>
      <button id="quit-btn" style="
        padding:12px 30px; margin:10px; font-size:14px; letter-spacing:2px;
        background:transparent; border:2px solid #ffffcc; color:#ffffcc;
        font-family:monospace; cursor:pointer; transition:all 0.3s;
      ">QUITTER LE JEU</button>
    `;
    document.body.appendChild(this.pauseScreen);

    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
    document.getElementById('quit-btn').addEventListener('click', () => location.href = 'index.html');

    const pauseButtons = [document.getElementById('restart-btn'), document.getElementById('quit-btn')];
    pauseButtons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#ffffcc';
        btn.style.color = '#000';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        btn.style.color = '#ffffcc';
      });
    });
  }

  createStaminaBar() {
    this.staminaWrapper = document.createElement('div');
    this.staminaWrapper.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%);
      width:180px; height:5px; background:#1a1a1a; border-radius:3px; z-index:100;
    `;
    this.staminaBar = document.createElement('div');
    this.staminaBar.style.cssText = `
      width:100%; height:100%; background:#00ff88;
      border-radius:3px; transition:width 0.1s, background 0.3s;
    `;
    this.staminaWrapper.appendChild(this.staminaBar);
    document.body.appendChild(this.staminaWrapper);
  }

  createEndingVideo() {
    this.endingVideo = document.createElement('video');
    this.endingVideo.src = CONFIG.VIDEOS.ENDING;
    this.endingVideo.style.cssText = `
      display:none; position:fixed; top:0; left:0;
      width:100%; height:100%; z-index:999;
    `;
    document.body.appendChild(this.endingVideo);
  }

  setLoadingProgress(percent) {
    if (this.loadingBar) {
      this.loadingBar.style.width = `${percent}%`;
    }
  }

  hideLoadingScreen() {
    this.loadingBar.style.width = '100%';
    setTimeout(() => {
      this.loadingScreen.style.transition = 'opacity 0.6s';
      this.loadingScreen.style.opacity = '0';
      setTimeout(() => this.loadingScreen.remove(), 600);
    }, 3000);
  }

  showPauseScreen() {
    this.pauseScreen.style.display = 'flex';
  }

  hidePauseScreen() {
    this.pauseScreen.style.display = 'none';
  }

  updateStamina(stamina) {
    this.staminaBar.style.width = `${stamina}%`;
    this.staminaBar.style.background = stamina < CONFIG.STAMINA_LOW_THRESHOLD ? '#ff4444' : '#00ff88';
  }

  updateTimer(totalSeconds) {
    if (!this.timerElement) {
      this.timerElement = document.getElementById('timer');
    }
    if (this.timerElement) {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      this.timerElement.textContent = minutes + ':' + String(seconds).padStart(2, '0');
    }
  }

  showEndingVideo() {
    this.endingVideo.style.display = 'block';
    this.endingVideo.play();
    this.endingVideo.addEventListener('click', () => { window.location.href = 'index.html'; });
    this.endingVideo.addEventListener('ended', () => { window.location.href = 'index.html'; });
  }
}
