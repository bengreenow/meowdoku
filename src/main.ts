import "./style.css";
import { catSvg, crossSvg, fishSvg, pawSvg, peekingCatSvg, peekingPawsSvg } from "./art";
import type { GeneratedPuzzle } from "./generator";
import { sizeForLevel } from "./levels";
import { getDaily, getLevel } from "./puzzles";
import { setSoundEnabled, sfx } from "./sound";
import { dailyStreak, loadProgress, saveProgress, todayKey, type Mark } from "./storage";

const EMPTY: Mark = 0;
const CROSS: Mark = 1;
const CAT: Mark = 2;
const MAX_LIVES = 3;

const icons = {
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 010 12h-3"/></svg>`,
  hint: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7V16h8v-1.3A7 7 0 0012 2z"/></svg>`,
  auto: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4l6 6M10 4l-6 6M14 14l6 6M20 14l-6 6M14 4h6v6M4 14v6h6"/></svg>`,
  soundOn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>`,
  soundOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" fill="currentColor"/><path d="M17 9l5 6M22 9l-5 6"/></svg>`,
  restart: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/></svg>`,
};

type Mode = { kind: "level"; level: number } | { kind: "daily"; date: string };

interface Game {
  mode: Mode;
  key: string;
  puzzle: GeneratedPuzzle;
  marks: Mark[][];
  history: Mark[][][];
  lives: number;
  elapsed: number;
  startedAt: number | null;
  finished: "won" | "lost" | null;
}

const app = document.querySelector<HTMLElement>("#app")!;
const progress = loadProgress();
setSoundEnabled(progress.sound);
let game: Game | null = null;
let timerHandle = 0;

const modeKey = (mode: Mode) => (mode.kind === "level" ? `level-${mode.level}` : `daily-${mode.date}`);
const cloneMarks = (marks: Mark[][]) => marks.map((row) => row.slice());
const shapeOf = (puzzle: GeneratedPuzzle) => puzzle.regions.map((row) => row.join(".")).join("|");

const WORDMARK_COLOURS = ["--r1", "--r2", "--r3", "--r4", "--r5", "--r6", "--r9", "--r7"];

function wordmark(): string {
  return [..."Meowdoku"]
    .map((ch, i) => `<span style="--c:var(${WORDMARK_COLOURS[i]});--t:${[-6, 4, -3, 5, -4, 3, -5, 6][i]}deg;--y:${[0, -4, 2, -2, 3, -3, 1, -1][i]}px">${ch}</span>`)
    .join("");
}

function soundButton(): string {
  return `<button class="round-btn small" data-action="sound" aria-label="${progress.sound ? "Mute sound" : "Turn sound on"}"><span class="disc">${progress.sound ? icons.soundOn : icons.soundOff}</span></button>`;
}

function bindSound() {
  app.querySelector('[data-action="sound"]')?.addEventListener("click", (e) => {
    progress.sound = !progress.sound;
    setSoundEnabled(progress.sound);
    saveProgress(progress);
    const btn = e.currentTarget as HTMLElement;
    btn.outerHTML = soundButton();
    bindSound();
    sfx.cat();
  });
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function elapsedNow(g: Game): number {
  return g.elapsed + (g.startedAt !== null ? performance.now() - g.startedAt : 0);
}

function persist() {
  if (game && !game.finished) {
    progress.saved = { key: game.key, shape: shapeOf(game.puzzle), marks: game.marks, lives: game.lives, elapsed: elapsedNow(game) };
  } else if (game?.finished) {
    progress.saved = null;
  }
  saveProgress(progress);
}

// Home

function renderHome() {
  stopTimer();
  game = null;
  const today = todayKey();
  const streak = dailyStreak(progress.dailyDone);
  const dailyDone = progress.dailyDone[today] !== undefined;
  const size = sizeForLevel(progress.unlocked);
  app.innerHTML = `
    <div class="home-corner">${soundButton()}</div>
    <section class="home">
      <div>
        <div class="logo">
          ${peekingCatSvg()}
          <h1 class="wordmark" aria-label="Meowdoku">${wordmark()}</h1>
          ${peekingPawsSvg()}
        </div>
        <p class="tagline">Every cat needs its own space.</p>
      </div>
      <div class="menu">
        <button class="btn primary" data-action="continue">
          <span>Play level ${progress.unlocked}</span>
          <span class="badge">${size}×${size}</span>
        </button>
        <button class="btn" data-action="daily">
          <span>Daily puzzle</span>
          <span class="badge">${dailyDone ? "Solved" : streak ? `${streak} day streak` : "New today"}</span>
        </button>
      </div>
      <label class="jump">Replay level
        <input type="number" min="1" max="${progress.unlocked}" value="${progress.unlocked}" inputmode="numeric" />
        <button class="btn" data-action="jump">Go</button>
      </label>
      <details class="how">
        <summary>How to play</summary>
        <ul>
          <li>Put one cat in every row, every column and every colour.</li>
          <li>Cats hate touching, even corner to corner.</li>
          <li>Tap once to cross a cell out, twice to place a cat. Drag to cross out a run of cells.</li>
          <li>A wrong cat costs a fish. Lose all three and the level starts again.</li>
        </ul>
      </details>
    </section>`;
  bindSound();

  app.querySelector('[data-action="continue"]')!.addEventListener("click", () => startGame({ kind: "level", level: progress.unlocked }));
  app.querySelector('[data-action="daily"]')!.addEventListener("click", () => startGame({ kind: "daily", date: today }));
  const input = app.querySelector<HTMLInputElement>(".jump input")!;
  const jump = () => {
    const level = Math.min(progress.unlocked, Math.max(1, Math.floor(Number(input.value) || 1)));
    startGame({ kind: "level", level });
  };
  app.querySelector('[data-action="jump"]')!.addEventListener("click", (e) => {
    e.preventDefault();
    jump();
  });
  input.addEventListener("keydown", (e) => e.key === "Enter" && jump());

  getLevel(progress.unlocked);
}

// Game

async function startGame(mode: Mode, fresh = false) {
  stopTimer();
  app.innerHTML = `<div class="loading">${catSvg(Math.floor(Math.random() * 11))}</div>`;
  const key = modeKey(mode);
  const puzzle = mode.kind === "level" ? await getLevel(mode.level) : await getDaily(mode.date);
  const saved = !fresh && progress.saved?.key === key && progress.saved.shape === shapeOf(puzzle) ? progress.saved : null;
  const n = puzzle.size;
  game = {
    mode,
    key,
    puzzle,
    marks: saved ? cloneMarks(saved.marks) : Array.from({ length: n }, () => new Array<Mark>(n).fill(EMPTY)),
    history: [],
    lives: saved ? saved.lives : MAX_LIVES,
    elapsed: saved ? saved.elapsed : 0,
    startedAt: null,
    finished: null,
  };
  renderGame();
  startTimer();
  if (mode.kind === "level") getLevel(mode.level + 1);
}

function renderGame() {
  const g = game!;
  const n = g.puzzle.size;
  const title = g.mode.kind === "level" ? `Level ${g.mode.level}` : "Daily puzzle";
  app.innerHTML = `
    <header class="topbar">
      <button class="round-btn small" data-action="home" aria-label="Back to menu"><span class="disc">${icons.back}</span></button>
      <div class="title">
        <h2>${title}</h2>
        <div class="meta"><span class="pill">${n}×${n}</span><span class="pill time">${formatTime(elapsedNow(g))}</span></div>
      </div>
      ${soundButton()}
    </header>
    <div class="lives" aria-label="Lives"></div>
    <div class="board-wrap">
      <div class="sheet">
        <div class="board" role="grid" aria-label="${n} by ${n} puzzle" style="--n:${n}"></div>
      </div>
    </div>
    <nav class="toolbar">
      <button class="round-btn" data-action="undo"><span class="disc">${icons.undo}</span>Undo</button>
      <button class="round-btn" data-action="hint"><span class="disc">${icons.hint}</span>Hint</button>
      <button class="round-btn ${progress.autoMark ? "on" : ""}" data-action="auto" aria-pressed="${progress.autoMark}"><span class="disc">${icons.auto}</span>Auto ✕</button>
      <button class="round-btn" data-action="restart"><span class="disc">${icons.restart}</span>Restart</button>
    </nav>`;
  bindSound();

  const board = app.querySelector<HTMLElement>(".board")!;
  const { regions } = g.puzzle;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const cell = document.createElement("button");
      cell.className = "cell";
      cell.dataset.r = String(r);
      cell.dataset.c = String(c);
      cell.setAttribute("role", "gridcell");
      cell.tabIndex = r === 0 && c === 0 ? 0 : -1;
      cell.style.setProperty("--fill", `var(--r${regions[r][c] + 1})`);
      cell.style.setProperty("--tilt", `${((r * 7 + c * 13) % 9) - 4}deg`);
      cell.style.setProperty("--blink", `${-((r * 3 + c * 5) % 11) * 0.45}s`);
      if (r > 0 && regions[r - 1][c] !== regions[r][c]) cell.classList.add("bt");
      if (r < n - 1 && regions[r + 1][c] !== regions[r][c]) cell.classList.add("bb");
      if (c > 0 && regions[r][c - 1] !== regions[r][c]) cell.classList.add("bl");
      if (c < n - 1 && regions[r][c + 1] !== regions[r][c]) cell.classList.add("br");
      board.appendChild(cell);
    }
  }

  bindBoard(board);
  app.querySelector('[data-action="home"]')!.addEventListener("click", () => {
    persist();
    renderHome();
  });
  app.querySelector('[data-action="undo"]')!.addEventListener("click", undo);
  app.querySelector('[data-action="hint"]')!.addEventListener("click", hint);
  app.querySelector('[data-action="auto"]')!.addEventListener("click", (e) => {
    progress.autoMark = !progress.autoMark;
    const btn = e.currentTarget as HTMLElement;
    btn.classList.toggle("on", progress.autoMark);
    btn.setAttribute("aria-pressed", String(progress.autoMark));
    saveProgress(progress);
  });
  app.querySelector('[data-action="restart"]')!.addEventListener("click", () => startGame(g.mode, true));

  refresh();
}

function cellEl(r: number, c: number): HTMLElement {
  return app.querySelector<HTMLElement>(`.cell[data-r="${r}"][data-c="${c}"]`)!;
}

function refresh() {
  const g = game!;
  const n = g.puzzle.size;
  let catIndex = 0;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const el = cellEl(r, c);
      const mark = g.marks[r][c];
      const want = mark === CAT ? "cat" : mark === CROSS ? "cross" : "";
      if (el.dataset.mark !== want) {
        el.dataset.mark = want;
        el.innerHTML = mark === CAT ? catSvg(g.puzzle.regions[r][c]) : mark === CROSS ? crossSvg : "";
      }
      if (mark === CAT) el.style.setProperty("--i", String(catIndex++));
      el.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}, ${mark === CAT ? "cat" : mark === CROSS ? "crossed out" : "empty"}`);
    }
  }
  const lives = app.querySelector(".lives")!;
  lives.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) => fishSvg.replace('class="fish"', `class="fish${i < g.lives ? "" : " gone"}"`)).join("");
  lives.setAttribute("aria-label", `${g.lives} of ${MAX_LIVES} lives left`);
  app.querySelector<HTMLButtonElement>('[data-action="undo"]')!.disabled = g.history.length === 0 || !!g.finished;
  app.querySelector<HTMLButtonElement>('[data-action="hint"]')!.disabled = !!g.finished;
}

