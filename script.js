// --- Firebase SDK ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDWyx3BaJsqscLFZoMqqZpH7jE8J_g0bOU",
  authDomain: "arcade-7577c.firebaseapp.com",
  projectId: "arcade-7577c",
  storageBucket: "arcade-7577c.firebasestorage.app",
  messagingSenderId: "801894628617",
  appId: "1:801894628617:web:ceb6b7269f9b0b05d6e7d8",
  measurementId: "G-DWTQRT8PWZ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Game Variables ---
let board = [];
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;
let mascotMode = false;

const bgMusic = document.getElementById("bg-music");
bgMusic.loop = true;
bgMusic.volume = 0.4;

const toast = document.getElementById("toast");
const uploadBtn = document.getElementById("upload-btn");
const leaderboardBox = document.getElementById("leaderboard");
const playBtn = document.getElementById("play-btn");
const musicBtn = document.getElementById("music-btn");
const toggleModeBtn = document.getElementById("toggle-mode-btn");

const nameModal = document.getElementById("name-modal");
const nameInput = document.getElementById("player-name-input");
const submitNameBtn = document.getElementById("submit-name-btn");

// --- UI Events ---
document.addEventListener("DOMContentLoaded", () => {
  updateScore();
  loadTopScores();
  musicBtn.addEventListener("click", toggleMusic);
  toggleModeBtn.addEventListener("click", toggleMascotMode);

  playBtn.style.display = "inline-block";
  playBtn.textContent = "▶️ Play Now";
  uploadBtn.style.display = "none";

  playBtn.addEventListener("click", () => {
    setup();
    document.getElementById("game-over").style.display = "none";
    playBtn.style.display = "none";
    uploadBtn.style.display = "none";
    const mascotIntro = document.getElementById("mascot-intro");
    if (mascotIntro) mascotIntro.style.display = "none";

    if (bgMusic.paused) {
      bgMusic.muted = false;
      bgMusic.play().catch(() => showToast("⚠️ Tap to allow music."));
    }

    window.scrollTo(0, 0);
  });

  // Touch swipe handler (chỉ trên khu vực grid)
  const hammertime = new Hammer(document.getElementById("grid-container"));
  hammertime.get("swipe").set({
    direction: Hammer.DIRECTION_ALL,
    velocity: 0.3, // nhẹ tay hơn để swipe
    threshold: 10, // quãng vuốt ngắn hơn vẫn nhận
  });
  hammertime.on("swipeleft swiperight swipeup swipedown", (ev) =>
    handleSwipe(ev.type.replace("swipe", ""))
  );

  // Chỉ chặn khi vuốt ngoài vùng grid-container (ví dụ vuốt trên tên, nền...)
  document.body.addEventListener(
    "touchmove",
    function (e) {
      e.preventDefault();
    },
    { passive: false }
  );

  loadTopScores();
  setTimeout(loadTopScores, 200); // Force reload to fix rendering delay
});

submitNameBtn.addEventListener("click", () => {
  // const playerName = nameInput.value.trim() || "anonymous";
  let playerName = nameInput.value.trim();
  if (playerName.startsWith("@")) {
    playerName = playerName.substring(1); // bỏ dấu @ nếu có
  }

  saveScore(playerName, score, "none");
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  updateScore();
  nameModal.style.display = "none";
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nameModal.style.display === "flex")
    nameModal.style.display = "none";

  let moved = false;
  if (e.key === "ArrowLeft") moved = moveLeft();
  else if (e.key === "ArrowRight") moved = moveRight();
  else if (e.key === "ArrowUp") moved = moveUp();
  else if (e.key === "ArrowDown") moved = moveDown();
  if (moved) generate();
});

nameModal.addEventListener("click", (e) => {
  if (e.target === nameModal) nameModal.style.display = "none";
});

// --- Game Core ---
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
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  document.getElementById("high-score").textContent = highScore;
}

function toggleMusic() {
  if (bgMusic.paused || bgMusic.muted) {
    bgMusic.muted = false;
    bgMusic
      .play()
      .then(() => (musicBtn.textContent = "🔇 Music"))
      .catch(() =>
        showToast("⚠️ Browser blocked music autoplay. Please interact.")
      );
  } else {
    bgMusic.pause();
    bgMusic.muted = true;
    musicBtn.textContent = "🔊 Music";
  }
}

function toggleMascotMode() {
  mascotMode = !mascotMode;
  toggleModeBtn.textContent = mascotMode ? "❌ Hide Icon" : "🪄 Irys Mode";
  updateBoard();
}

function updateBoard() {
  const grid = document.getElementById("grid-container");
  grid.innerHTML = "";
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      const value = board[r][c];

      if (value === 0) {
        tile.textContent = "";
        tile.style.background = getTileColor(0);
      } else if (mascotMode) {
        const img = document.createElement("img");
        img.src = `images/mascot_${value}.png`;
        img.alt = value;
        img.className = "tile-img";
        tile.appendChild(img);
      } else {
        tile.textContent = value;
        tile.style.background = getTileColor(value);
        tile.style.color = value >= 128 ? "#000" : "#fff";
      }

      grid.appendChild(tile);
    }
  }
}

