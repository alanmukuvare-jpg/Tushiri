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
const CLOUD_COUNT = 6;

let bird = null;
let pipes = [];
let clouds = [];
let score = 0;
let highScore = 0;
let frame = 0;
let gameState = 'ready';
let lastTap = 0;
let animationId = null;
let audioContext = null;
let soundInitialized = false;

function initAudio() {
  if (soundInitialized) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  soundInitialized = true;
}

function playTone(freq, duration = 0.12, type = 'sine', volume = 0.18) {
  if (!soundInitialized || !audioContext) return;
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
  gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
}

function playNoise(duration = 0.2, volume = 0.25) {
  if (!soundInitialized || !audioContext) return;
  const bufferSize = audioContext.sampleRate * duration;
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i += 1) {
    data[i] = (Math.random() * 2 - 1) * 0.35;
  }
  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  const gain = audioContext.createGain();
  gain.gain.setValueAtTime(volume, audioContext.currentTime);
  noise.connect(gain);
  gain.connect(audioContext.destination);
  noise.start();
  noise.stop(audioContext.currentTime + duration);
}

function playFlapSound() {
  playTone(520, 0.08, 'triangle', 0.16);
}

function playScoreSound() {
  playTone(860, 0.06, 'square', 0.14);
  setTimeout(() => playTone(720, 0.08, 'square', 0.12), 60);
}

function playCrashSound() {
  playNoise(0.18, 0.25);
}

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
  clouds = [];
  score = 0;
  frame = 0;
  updateScoreDisplay();
  gameState = 'ready';
  overlay.style.display = 'grid';
  messageElement.textContent = 'Tap or click to start';

  for (let i = 0; i < CLOUD_COUNT; i += 1) {
    clouds.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * (GAME_HEIGHT * 0.45),
      width: 60 + Math.random() * 40,
      height: 24 + Math.random() * 16,
      speed: 0.4 + Math.random() * 0.6,
    });
  }
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
  playFlapSound();
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

    clouds.forEach(cloud => {
      cloud.x += cloud.speed;
      if (cloud.x - cloud.width > GAME_WIDTH) {
        cloud.x = -cloud.width;
        cloud.y = Math.random() * (GAME_HEIGHT * 0.45);
      }
    });

    if (frame % PIPE_SPACING === 0) spawnPipe();

    pipes.forEach(pipe => {
      pipe.x -= PIPE_SPEED;
      if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
        pipe.passed = true;
        score += 1;
        updateScoreDisplay();
        playScoreSound();
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
      playCrashSound();
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
  const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  skyGradient.addColorStop(0, '#7dd3fc');
  skyGradient.addColorStop(0.5, '#9dd6f2');
  skyGradient.addColorStop(1, '#bae6fd');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Sun
  const sunX = GAME_WIDTH - 70;
  const sunY = 90;
  const sunRadius = 32;
  const sunGradient = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius);
  sunGradient.addColorStop(0, '#fef08a');
  sunGradient.addColorStop(1, '#f97316');
  ctx.fillStyle = sunGradient;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.ellipse(cloud.x, cloud.y, cloud.width * 0.55, cloud.height, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x + cloud.width * 0.35, cloud.y - cloud.height * 0.3, cloud.width * 0.45, cloud.height * 0.9, 0, 0, Math.PI * 2);
    ctx.ellipse(cloud.x - cloud.width * 0.35, cloud.y - cloud.height * 0.2, cloud.width * 0.5, cloud.height * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  // Horizon
  ctx.fillStyle = '#dbeafe';
  ctx.fillRect(0, GAME_HEIGHT - 140, GAME_WIDTH, 140);
  ctx.fillStyle = '#93c5fd';
  ctx.fillRect(0, GAME_HEIGHT - 90, GAME_WIDTH, 90);
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
canvas.addEventListener('pointerdown', (event) => {
  initAudio();
  handleInput(event);
});
startButton.addEventListener('click', () => {
  initAudio();
  flap();
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp') {
    initAudio();
    flap();
  }
});

setCanvasSize();
loadHighScore();
resetGame();
gameLoop();
