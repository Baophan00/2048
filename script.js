// --- Firebase SDK imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// --- Firebase config ---
const firebaseConfig = {
  apiKey: "AIzaSyDWyx3BaJsqscLFZoMqqZpH7jE8J_g0bOU",
  authDomain: "arcade-7577c.firebaseapp.com",
  projectId: "arcade-7577c",
  storageBucket: "arcade-7577c.firebasestorage.app",
  messagingSenderId: "801894628617",
  appId: "1:801894628617:web:ceb6b7269f9b0b05d6e7d8",
  measurementId: "G-DWTQRT8PWZ",
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Game variables ---
let board = [];
let score = 0;
let highScore = parseInt(localStorage.getItem("highScore")) || 0;

const bgMusic = document.getElementById("bg-music");
bgMusic.loop = true;
bgMusic.volume = 0.4;

const toast = document.getElementById("toast");
const uploadBtn = document.getElementById("upload-btn");
const leaderboardBox = document.getElementById("leaderboard");
const playBtn = document.getElementById("play-btn");
const musicBtn = document.getElementById("music-btn");

// Modal elements
const nameModal = document.getElementById("name-modal");
const nameInput = document.getElementById("player-name-input");
const submitNameBtn = document.getElementById("submit-name-btn");

// --- Utility functions ---
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
      .then(() => (musicBtn.textContent = "🔇 Music"))
      .catch((e) => {
        console.warn("Music autoplay blocked:", e);
        showToast("⚠️ Browser blocked music autoplay. Please interact.");
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
  playBtn.style.display = "inline-block";
  playBtn.textContent = "▶️ Play Now";
  uploadBtn.style.display = "none";

  playBtn.addEventListener("click", () => {
    setup();
    document.getElementById("game-over").style.display = "none";
    playBtn.style.display = "none";
    playBtn.textContent = "▶️ Play Again";
    document.getElementById("mascot-overlay").style.display = "none";
  });

  const hammertime = new Hammer(document.querySelector(".game-container"));
  hammertime.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
  hammertime.on("swipeleft swiperight swipeup swipedown", (ev) =>
    handleSwipe(ev.type.replace("swipe", ""))
  );

  let startX, startY;
  document.addEventListener("touchstart", function (e) {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  document.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  });

  document.addEventListener(
    "touchmove",
    (e) => {
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) e.preventDefault();
    },
    { passive: false }
  );

  loadTopScores();

  window.addEventListener("resize", () => {
    if (window.innerHeight > 500) {
      window.scrollTo(0, 0);
    }
  });
});

// --- Modal submit logic ---
submitNameBtn.addEventListener("click", () => {
  let playerName = nameInput.value.trim() || "anonymous";
  saveScore(playerName, score, "none");

  if (score > highScore) {
    highScore = score;
    localStorage.setItem("highScore", highScore);
  }
  updateScore();
  nameModal.style.display = "none";
});

// Allow closing modal with Escape or click outside
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && nameModal.style.display === "flex") {
    nameModal.style.display = "none";
  }
});
nameModal.addEventListener("click", (e) => {
  if (e.target === nameModal) {
    nameModal.style.display = "none";
  }
});

function handleSwipe(direction) {
  let moved = false;
  if (direction === "left") moved = moveLeft();
  if (direction === "right") moved = moveRight();
  if (direction === "up") moved = moveUp();
  if (direction === "down") moved = moveDown();

  if (moved) {
    generate();
    if (isGameOver()) handleGameOver();
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
    if (isGameOver()) handleGameOver();
  }
});

function handleGameOver() {
  document.getElementById("game-over").style.display = "block";
  playBtn.textContent = "▶️ Play Again";
  playBtn.style.display = "inline-block";

  // Show modal instead of prompt
  nameModal.style.display = "flex";
  nameInput.value = "";
  nameInput.focus();
}

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
  };
  return colors[value] || "#ffffff";
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

// --- Firestore: Load top 5 scores ---
async function loadTopScores() {
  try {
    const q = query(
      collection(db, "topScores"),
      orderBy("score", "desc"),
      limit(5)
    );
    const querySnapshot = await getDocs(q);
    const topScores = [];
    querySnapshot.forEach((doc) => topScores.push(doc.data()));

    if (topScores.length === 0) {
      leaderboardBox.innerHTML = "No scores yet.";
    } else {
      leaderboardBox.innerHTML = topScores
        .map(
          (entry, i) => `
          <div class="leaderboard-entry">
            <div class="rank">${i + 1}.</div>
            <div class="name">${entry.addr}</div>
            <div class="score">${entry.score}</div>
          </div>
        `
        )
        .join("");
    }
  } catch (e) {
    console.error("Failed to load leaderboard:", e);
    leaderboardBox.innerHTML = "Unable to load leaderboard.";
  }
}

// --- Firestore: Save score ---
async function saveScore(playerName, score, txId) {
  try {
    await addDoc(collection(db, "topScores"), {
      addr: playerName,
      score,
      txId,
      timestamp: Date.now(),
    });
    showToast("🏆 Your score is saved to leaderboard!");
    loadTopScores();
  } catch (e) {
    console.error("Failed to save score:", e);
    showToast("❌ Failed to save score. Please try again.");
  }
}
