// RGB Beam Game (order + time limit)
// - Must press matching color for NEXT block (queue front)
// - If time runs out -> GAME OVER
// - R restart with countdown (gives you time to ready)
// - Spawn gets faster over time

const beamLayer = document.getElementById("beamLayer");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const msgEl = document.getElementById("message");
const timerBarWrap = document.getElementById("timerBarWrap");
const timerBar = document.getElementById("timerBar");
const gameArea = document.getElementById("gameArea");
const blockLayer = document.getElementById("blockLayer");

const COLORS = ["red", "green", "blue"];

let blocks = [];                 // queue: blocks[0] is next target
let score = 0;

let spawnMs = 1000;              // gets smaller
let speedFactor = 1.0;

let spawnTimer = null;
let accelTimer = null;
let tickTimer = null;

let isGameOver = false;
let isPaused = false;            // during countdown
let timeLeftMs = 0;              // remaining time for current target
let timeLimitMs = 1400;          // base time limit; will shrink as game speeds up

let countdownTimer = null;

let fallSpeed = 1.2;

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

const BLOCK_SIZE = 56; // CSS --blockSize랑 맞춰
const GAP = 10;

function createBlock(color, initialY = -60) {
  const el = document.createElement("div");
  el.className = `block ${color}`;
  el.dataset.color = color;

  el.style.position = "absolute";
  el.style.top = initialY + "px";
  el.style.left = "50%";
  el.style.transform = "translateX(-50%)";

  // gameArea 말고 blockLayer에 붙이기
  blockLayer.appendChild(el);
  blocks.push(el);
}


function moveBlocks() {
  const bottomLimit = gameArea.clientHeight - BLOCK_SIZE;

  if (!isGameOver && !isPaused) {
    blocks.forEach(block => {
      if (!block.isConnected) return; // ✅ 이미 제거된 DOM이면 무시

      const y = block.offsetTop + fallSpeed;
      block.style.top = y + "px";

      if (y >= bottomLimit) {
        gameOver("블럭이 바닥에 닿았다!");
      }
    });
  }

  requestAnimationFrame(moveBlocks);
}



function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

function getBottomMostBlock() {
  if (blocks.length === 0) return null;

  let best = blocks[0];
  let bestY = best.offsetTop;

  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i];
    const y = b.offsetTop;
    if (y > bestY) {
      bestY = y;
      best = b;
    }
  }
  return best;
}

function getBottomMostColorUpper() {
  const b = getBottomMostBlock();
  return b ? b.dataset.color.toUpperCase() : null;
}


function updateTimerBar() {
  if (!timerBar) return;

  // 타겟이 없거나 일시정지면 풀로 보이게
  if (isPaused || blocks.length === 0) {
    timerBar.style.width = "100%";
    return;
  }

  const ratio = Math.max(0, Math.min(1, timeLeftMs / timeLimitMs));
  timerBar.style.width = `${(ratio * 100).toFixed(2)}%`;
}


// ---------- time limit logic ----------
function recalcTimeLimit() {
  // spawnMs가 줄어들수록 timeLimit도 줄어듦(너무 빡세지 않게 하한 설정)
  // 원하는 난이도에 맞게 숫자만 조정하면 됨.
  // 예: base 1400ms, min 420ms
  const minLimit = 420;
  const scaled = Math.floor(spawnMs * 1.25); // spawn 속도 대비 약간 여유
  timeLimitMs = Math.max(minLimit, Math.min(1400, scaled));
}

function resetTargetTimer() {
  recalcTimeLimit();
  timeLeftMs = timeLimitMs;
  updateTimerBar();
}

function startTickLoop() {
  clearInterval(tickTimer);
  tickTimer = setInterval(() => {
    if (isGameOver || isPaused) return;
    if (blocks.length === 0) return;

    timeLeftMs -= 50;
    updateTimerBar();

    const needUpper = getBottomMostColorUpper();
    if (!needUpper) return;

    setMessage(`NEXT: ${needUpper}  |  TIME: ${(timeLeftMs / 1000).toFixed(2)}s`, true);

    if (timeLeftMs <= 0) {
      gameOver(`시간초과! 다음은 ${needUpper}였음\n(R로 재시작)`);
    }
  }, 50);
}



