import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.esm.min.js";

let board = [];
let score = 0;
let highScore = localStorage.getItem("highScore") || 0;
let gameUnlocked = false;

const bgMusic = document.getElementById("bg-music");
bgMusic.loop = true;
bgMusic.volume = 0.4;

const toast = document.getElementById("toast");
const uploadBtn = document.getElementById("upload-btn");
const leaderboardBox = document.getElementById("leaderboard");
const playBtn = document.getElementById("play-btn");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function toggleMusic() {
  if (bgMusic.paused || bgMusic.muted) {
    bgMusic.muted = false;
    bgMusic.play();
    document.getElementById("music-btn").textContent = "🔊 Music";
  } else {
    bgMusic.pause();
    bgMusic.muted = true;
    document.getElementById("music-btn").textContent = "🔇 Music";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  setup();
  updateBoard();
  generate();
  generate();
  updateScore();

  const hammertime = new Hammer(document.querySelector(".game-container"));
  hammertime.get("swipe").set({ direction: Hammer.DIRECTION_ALL });
  hammertime.on("swipeleft swiperight swipeup swipedown", (ev) => {
    if (!gameUnlocked) return preventPlay();
    handleSwipe(ev.type.replace("swipe", ""));
  });

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

  document.getElementById("music-btn").addEventListener("click", toggleMusic);
  playBtn.addEventListener("click", connectAndPayToPlay);
  uploadBtn.addEventListener("click", uploadScoreToIrys);

  loadTopScores();
});

function preventPlay() {
  showToast("🔒 Please unlock the game first");
}

function handleSwipe(dir) {
  let moved = false;
  if (dir === "left") moved = moveLeft();
  if (dir === "right") moved = moveRight();
  if (dir === "up") moved = moveUp();
  if (dir === "down") moved = moveDown();

  if (moved) {
    generate();
    if (score >= 1000) showSubmitButton();
    if (isGameOver()) {
      document.getElementById("game-over").style.display = "block";
      uploadScoreToIrys();
      gameUnlocked = false;
      playBtn.style.display = "inline-block";
    }
  }
}

document.addEventListener("keydown", (e) => {
  if (!gameUnlocked) return preventPlay();
  let moved = false;
  if (e.key === "ArrowLeft") moved = moveLeft();
  else if (e.key === "ArrowRight") moved = moveRight();
  else if (e.key === "ArrowUp") moved = moveUp();
  else if (e.key === "ArrowDown") moved = moveDown();

  if (moved) {
    generate();
    if (score >= 1000) showSubmitButton();
    if (isGameOver()) {
      document.getElementById("game-over").style.display = "block";
      uploadScoreToIrys();
      gameUnlocked = false;
      playBtn.style.display = "inline-block";
    }
  }
});

function showSubmitButton() {
  uploadBtn.style.display = "inline-block";
  uploadBtn.classList.add("pulse");
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
      tile.style.color = board[r][c] > 64 ? "#000" : "#fff";
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
  return row.filter((val) => val).concat(Array(4 - row.filter((val) => val).length).fill(0));
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
    0: "#1c1b27", 2: "#004c42", 4: "#006a5b", 8: "#008c72",
    16: "#00bfa5", 32: "#00e6b8", 64: "#00ffcc", 128: "#3af2d2",
    256: "#77f5df", 512: "#a8f8ec", 1024: "#d2fbf5", 2048: "#ffffff"
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

async function connectAndPayToPlay() {
  if (typeof window.ethereum === "undefined") {
    showToast("⚠️ Open this in MetaMask or Web3 browser.");
    return;
  }

  const chainId = "0x4f6";
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId }] });
  } catch (err) {
    if (err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId,
          chainName: "Irys Testnet",
          rpcUrls: ["https://testnet-rpc.irys.xyz"],
          nativeCurrency: { name: "IRYS", symbol: "IRYS", decimals: 18 },
          blockExplorerUrls: ["https://testnet-explorer.irys.xyz"]
        }]
      });
    }
  }

  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  } catch (err) {
    showToast("❌ Wallet connection rejected.");
    return;
  }

  try {
    const tx = await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{
        from: (await window.ethereum.request({ method: "eth_accounts" }))[0],
        to: "0xf137e228c9b44c6fa6332698e5c6bce429683d6c",
        value: "0x6a94d74f430000"
      }]
    });

    showToast("✅ Payment sent! TX: " + tx.slice(0, 10) + "...");
    gameUnlocked = true;
    playBtn.style.display = "none";
    document.getElementById("game-over").style.display = "none";
    setup();
  } catch (err) {
    console.error("Payment failed:", err);
    showToast("❌ Payment cancelled or failed.");
  }
}

async function uploadScoreToIrys() {
  try {
    const { WebIrys } = await import("https://esm.sh/@irys/sdk?target=es2020&bundle&browser");
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();

    const irys = new WebIrys({
      network: "devnet",
      token: "ethereum",
      wallet: signer
    });

    await irys.ready();

    const data = JSON.stringify({
      player: await irys.address,
      score,
      timestamp: new Date().toISOString()
    });

    const receipt = await irys.upload(data, {
      tags: [
        { name: "App", value: "2048-game" },
        { name: "Type", value: "Score" }
      ]
    });

    showToast("🎉 TX ID: " + receipt.id);
    saveTxHistory(await irys.address, score);
    loadTopScores();
  } catch (err) {
    console.error("Upload failed:", err);
    showToast("❌ Upload failed. See console.");
  }
}

function saveTxHistory(addr, score) {
  const history = JSON.parse(localStorage.getItem("topScores") || "[]");
  history.push({ addr, score });
  history.sort((a, b) => b.score - a.score);
  localStorage.setItem("topScores", JSON.stringify(history.slice(0, 5)));
}

function loadTopScores() {
  const top = JSON.parse(localStorage.getItem("topScores") || "[]");
  if (top.length === 0) leaderboardBox.innerHTML = "No scores yet.";
  else leaderboardBox.innerHTML = top.map((t, i) => `${i + 1}. ${t.addr.slice(0, 6)}... - ${t.score}`).join("<br>");
}