function bindBoard(board: HTMLElement) {
  let drag: { r: number; c: number; moved: boolean; paint: Mark | null; snapshot: Mark[][] } | null = null;

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>(".cell");
    return el && board.contains(el) ? { r: Number(el.dataset.r), c: Number(el.dataset.c) } : null;
  };

  board.addEventListener("pointerdown", (e) => {
    if (!game || game.finished) return;
    const hit = cellAt(e.clientX, e.clientY);
    if (!hit) return;
    e.preventDefault();
    board.setPointerCapture(e.pointerId);
    drag = { ...hit, moved: false, paint: null, snapshot: cloneMarks(game.marks) };
  });

  board.addEventListener("pointermove", (e) => {
    if (!drag || !game) return;
    const hit = cellAt(e.clientX, e.clientY);
    if (!hit || (hit.r === drag.r && hit.c === drag.c && !drag.moved)) return;
    if (!drag.moved) {
      drag.moved = true;
      // Dragging from a crossed cell rubs crosses out; from anywhere else it paints them.
      drag.paint = game.marks[drag.r][drag.c] === CROSS ? EMPTY : CROSS;
      paintCell(drag.r, drag.c, drag.paint);
    }
    paintCell(hit.r, hit.c, drag.paint!);
  });

  const end = () => {
    if (!drag || !game) return;
    if (drag.moved) {
      pushHistory(drag.snapshot);
      persist();
    } else {
      cycle(drag.r, drag.c);
    }
    drag = null;
  };
  board.addEventListener("pointerup", end);
  board.addEventListener("pointercancel", () => (drag = null));

  board.addEventListener("click", (e) => {
    // Keyboard activation arrives as a click with no pointer position.
    if ((e as MouseEvent).detail !== 0) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>(".cell");
    if (el) cycle(Number(el.dataset.r), Number(el.dataset.c));
  });

  board.addEventListener("keydown", (e) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(".cell");
    if (!el || !game) return;
    const n = game.puzzle.size;
    let r = Number(el.dataset.r);
    let c = Number(el.dataset.c);
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
    const move = moves[e.key];
    if (move) {
      e.preventDefault();
      r = Math.min(n - 1, Math.max(0, r + move[0]));
      c = Math.min(n - 1, Math.max(0, c + move[1]));
      el.tabIndex = -1;
      const next = cellEl(r, c);
      next.tabIndex = 0;
      next.focus();
    } else if (e.key.toLowerCase() === "x") {
      e.preventDefault();
      setMark(r, c, game.marks[r][c] === CROSS ? EMPTY : CROSS);
    } else if (e.key.toLowerCase() === "c") {
      e.preventDefault();
      setMark(r, c, game.marks[r][c] === CAT ? EMPTY : CAT);
    }
  });
}

