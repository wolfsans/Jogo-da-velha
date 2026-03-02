// ===== Config =====
const aiMark = "X";
const humanMark = "O";

// ===== DOM =====
const boardEl = document.getElementById("board");
const cells = Array.from(document.querySelectorAll(".cell"));
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const aiStartsEl = document.getElementById("aiStarts");
const showHintsEl = document.getElementById("showHints");
const hintEl = document.getElementById("hint");
const hintTextEl = document.getElementById("hintText");

// ===== State =====
// Importante: como no artigo, as casas vazias guardam o próprio índice (0..8),
// e as preenchidas guardam "X" ou "O". :contentReference[oaicite:2]{index=2}
let boardState = [];
let gameOver = false;

// Combinações vencedoras
const winLines = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

// ===== Helpers (baseado no artigo) =====

// Retorna os índices das casas vazias filtrando o array (não "X" e não "O").
// :contentReference[oaicite:3]{index=3}
function getAllEmptyCellsIndexes(currBdSt){
  return currBdSt.filter(v => v !== aiMark && v !== humanMark);
}

function checkIfWinnerFound(currBdSt, currMark){
  return winLines.some(([a,b,c]) =>
    currBdSt[a] === currMark && currBdSt[b] === currMark && currBdSt[c] === currMark
  );
}

function getWinningLine(currBdSt, currMark){
  for (const [a,b,c] of winLines){
    if (currBdSt[a] === currMark && currBdSt[b] === currMark && currBdSt[c] === currMark) return [a,b,c];
  }
  return null;
}

// ===== Minimax (como no artigo) =====
// Terminal: humano venceu => -1; IA venceu => +1; empate => 0.
// Depois testa jogadas recursivamente e escolhe max para IA e min para humano.
// :contentReference[oaicite:4]{index=4}
function minimax(currBdSt, currMark){
  const availCellsIndexes = getAllEmptyCellsIndexes(currBdSt);

  // terminal state
  if (checkIfWinnerFound(currBdSt, humanMark)) return { score: -1 };
  if (checkIfWinnerFound(currBdSt, aiMark)) return { score: 1 };
  if (availCellsIndexes.length === 0) return { score: 0 };

  const allTestPlayInfos = [];

  for (let i = 0; i < availCellsIndexes.length; i++){
    const currentTestPlayInfo = {};
    const cellIndex = availCellsIndexes[i];

    // salva o "conteúdo" original (que é o índice)
    currentTestPlayInfo.index = currBdSt[cellIndex];

    // joga
    currBdSt[cellIndex] = currMark;

    // recursão alternando jogador
    const nextMark = (currMark === aiMark) ? humanMark : aiMark;
    const result = minimax(currBdSt, nextMark);
    currentTestPlayInfo.score = result.score;

    // desfaz jogada
    currBdSt[cellIndex] = currentTestPlayInfo.index;

    allTestPlayInfos.push(currentTestPlayInfo);
  }

  // escolhe melhor jogada
  let bestTestPlay = null;

  if (currMark === aiMark){
    let bestScore = -Infinity;
    for (let i = 0; i < allTestPlayInfos.length; i++){
      if (allTestPlayInfos[i].score > bestScore){
        bestScore = allTestPlayInfos[i].score;
        bestTestPlay = i;
      }
    }
  } else {
    let bestScore = Infinity;
    for (let i = 0; i < allTestPlayInfos.length; i++){
      if (allTestPlayInfos[i].score < bestScore){
        bestScore = allTestPlayInfos[i].score;
        bestTestPlay = i;
      }
    }
  }

  return allTestPlayInfos[bestTestPlay];
}

// ===== UI / Game Flow =====

function newGame(){
  boardState = Array.from({length: 9}, (_, i) => i); // [0,1,2,...,8]
  gameOver = false;
  setStatus("Sua vez!");
  clearCellClasses();
  render();
  updateHint();

  if (aiStartsEl.checked){
    setStatus("IA pensando...");
    lockBoard(true);
    // pequeno delay só pra ficar natural
    setTimeout(() => {
      aiMove();
      lockBoard(false);
    }, 160);
  }
}

function render(){
  for (let i = 0; i < 9; i++){
    const v = boardState[i];
    cells[i].textContent = (v === aiMark || v === humanMark) ? v : "";
    cells[i].disabled = gameOver || (v === aiMark || v === humanMark);
  }
}

function setStatus(msg){
  statusEl.textContent = msg;
}

function lockBoard(lock){
  for (const c of cells) c.disabled = lock || c.disabled;
}

function clearCellClasses(){
  for (const c of cells){
    c.classList.remove("win","lose","draw");
  }
}

function markResult(line, type){
  if (line){
    for (const idx of line) cells[idx].classList.add(type);
  } else {
    for (const c of cells) c.classList.add(type);
  }
}

function endGame(message, type, line){
  gameOver = true;
  setStatus(message);
  markResult(line, type);
  render();
  updateHint();
}

function updateHint(){
  const show = showHintsEl.checked && !gameOver;
  hintEl.hidden = !show;

  if (!show) return;

  // dica: melhor índice para IA no estado atual
  const best = minimax([...boardState], aiMark);
  hintTextEl.textContent = (best && Number.isInteger(best.index))
    ? `IA jogaria na casa ${best.index + 1} (índice ${best.index})`
    : `—`;
}

function humanMove(i){
  if (gameOver) return;
  if (boardState[i] === aiMark || boardState[i] === humanMark) return;

  boardState[i] = humanMark;
  render();

  // checa fim
  const humanLine = getWinningLine(boardState, humanMark);
  if (humanLine) return endGame("Você venceu?! (isso não era pra acontecer 😅)", "win", humanLine);

  if (getAllEmptyCellsIndexes(boardState).length === 0)
    return endGame("Empate!", "draw", null);

  // IA joga
  setStatus("IA pensando...");
  lockBoard(true);
  setTimeout(() => {
    aiMove();
    lockBoard(false);
  }, 120);
}

function aiMove(){
  if (gameOver) return;

  const bestPlayInfo = minimax([...boardState], aiMark);
  if (!bestPlayInfo || !Number.isInteger(bestPlayInfo.index)) {
    // segurança
    return endGame("Empate!", "draw", null);
  }

  boardState[bestPlayInfo.index] = aiMark;
  render();

  const aiLine = getWinningLine(boardState, aiMark);
  if (aiLine) return endGame("IA venceu!", "lose", aiLine);

  if (getAllEmptyCellsIndexes(boardState).length === 0)
    return endGame("Empate!", "draw", null);

  setStatus("Sua vez!");
  updateHint();
}

// ===== Events =====
boardEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".cell");
  if (!btn) return;
  const i = Number(btn.dataset.i);
  humanMove(i);
});

resetBtn.addEventListener("click", newGame);
aiStartsEl.addEventListener("change", newGame);
showHintsEl.addEventListener("change", updateHint);

// Start
newGame();