function generate() {
  const emptyCells = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) emptyCells.push({ r, c });
    }
  }
  if (emptyCells.length === 0) return;
  const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  board[r][c] = Math.random() < 0.9 ? 2 : 4;
  updateBoard();

  if (isGameOver()) handleGameOver();
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

function handleGameOver() {
  document.getElementById("game-over").style.display = "block";
  playBtn.textContent = "▶️ Play Again";
  playBtn.style.display = "inline-block";
  nameModal.style.display = "flex";
  nameInput.value = "";
  nameInput.focus();
}

function getTileColor(value) {
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
    4096: "#ffe9e9",
    8192: "#ffcccc",
  };
  return colors[value] || "#ffffff";
}

// --- Leaderboard ---
async function loadTopScores() {
  try {
    const q = query(
      collection(db, "topScores"),
      orderBy("score", "desc"),
      limit(3)
    );
    const snapshot = await getDocs(q);
    const topScores = [];
    snapshot.forEach((doc) => topScores.push(doc.data()));
    const medals = ["🥇", "🥈", "🥉"];
    leaderboardBox.innerHTML = topScores.length
      ? topScores
          .map(
            (entry, i) => `
      <div class="leaderboard-entry">
        <div class="rank">${medals[i] || `${i + 1}.`}</div>
        <div class="name">
        <a href="https://twitter.com/${entry.addr}" target="_blank">@${
              entry.addr
            }</a>
        </div>
        <div class="score">${entry.score}</div>
      </div>`
          )
          .join("")
      : "No scores yet.";
  } catch (e) {
    console.error("Failed to load leaderboard:", e);
    leaderboardBox.innerHTML = "Unable to load leaderboard.";
  }
}

async function saveScore(playerName, score, txId) {
  try {
    await addDoc(collection(db, "topScores"), {
      addr: playerName,
      score,
      txId,
      timestamp: serverTimestamp(),
    });
    showToast("🏆 Your score is saved to leaderboard!");
    loadTopScores();
  } catch (e) {
    console.error("Failed to save score:", e);
    showToast("❌ Failed to save score. Please try again.");
  }
}

function showToast(message) {
  toast.innerHTML = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

function handleSwipe(dir) {
  const moved =
    dir === "left"
      ? moveLeft()
      : dir === "right"
      ? moveRight()
      : dir === "up"
      ? moveUp()
      : dir === "down"
      ? moveDown()
      : false;

  if (moved) generate();
}

// --- Prevent Page Scrolling (on mobile + keyboard) ---
document.addEventListener(
  "touchmove",
  function (e) {
    if (!e.target.closest("#grid-container")) {
      e.preventDefault();
    }
  },
  { passive: false }
);

window.addEventListener("scroll", () => window.scrollTo(0, 0));
window.addEventListener(
  "keydown",
  (e) => {
    const keys = [32, 37, 38, 39, 40];
    if (keys.includes(e.keyCode)) e.preventDefault();
  },
  { passive: false }
);

// === Floating Stickers Around Top Players ===
const stickerImages = [
  "https://irys.xyz/assets/characters/character-1.svg",
  "https://irys.xyz/assets/characters/character-2.svg",
  "https://irys.xyz/assets/characters/character-3.svg",
  "https://irys.xyz/assets/characters/character-4.svg",
  "https://irys.xyz/assets/characters/character-5.svg",
];

function createBouncingSticker() {
  const box = document.querySelector(".leaderboard-box");
  if (!box) return;

  const sticker = document.createElement("img");
  sticker.src = stickerImages[Math.floor(Math.random() * stickerImages.length)];
  sticker.className = "bouncing-sticker";

  const size = 36;
  const boxRect = box.getBoundingClientRect();

  let x = Math.random() * (box.clientWidth - size);
  let y = Math.random() * (box.clientHeight - size);

  let dx = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.5);
  let dy = (Math.random() < 0.5 ? -1 : 1) * (0.3 + Math.random() * 0.5);

  sticker.style.left = `${x}px`;
  sticker.style.top = `${y}px`;

  box.appendChild(sticker);

  function move() {
    x += dx;
    y += dy;

    if (x <= 0 || x + size >= box.clientWidth) dx *= -1;
    if (y <= 0 || y + size >= box.clientHeight) dy *= -1;

    sticker.style.transform = `translate(${x}px, ${y}px)`;
    sticker._anim = requestAnimationFrame(move);
  }

  move();
  // ✅ Thêm hiệu ứng explode khi click
  sticker.addEventListener("click", () => {
    cancelAnimationFrame(sticker._anim); // Dừng di chuyển
    sticker.classList.add("explode-effect"); // Thêm class hiệu ứng
    setTimeout(() => {
      sticker.remove(); // Xoá sau hiệu ứng
    }, 500); // Khớp với animation thời gian explode
  });

  // Sticker tồn tại 10s rồi tự hủy
  // setTimeout(() => {
  //   cancelAnimationFrame(sticker._anim);
  //   sticker.remove();
  // }, 10000);
}

// Tạo sticker mới mỗi 1.5s
setInterval(createBouncingSticker, 1500);