function paintCell(r: number, c: number, mark: Mark) {
  const g = game!;
  if (g.marks[r][c] === CAT || g.marks[r][c] === mark) return;
  g.marks[r][c] = mark;
  (mark === CROSS ? sfx.cross : sfx.clear)();
  refresh();
}

function pushHistory(snapshot: Mark[][]) {
  game!.history.push(snapshot);
  if (game!.history.length > 200) game!.history.shift();
}

function cycle(r: number, c: number) {
  const current = game!.marks[r][c];
  setMark(r, c, current === EMPTY ? CROSS : current === CROSS ? CAT : EMPTY);
}

function setMark(r: number, c: number, mark: Mark) {
  const g = game!;
  if (g.finished) return;
  const snapshot = cloneMarks(g.marks);

  if (mark === CAT && g.puzzle.solution[r] !== c) {
    g.marks[r][c] = CROSS;
    g.lives--;
    pushHistory(snapshot);
    refresh();
    const el = cellEl(r, c);
    el.classList.remove("wrong");
    void el.offsetWidth;
    el.classList.add("wrong");
    hiss(el);
    sfx.wrong();
    navigator.vibrate?.(80);
    if (g.lives <= 0) lose();
    persist();
    return;
  }

  g.marks[r][c] = mark;
  if (mark === CAT && progress.autoMark) crossBlocked(r, c);
  pushHistory(snapshot);
  refresh();
  if (isSolved()) win();
  else (mark === CAT ? sfx.cat : mark === CROSS ? sfx.cross : sfx.clear)();
  persist();
}

