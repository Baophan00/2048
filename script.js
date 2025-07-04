let board = [];
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;

const bgMusic = document.getElementById("bg-music");
bgMusic.loop = true;
bgMusic.volume = 0.4;

const toast = document.getElementById("toast");
const uploadBtn = document.getElementById("upload-btn");
const leaderboardBox = document.getElementById("leaderboard");
const playBtn = document.getElementById("play-btn");
const musicBtn = document.getElementById("music-btn");

function showToast(message) {
  toast.innerHTML = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

function toggleMusic() {
  if (bgMusic.paused || bgMusic.muted) {
    bgMusic.muted = false;
    bgMusic
      .play()
      .then(() => {
        musicBtn.textContent = "🔇 Music";
      })
      .catch((e) => {
        console.warn("Music autoplay blocked:", e);
        showToast(
          "⚠️ Trình duyệt đang chặn phát nhạc. Vui lòng tương tác thêm."
        );
      });
  } else {
    bgMusic.pause();
    bgMusic.muted = true;
    musicBtn.textContent = "🔊 Music";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateScore();
  musicBtn.addEventListener("click", toggleMusic);

  // Hiện nút Play ban đầu
  playBtn.style.display = "inline-block";
  playBtn.textContent = "▶️ Play Now";

  // Ẩn nút upload vì không dùng blockchain
  uploadBtn.style.display = "none";

  // Gán sự kiện nhấn nút Play Now / Play Again
  playBtn.addEventListener("click", () => {
    setup();
    document.getElementById("game-over").style.display = "none";
    playBtn.style.display = "none";
    playBtn.textContent = "▶️ Play Again";
    document.getElementById("mascot-overlay").style.display = "none";
  });

  // Thiết lập swipe
  const hammertime = new Hammer(document.querySelector(".game-container"));
  hammertime.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
  hammertime.on("swipeleft swiperight swipeup swipedown", (ev) => {
    handleSwipe(ev.type.replace("swipe", ""));
  });

  // Ngăn cuộn ngang khi swipe
  let startX, startY;
  document.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  document.addEventListener(
    "touchmove",
    function (e) {
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) e.preventDefault();
    },
    { passive: false }
  );

  loadTopScores();
});

function handleSwipe(dir) {
  let moved = false;
  if (dir === "left") moved = moveLeft();
  if (dir === "right") moved = moveRight();
  if (dir === "up") moved = moveUp();
  if (dir === "down") moved = moveDown();

  if (moved) {
    generate();
    if (isGameOver()) {
      document.getElementById("game-over").style.display = "block";
      playBtn.textContent = "▶️ Play Again";
      playBtn.style.display = "inline-block";
    }
  }
}

document.addEventListener("keydown", (e) => {
  let moved = false;
  if (e.key === "ArrowLeft") moved = moveLeft();
  else if (e.key === "ArrowRight") moved = moveRight();
  else if (e.key === "ArrowUp") moved = moveUp();
  else if (e.key === "ArrowDown") moved = moveDown();

  if (moved) {
    generate();
    if (isGameOver()) {
      document.getElementById("game-over").style.display = "block";
      playBtn.textContent = "▶️ Play Again";
      playBtn.style.display = "inline-block";
    }
  }
});

function setup() {
  board = Array.from({ length: 4 }, () => Array(4).fill(0));
  score = 0;
  updateScore();
  updateBoard();
  generate();
  generate();
}

function updateScore() {
  document.getElementById("score").textContent = score;
  document.getElementById("high-score").textContent = highScore;
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
}

function updateBoard() {
  const grid = document.getElementById("grid-container");
  grid.innerHTML = "";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.textContent = board[r][c] === 0 ? "" : board[r][c];
      tile.style.background = getTileColor(board[r][c]);
      tile.style.color = board[r][c] >= 128 ? "#000" : "#fff";
      grid.appendChild(tile);
    }
  }
}

function generate() {
  const empty = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push({ r, c });
    }
  }
  if (empty.length === 0) return;
  const { r, c } = empty[Math.floor(Math.random() * empty.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  updateBoard();
}

function slide(row) {
  row = row.filter((val) => val);
  for (let i = 0; i < row.length - 1; i++) {
    if (row[i] === row[i + 1]) {
      row[i] *= 2;
      score += row[i];
      row[i + 1] = 0;
    }
  }
  updateScore();
  return row
    .filter((val) => val)
    .concat(Array(4 - row.filter((val) => val).length).fill(0));
}

function moveLeft() {
  let moved = false;
  for (let r = 0; r < 4; r++) {
    const original = [...board[r]];
    board[r] = slide(board[r]);
    if (board[r].toString() !== original.toString()) moved = true;
  }
  updateBoard();
  return moved;
}

function moveRight() {
  let moved = false;
  for (let r = 0; r < 4; r++) {
    const original = [...board[r]];
    board[r] = slide(board[r].reverse()).reverse();
    if (board[r].toString() !== original.toString()) moved = true;
  }
  updateBoard();
  return moved;
}

function moveUp() {
  let moved = false;
  for (let c = 0; c < 4; c++) {
    let col = board.map((row) => row[c]);
    const original = [...col];
    col = slide(col);
    for (let r = 0; r < 4; r++) board[r][c] = col[r];
    if (col.toString() !== original.toString()) moved = true;
  }
  updateBoard();
  return moved;
}

function moveDown() {
  let moved = false;
  for (let c = 0; c < 4; c++) {
    let col = board.map((row) => row[c]);
    const original = [...col];
    col = slide(col.reverse()).reverse();
    for (let r = 0; r < 4; r++) board[r][c] = col[r];
    if (col.toString() !== original.toString()) moved = true;
  }
  updateBoard();
  return moved;
}

function getTileColor(val) {
  const colors = {
    0: "#1c1b27",
    2: "#004c42",
    4: "#006a5b",
    8: "#008c72",
    16: "#00bfa5",
    32: "#00e6b8",
    64: "#00ffcc",
    128: "#3af2d2",
    256: "#77f5df",
    512: "#a8f8ec",
    1024: "#d2fbf5",
    2048: "#ffffff",
  };
  return colors[val] || "#ffffff";
}

function isGameOver() {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return false;
      if (c < 3 && board[r][c] === board[r][c + 1]) return false;
      if (r < 3 && board[r][c] === board[r + 1][c]) return false;
    }
  }
  return true;
}

function loadTopScores() {
  const top = JSON.parse(localStorage.getItem("topScores") || "[]");
  if (top.length === 0) leaderboardBox.innerHTML = "No scores yet.";
  else
    leaderboardBox.innerHTML = top
      .map((t, i) => `${i + 1}. ${t.addr.slice(0, 6)}... - ${t.score}`)
      .join("<br>");
}

function saveTxHistory(addr, score, txId) {
  const history = JSON.parse(localStorage.getItem("topScores") || "[]");
  history.push({ addr, score, txId });
  history.sort((a, b) => b.score - a.score);
  localStorage.setItem("topScores", JSON.stringify(history.slice(0, 5)));
}
