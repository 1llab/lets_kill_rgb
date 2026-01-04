// RGB Beam Game (order + time limit)
// - Must press matching color for NEXT block (queue front)
// - If time runs out -> GAME OVER
// - R restart with countdown (gives you time to ready)
// - Spawn gets faster over time

const stackLane = document.getElementById("stackLane");
const beamLayer = document.getElementById("beamLayer");
const scoreEl = document.getElementById("score");
const speedEl = document.getElementById("speed");
const msgEl = document.getElementById("message");
const timerBarWrap = document.getElementById("timerBarWrap");
const timerBar = document.getElementById("timerBar");

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

  el.style.top = "-60px"; // 화면 위에서 시작
  el.style.position = "absolute";

  gameArea.appendChild(el);
  blocks.push(el);
}

function moveBlocks() {
  blocks.forEach(block => {
    const y = block.offsetTop + 1.2; // 속도
    block.style.top = y + "px";

    // 바닥까지 오면 게임오버
    if (y > 360) {
      gameOver("블럭이 닿았다!");
    }
  });

  if (!isGameOver) requestAnimationFrame(moveBlocks);
}

function randomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
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

    if (blocks.length === 0) return; // 타겟이 없으면 굳이 깎지 않음

    timeLeftMs -= 50;
    updateTimerBar();

    // 메시지에 남은시간 표시(원하면 UI 따로 빼도 됨)
    const need = blocks[0].dataset.color.toUpperCase();
    setMessage(`NEXT: ${need}  |  TIME: ${(timeLeftMs / 1000).toFixed(2)}s`, true);

    if (timeLeftMs <= 0) {
      gameOver(`시간초과! 다음은 ${need}였음\n(R로 재시작)`);
    }
  }, 50);
}

// ---------- game logic ----------
function shoot(color) {
  if (isGameOver || blocks.length === 0) return;

  // ✅ 가장 아래 블럭이 타겟
  const target = blocks[blocks.length - 1];
  const need = target.dataset.color;

  fireBeam(color);

  if (color !== need) {
    gameOver(`틀림! ${need.toUpperCase()}였음`);
    return;
  }

  // 맞추면 제거
  target.remove();
  blocks.pop(); // ⬅️ 핵심
}

  // correct
  fireBeam(color);
  target.remove();
  blocks.shift();

  score += 1;
  updateHud();

  // 다음 타겟으로 넘어가면 타이머 리셋
  if (blocks.length > 0) resetTargetTimer();
  else setMessage("블럭 생성 중...", true);
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

    createBlock(randomColor());

    // 블럭 너무 쌓이면 게임오버(선택)
    if (blocks.length > 18) {
      gameOver("블럭이 너무 쌓였다! (R로 재시작)");
    }

    // 타겟이 비어있다가 새로 생긴 경우 타이머 세팅
    if (blocks.length === 1) resetTargetTimer();
  }, spawnMs);

  // acceleration
  accelTimer = setInterval(() => {
    if (isGameOver || isPaused) return;

    spawnMs = Math.max(260, Math.floor(spawnMs * 0.92)); // 8% faster
    speedFactor = (1000 / spawnMs) * 1.0;

    // 스폰 타이머 갱신
    clearInterval(spawnTimer);
    spawnTimer = setInterval(() => {
      if (isGameOver || isPaused) return;

      createBlock(randomColor());
      if (blocks.length > 18) gameOver("블럭이 너무 쌓였다! (R로 재시작)");
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

  const cd = setInterval(() => {
    t -= 1;
    if (t > 0) {
      setMessage(`READY... ${t}`, true);
      return;
    }
    clearInterval(cd);

    setMessage("GO!", true);

    // 시작할 블럭 미리 5개 쌓아두기
    for (let i = 0; i < 5; i++) createBlock(randomColor());

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
restartWithCountdown();