// ---------- game logic ----------
function shoot(color) {
  if (isGameOver || isPaused) return;
  if (blocks.length === 0) return;

  const target = getBottomMostBlock();
  if (!target) return;

  const need = target.dataset.color;

  fireBeam(color);

  if (color !== need) {
    gameOver(`틀림! ${need.toUpperCase()}였음`);
    return;
  }

  // 타겟 제거(요소 기준)
  target.remove();
  blocks = blocks.filter(b => b !== target);

  score += 1;
  updateHud();

  if (blocks.length > 0) resetTargetTimer();
}



function stopAllTimers() {
  clearInterval(spawnTimer);
  clearInterval(accelTimer);
  clearInterval(tickTimer);
  spawnTimer = null;
  accelTimer = null;
  tickTimer = null;
}

function gameOver(reason) {
  isGameOver = true;
  stopAllTimers();
  updateTimerBar();
  setMessage(reason, true);
}

function startLoops() {
  // 초기 타겟 타이머 세팅
  if (blocks.length > 0) resetTargetTimer();

  // spawn loop
  spawnTimer = setInterval(() => {
    if (isGameOver || isPaused) return;

    const spawnY = Math.floor(gameArea.clientHeight * 0.1);
    createBlock(randomColor(), spawnY);


    // 타겟이 비어있다가 새로 생긴 경우 타이머 세팅
    if (blocks.length === 1) resetTargetTimer();
  }, spawnMs);

  // acceleration
  accelTimer = setInterval(() => {
    if (isGameOver || isPaused) return;

    spawnMs = Math.max(260, Math.floor(spawnMs * 0.92)); // 8% faster
    speedFactor = (1000 / spawnMs) * 1.0;
    fallSpeed = Math.min(4.5, fallSpeed * 1.08);

    // 스폰 타이머 갱신
    clearInterval(spawnTimer);
    spawnTimer = setInterval(() => {
      if (isGameOver || isPaused) return;

      const spawnY = Math.floor(gameArea.clientHeight * 0.1);
      createBlock(randomColor(), spawnY);

      if (blocks.length === 1) resetTargetTimer();
    }, spawnMs);

    // 속도 바뀌면 제한시간도 다시 반영
    recalcTimeLimit();

    updateHud();
  }, 6000);

  startTickLoop();
}

function clearBlocks() {
  blocks.forEach(b => b.remove());
  blocks = [];
}

function restartWithCountdown() {
  stopAllTimers();

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
  
  clearBlocks();

  score = 0;
  spawnMs = 1000;
  speedFactor = 1.0;
  isGameOver = false;

  updateHud();

  // 준비시간
  isPaused = true;

  let t = 3;
  setMessage(`READY... ${t}`, true);

  countdownTimer = setInterval(() => {
    t -= 1;
    if (t > 0) {
      setMessage(`READY... ${t}`, true);
      return;
    }
    clearInterval(countdownTimer);
    countdownTimer = null;

    setMessage("GO!", true);

    const BASE_Y = Math.floor(gameArea.clientHeight * 0.1);
    const BLOCK_SIZE = 56;
    const GAP = 10;

    for (let i = 0; i < 5; i++) {
      createBlock(
        randomColor(),
        BASE_Y - i * (BLOCK_SIZE + GAP)
      );
    }


    isPaused = false;
    resetTargetTimer();
    startLoops();

    // GO 문구는 조금 뒤에 타이머 메시지로 대체됨
  }, 1000);
}

// ---------- input wiring ----------
document.querySelectorAll(".btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const color = btn.dataset.color;
    shoot(color);
  });
});

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "q") shoot("red");
  if (k === "w") shoot("green");
  if (k === "e") shoot("blue");
  if (k === "r") restartWithCountdown();
});

// boot
moveBlocks();
restartWithCountdown();











