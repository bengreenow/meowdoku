import { hashSeed, mulberry32, randInt, shuffle, type Rng } from "./rng";
import { findSolution, solveLogically, Technique, type Puzzle } from "./solver";

export interface GeneratedPuzzle extends Puzzle {
  difficulty: Technique;
}

export interface GenerateOptions {
  size: number;
  seed: string;
  /** Hardest deduction a player may need. Early levels stay gentle. */
  maxTechnique?: Technique;
  /** How often singles must stall, so later levels need more than spotting forced cells. */
  minHardSteps?: number;
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Uniqueness repairs tend to feed one region until it swamps the board, so cap it. */
const maxRegionSize = (size: number) => Math.ceil(size * 2.2);

function regionSize(regions: number[][], reg: number): number {
  let count = 0;
  for (const row of regions) for (const v of row) if (v === reg) count++;
  return count;
}

/**
 * Builds a puzzle with exactly one solution that can be reached by deduction alone.
 * The same seed always yields the same puzzle, which is what makes level N
 * identical for every player without storing any levels.
 */
export function generatePuzzle({ size, seed, maxTechnique = Technique.Lookahead, minHardSteps = 0 }: GenerateOptions): GeneratedPuzzle {
  const rng = mulberry32(hashSeed(`${seed}:${size}`));
  let best: (GeneratedPuzzle & { hardSteps: number }) | null = null;
  for (let attempt = 0; attempt < 400 || !best; attempt++) {
    const solution = randomPlacement(rng, size);
    const regions = growRegions(rng, size, solution);
    if (!makeUnique(rng, size, regions, solution)) continue;
    const logic = solveLogically(size, regions, maxTechnique);
    if (!logic.solved) continue;
    const candidate = { size, regions, solution, difficulty: logic.hardest, hardSteps: logic.hardSteps };
    const climbed = logic.hardSteps < minHardSteps ? harden(rng, candidate, maxTechnique, minHardSteps) : candidate;
    if (!best || climbed.hardSteps > best.hardSteps) best = climbed;
    if (best.hardSteps >= minHardSteps) break;
  }
  const { hardSteps: _, ...puzzle } = best;
  return puzzle;
}

/**
 * Nudges region borders one cell at a time, keeping the puzzle unique and fair,
 * and keeps any change that makes the player work at least as hard.
 */
function harden(
  rng: Rng,
  start: GeneratedPuzzle & { hardSteps: number },
  maxTechnique: Technique,
  target: number,
): GeneratedPuzzle & { hardSteps: number } {
  const { size, solution } = start;
  let current = start;
  for (let step = 0; step < 800 && current.hardSteps < target; step++) {
    const r = randInt(rng, size);
    const c = randInt(rng, size);
    if (solution[r] === c) continue;
    const [dr, dc] = DIRS[randInt(rng, 4)];
    const to = current.regions[r + dr]?.[c + dc];
    const from = current.regions[r][c];
    if (to === undefined || to === from || regionSize(current.regions, to) >= maxRegionSize(size)) continue;
    if (!staysConnected(size, current.regions, r, c)) continue;
    const regions = current.regions.map((row) => row.slice());
    regions[r][c] = to;
    if (findSolution(size, regions, solution)) continue;
    const logic = solveLogically(size, regions, maxTechnique);
    if (!logic.solved || logic.hardSteps < current.hardSteps) continue;
    current = { size, regions, solution, difficulty: logic.hardest, hardSteps: logic.hardSteps };
  }
  return current;
}

function randomPlacement(rng: Rng, size: number): number[] {
  const cols: number[] = [];
  const used = new Set<number>();
  const place = (row: number): boolean => {
    if (row === size) return true;
    for (const c of shuffle(rng, [...Array(size).keys()])) {
      if (used.has(c)) continue;
      if (row > 0 && Math.abs(c - cols[row - 1]) <= 1) continue;
      cols.push(c);
      used.add(c);
      if (place(row + 1)) return true;
      cols.pop();
      used.delete(c);
    }
    return false;
  };
  place(0);
  return cols;
}

function growRegions(rng: Rng, size: number, solution: number[]): number[][] {
  const regions = Array.from({ length: size }, () => new Array<number>(size).fill(-1));
  solution.forEach((c, r) => (regions[r][c] = r));
  // Uneven growth rates give a mix of big sprawling regions and tight little ones.
  const weights = solution.map(() => 0.4 + rng() * 1.6);
  const sizes = new Array<number>(size).fill(1);
  const cap = maxRegionSize(size);
  let remaining = size * size - size;

  while (remaining > 0) {
    let frontier: [number, number, number][] = [];
    for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
      if (regions[r][c] !== -1) continue;
      for (const [dr, dc] of DIRS) {
        const reg = regions[r + dr]?.[c + dc];
        if (reg !== undefined && reg !== -1) frontier.push([r, c, reg]);
      }
    }
    const roomy = frontier.filter(([, , reg]) => sizes[reg] < cap);
    if (roomy.length > 0) frontier = roomy;
    const total = frontier.reduce((sum, [, , reg]) => sum + weights[reg], 0);
    let pick = rng() * total;
    for (const [r, c, reg] of frontier) {
      pick -= weights[reg];
      if (pick <= 0) {
        regions[r][c] = reg;
        sizes[reg]++;
        remaining--;
        break;
      }
    }
  }
  return regions;
}

/**
 * Repeatedly finds a rival solution and moves one of its cats' cells into a
 * neighbouring region, which breaks that rival without touching the real answer.
 */
function makeUnique(rng: Rng, size: number, regions: number[][], solution: number[]): boolean {
  for (let step = 0; step < size * size * 3; step++) {
    const rival = findSolution(size, regions, solution);
    if (!rival) return true;
    const rows = shuffle(rng, [...Array(size).keys()]).filter((r) => rival[r] !== solution[r]);
    let moved = false;
    for (const r of rows) {
      const c = rival[r];
      const from = regions[r][c];
      const targets = shuffle(
        rng,
        DIRS.map(([dr, dc]) => regions[r + dr]?.[c + dc]).filter((reg): reg is number => reg !== undefined && reg !== from),
      );
      if (targets.length === 0 || !staysConnected(size, regions, r, c)) continue;
      // Feeding the smallest neighbour keeps regions balanced as repairs pile up.
      targets.sort((a, b) => regionSize(regions, a) - regionSize(regions, b));
      regions[r][c] = targets[0];
      moved = true;
      break;
    }
    if (!moved) return false;
  }
  return false;
}

function staysConnected(size: number, regions: number[][], r: number, c: number): boolean {
  const reg = regions[r][c];
  const cells: [number, number][] = [];
  for (let rr = 0; rr < size; rr++) for (let cc = 0; cc < size; cc++) {
    if (regions[rr][cc] === reg && !(rr === r && cc === c)) cells.push([rr, cc]);
  }
  if (cells.length === 0) return false;
  const seen = new Set([cells[0][0] * size + cells[0][1]]);
  const queue = [cells[0]];
  while (queue.length) {
    const [cr, cc] = queue.pop()!;
    for (const [dr, dc] of DIRS) {
      const nr = cr + dr;
      const nc = cc + dc;
      if (regions[nr]?.[nc] !== reg || (nr === r && nc === c) || seen.has(nr * size + nc)) continue;
      seen.add(nr * size + nc);
      queue.push([nr, nc]);
    }
  }
  return seen.size === cells.length;
}