function hiss(cell: HTMLElement) {
  const wrap = app.querySelector<HTMLElement>(".board-wrap")!;
  const a = cell.getBoundingClientRect();
  const b = wrap.getBoundingClientRect();
  const bubble = document.createElement("span");
  bubble.className = "hiss";
  bubble.textContent = ["Hiss!", "Nope!", "Mrrr!", "Pfft!"][Math.floor(Math.random() * 4)];
  bubble.style.left = `${a.left - b.left + a.width / 2}px`;
  bubble.style.top = `${a.top - b.top + 4}px`;
  wrap.appendChild(bubble);
  setTimeout(() => bubble.remove(), 1000);
}

function crossBlocked(r: number, c: number) {
  const g = game!;
  const n = g.puzzle.size;
  const { regions } = g.puzzle;
  for (let rr = 0; rr < n; rr++) {
    for (let cc = 0; cc < n; cc++) {
      if (g.marks[rr][cc] !== EMPTY) continue;
      const near = Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1;
      if (rr === r || cc === c || near || regions[rr][cc] === regions[r][c]) g.marks[rr][cc] = CROSS;
    }
  }
}

function isSolved(): boolean {
  const g = game!;
  return g.puzzle.solution.every((c, r) => g.marks[r][c] === CAT);
}

function undo() {
  const g = game!;
  const prev = g.history.pop();
  if (!prev || g.finished) return;
  g.marks = prev;
  refresh();
  persist();
}

function hint() {
  const g = game!;
  if (g.finished) return;
  const n = g.puzzle.size;
  const { solution, regions } = g.puzzle;

  // Reveal the missing cat whose region has the fewest open cells, the one a player is most likely stuck on.
  const missing = solution
    .map((c, r) => ({ r, c }))
    .filter(({ r, c }) => g.marks[r][c] !== CAT)
    .map((cell) => {
      let open = 0;
      for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) {
        if (regions[rr][cc] === regions[cell.r][cell.c] && g.marks[rr][cc] === EMPTY) open++;
      }
      return { ...cell, open };
    })
    .sort((a, b) => a.open - b.open);
  const target = missing[0];
  if (!target) return;
  g.elapsed += 15000;
  setMark(target.r, target.c, CAT);
  const el = cellEl(target.r, target.c);
  el.classList.add("hint");
  setTimeout(() => el.classList.remove("hint"), 2000);
}

