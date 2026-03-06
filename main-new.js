import { Game } from './src/Game.js';

// Initialize and start the game
const game = new Game();

game.init().then(() => {
  game.start();
}).catch(error => {
  console.error('Failed to initialize game:', error);
});
