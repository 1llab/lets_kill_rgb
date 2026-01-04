// RGB Beam Game (order-only)
// - Blocks appear in a single vertical lane (stacked).
// - Player must press the matching color for the NEXT block (front of queue).
// - Correct: fire beam + remove that block + score++
// - Wrong: game over
// - Over time: spawn gets faster

const stackLane = document.getElementById("stackLane");
const beamLayer = document.getElementById("beamLayer");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const msgEl = document.getElementById("message");

const COLORS = ["red", "green", "blue"];

let blocks = [];          // queue: blocks[0] is the next target
let score = 0;
let spawnMs = 1000;       // gets smaller (faster)
let speedFactor = 1.0;    // display only (rough indicator)
let spawnTimer = null;
let accelTimer = null;
let isGameOver = false;

// ---------- UI helpers ----------
function setMessage(text, show = true) {
  msgEl.textContent = text;
  msgEl.classList.toggle("hidden", !show);
}

function updateHud() {
  scoreEl.textContent = String(score);
  speedEl.textContent = speedFactor.toFixed(2);
}

function fireBeam(color) {
  const beam = document.createElement("div");
  beam.className = `beam ${color}`;
  beamLayer.appendChild(beam);
  setTimeout(() => beam.remove(), 180);
}

function createBlock(color) {
  const el = document.createElement("div");
  el.className = `block ${color}`;
  el.dataset.color = color;
  stackLane.appendChild(el);
  blocks.push(el);
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ---------- game logic ----------
function shoot(color) {
  if (isGameOver) return;
  if (blocks.length === 0) return;

  const target = blocks[0];
  const need = target.dataset.color;

  if (color !== need) {
    fireBeam(color);
    gameOver(`틀림! 다음은 ${need.toUpperCase()}였음\n(R로 재시작)`);
    return;
  }

  // correct
  fireBeam(color);
  target.remove();
  blocks.shift();

  score += 1;
  updateHud();
}

function gameOver(reason) {
  isGameOver = true;
  clearInterval(spawnTimer);
  clearInterval(accelTimer);
  setMessage(reason, true);
}

function restart() {
  // clear
  blocks.forEach(b => b.remove());
  blocks = [];
  score = 0;
  spawnMs = 1000;
  speedFactor = 1.0;
  isGameOver = false;

  setMessage("", false);
  updateHud();

  // start with a few blocks so "순서"가 바로 보임
  for (let i = 0; i < 5; i++) createBlock(randomColor());

  // spawn loop
  spawnTimer = setInterval(() => {
    createBlock(randomColor());

    // 너무 길어지면(화면 넘칠 만큼) -> 게임오버
    // (원하면 이 제한 없애도 됨)
    if (blocks.length > 18) {
      gameOver("블럭이 너무 쌓였다! (R로 재시작)");
    }
  }, spawnMs);

  // acceleration: every 6s, spawn faster
  accelTimer = setInterval(() => {
    spawnMs = Math.max(260, Math.floor(spawnMs * 0.92)); // 8% faster, min 260ms
    speedFactor = (1000 / spawnMs) * 1.0;

    clearInterval(spawnTimer);
    spawnTimer = setInterval(() => {
      createBlock(randomColor());
      if (blocks.length > 18) gameOver("블럭이 너무 쌓였다! (R로 재시작)");
    }, spawnMs);

    updateHud();
  }, 6000);
}

// ---------- input wiring ----------
document.querySelectorAll(".btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const color = btn.dataset.color;
    shoot(color);
  });
});

// keyboard support (optional, but useful)
window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "q") shoot("red");
  if (k === "w") shoot("green");
  if (k === "e") shoot("blue");
  if (k === "r") restart();
});

// boot
restart();