function win() {
  const g = game!;
  stopTimer();
  g.finished = "won";
  const time = g.elapsed;
  let best: number | undefined;
  if (g.mode.kind === "level") {
    const key = String(g.mode.level);
    best = progress.bestTimes[key];
    if (best === undefined || time < best) progress.bestTimes[key] = time;
    if (g.mode.level >= progress.unlocked) progress.unlocked = g.mode.level + 1;
  } else {
    progress.dailyDone[g.mode.date] = Math.min(time, progress.dailyDone[g.mode.date] ?? Infinity);
  }
  persist();
  refresh();
  app.querySelector(".board")!.classList.add("won");
  sfx.win();
  rainPaws();

  const isLevel = g.mode.kind === "level";
  const next = isLevel ? (g.mode as { level: number }).level + 1 : 0;
  setTimeout(() => {
    showDialog("won", `
      ${catSvg(Math.floor(Math.random() * 11))}
      <h3>Purrfect!</h3>
      <p>${isLevel ? `Level ${next - 1} solved.` : `Daily streak: ${dailyStreak(progress.dailyDone)} day${dailyStreak(progress.dailyDone) === 1 ? "" : "s"}.`}</p>
      <div class="stats">
        <div><strong>${formatTime(time)}</strong><span>time</span></div>
        <div><strong>${MAX_LIVES - g.lives}</strong><span>mistakes</span></div>
        ${best !== undefined ? `<div><strong>${formatTime(Math.min(best, time))}</strong><span>best</span></div>` : ""}
      </div>
      <div class="actions">
        ${isLevel ? `<button class="btn primary" data-go="next">Level ${next}</button>` : `<button class="btn primary" data-go="levels">Play level ${progress.unlocked}</button>`}
        <button class="btn" data-go="home">Menu</button>
      </div>`, (go) => {
      if (go === "next") startGame({ kind: "level", level: next });
      else if (go === "levels") startGame({ kind: "level", level: progress.unlocked });
      else renderHome();
    });
  }, 900);
}

function lose() {
  const g = game!;
  stopTimer();
  g.finished = "lost";
  persist();
  refresh();
  sfx.lose();
  showDialog("lost", `
    ${catSvg(1)}
    <h3>Out of fish</h3>
    <p>The cats are hungry. Have another go.</p>
    <div class="actions">
      <button class="btn primary" data-go="retry">Try again</button>
      <button class="btn" data-go="home">Menu</button>
    </div>`, (go) => (go === "retry" ? startGame(g.mode, true) : renderHome()));
}

function showDialog(kind: "won" | "lost", html: string, onChoose: (go: string) => void) {
  const overlay = document.createElement("div");
  overlay.className = "overlay";
  overlay.innerHTML = `<div class="dialog ${kind}" role="dialog" aria-modal="true">${html}</div>`;
  document.body.appendChild(overlay);
  overlay.querySelector<HTMLElement>("[data-go]")?.focus();
  overlay.addEventListener("click", (e) => {
    const go = (e.target as HTMLElement).closest<HTMLElement>("[data-go]")?.dataset.go;
    if (!go) return;
    overlay.remove();
    document.querySelector(".paws")?.remove();
    onChoose(go);
  });
}

function rainPaws() {
  const layer = document.createElement("div");
  layer.className = "paws";
  const colors = ["var(--sun)", "var(--fish)", "var(--bubblegum)", "var(--r3)", "var(--r5)", "#fff"];
  for (let i = 0; i < 36; i++) {
    const span = document.createElement("span");
    span.innerHTML = pawSvg;
    const paw = span.firstElementChild as SVGElement;
    paw.style.left = `${Math.random() * 100}%`;
    paw.style.color = colors[i % colors.length];
    paw.style.animationDuration = `${2 + Math.random() * 2.5}s`;
    paw.style.animationDelay = `${Math.random() * 0.8}s`;
    paw.style.setProperty("--spin", `${Math.random() * 720 - 360}deg`);
    layer.appendChild(paw);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 6000);
}

function startTimer() {
  const g = game;
  if (!g || g.finished || document.hidden) return;
  if (g.startedAt === null) g.startedAt = performance.now();
  clearInterval(timerHandle);
  timerHandle = window.setInterval(() => {
    const el = app.querySelector(".time");
    if (el && game) el.textContent = formatTime(elapsedNow(game));
  }, 250);
}

function stopTimer() {
  clearInterval(timerHandle);
  if (game && game.startedAt !== null) {
    game.elapsed += performance.now() - game.startedAt;
    game.startedAt = null;
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopTimer();
    persist();
  } else {
    startTimer();
  }
});
window.addEventListener("pagehide", persist);

renderHome();
