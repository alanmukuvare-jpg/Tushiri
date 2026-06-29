const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startButton = document.getElementById('startButton');
const messageElement = document.getElementById('message');

const GAME_WIDTH = 360;
const GAME_HEIGHT = 640;
const GRAVITY = 0.6;
const FLAP_STRENGTH = -11;
const PIPE_SPEED = 3.2;
const PIPE_GAP = 150;
const PIPE_WIDTH = 70;
const PIPE_SPACING = 190;
const FLOOR_HEIGHT = 0;

let bird = null;
let pipes = [];
let score = 0;
let highScore = 0;
let frame = 0;
let gameState = 'ready';
let lastTap = 0;
let animationId = null;

function setCanvasSize() {
  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = GAME_WIDTH * devicePixelRatio;
  canvas.height = GAME_HEIGHT * devicePixelRatio;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function resetGame() {
  bird = {
    x: 80,
    y: GAME_HEIGHT / 2,
    radius: 16,
    velocity: 0,
    rotation: 0,
  };

  pipes = [];
  score = 0;
  frame = 0;
  updateScoreDisplay();
  gameState = 'ready';
  overlay.style.display = 'grid';
  messageElement.textContent = 'Tap or click to start';
}

function loadHighScore() {
  const stored = Number(localStorage.getItem('flappyCloneHighScore') || 0);
  if (!Number.isNaN(stored)) highScore = stored;
  highScoreElement.textContent = highScore;
}

function saveHighScore() {
  localStorage.setItem('flappyCloneHighScore', highScore);
}

function spawnPipe() {
  const minHeight = 80;
  const maxHeight = GAME_HEIGHT - PIPE_GAP - 120;
  const topHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
  pipes.push({ x: GAME_WIDTH, top: topHeight, passed: false });
}

function flap() {
  if (gameState === 'over') {
    resetGame();
    return;
  }

  if (gameState === 'ready') {
    gameState = 'playing';
    overlay.style.display = 'none';
  }

  bird.velocity = FLAP_STRENGTH;
}

function updateScoreDisplay() {
  scoreElement.textContent = score;
  highScoreElement.textContent = highScore;
}

function update() {
  if (gameState === 'playing') {
    bird.velocity += GRAVITY;
    bird.y += bird.velocity;
    bird.rotation = Math.min((bird.velocity / 15) * 0.9, 0.9);

    if (frame % PIPE_SPACING === 0) spawnPipe();

    pipes.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
      if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
        pipe.passed = true;
        score += 1;
        updateScoreDisplay();
        if (score > highScore) {
          highScore = score;
          saveHighScore();
          updateScoreDisplay();
        }
      }
    });

    pipes = pipes.filter(pipe => pipe.x + PIPE_WIDTH > -20);

    if (checkCollision()) {
      gameState = 'over';
      overlay.style.display = 'grid';
      messageElement.textContent = 'Game Over - Tap to retry';
    }
  }
}

function checkCollision() {
  if (bird.y - bird.radius <= 0 || bird.y + bird.radius >= GAME_HEIGHT - FLOOR_HEIGHT) {
    return true;
  }

  return pipes.some(pipe => {
    const withinX = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + PIPE_WIDTH;
    if (!withinX) return false;
    const abovePipe = bird.y - bird.radius < pipe.top;
    const belowGap = bird.y + bird.radius > pipe.top + PIPE_GAP;
    return abovePipe || belowGap;
  });
}

function drawBackground() {
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  skyGradient.addColorStop(0, '#0f172a');
  skyGradient.addColorStop(1, '#0b1220');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawPipes() {
  ctx.fillStyle = '#22c55e';
  pipes.forEach(pipe => {
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top);
    const bottomHeight = GAME_HEIGHT - pipe.top - PIPE_GAP;
    ctx.fillRect(pipe.x, pipe.top + PIPE_GAP, PIPE_WIDTH, bottomHeight);

    ctx.fillStyle = '#166534';
    ctx.fillRect(pipe.x + 10, pipe.top - 12, PIPE_WIDTH - 20, 10);
    ctx.fillRect(pipe.x + 10, pipe.top + PIPE_GAP, PIPE_WIDTH - 20, 10);
    ctx.fillStyle = '#22c55e';
  });
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(6, -4, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.moveTo(-bird.radius, 4);
  ctx.lineTo(bird.radius + 6, 4);
  ctx.lineTo(bird.radius, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFloor() {
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, GAME_HEIGHT - FLOOR_HEIGHT, GAME_WIDTH, FLOOR_HEIGHT);
}

function draw() {
  drawBackground();
  drawPipes();
  drawBird();
  drawFloor();

  if (gameState === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function gameLoop() {
  update();
  draw();
  frame += 1;
  animationId = requestAnimationFrame(gameLoop);
}

function handleInput(event) {
  const isRecentTap = performance.now() - lastTap < 250;
  lastTap = performance.now();
  if (isRecentTap) return;
  flap();
}

window.addEventListener('resize', setCanvasSize);
canvas.addEventListener('pointerdown', handleInput);
startButton.addEventListener('click', () => {
  flap();
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    flap();
  }
});

setCanvasSize();
loadHighScore();
resetGame();
gameLoop();
