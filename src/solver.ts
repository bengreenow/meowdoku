export interface Puzzle {
  size: number;
  /** regions[row][col] is the region index of that cell. */
  regions: number[][];
  /** solution[row] is the column of the cat in that row. */
  solution: number[];
}

/**
 * Finds a solution that differs from `avoid` (or any solution when `avoid` is omitted).
 * Returns null when none exists, which is how uniqueness is proven.
 */
export function findSolution(size: number, regions: number[][], avoid?: number[]): number[] | null {
  const cols = new Array<number>(size).fill(-1);
  // cellsBelow[reg][row]: columns that region still owns in this row or any later one.
  const cellsBelow = Array.from({ length: size }, () => new Array<number>(size + 1).fill(0));
  for (let r = size - 1; r >= 0; r--) {
    for (let reg = 0; reg < size; reg++) cellsBelow[reg][r] = cellsBelow[reg][r + 1];
    for (let c = 0; c < size; c++) cellsBelow[regions[r][c]][r] |= 1 << c;
  }
  let usedCols = 0;
  let usedRegions = 0;

  // Any region that can no longer fit a cat in the rows left dooms this branch.
  const feasible = (row: number): boolean => {
    for (let reg = 0; reg < size; reg++) {
      if (usedRegions & (1 << reg)) continue;
      if ((cellsBelow[reg][row] & ~usedCols) === 0) return false;
    }
    return true;
  };

  const search = (row: number, differs: boolean): boolean => {
    if (row === size) return avoid === undefined || differs;
    if (!feasible(row)) return false;
    const prev = row > 0 ? cols[row - 1] : -10;
    for (let c = 0; c < size; c++) {
      if (usedCols & (1 << c)) continue;
      if (Math.abs(c - prev) <= 1) continue;
      const reg = regions[row][c];
      if (usedRegions & (1 << reg)) continue;
      cols[row] = c;
      usedCols |= 1 << c;
      usedRegions |= 1 << reg;
      if (search(row + 1, differs || (avoid !== undefined && avoid[row] !== c))) return true;
      usedCols &= ~(1 << c);
      usedRegions &= ~(1 << reg);
    }
    cols[row] = -1;
    return false;
  };

  return search(0, false) ? cols.slice() : null;
}

export enum Technique {
  Singles = 1,
  Confinement = 2,
  Lookahead = 3,
}

export interface LogicResult {
  solved: boolean;
  hardest: Technique;
  /** How many times singles stalled and a harder deduction was needed. */
  hardSteps: number;
}

/**
 * Solves the way a person would, without guessing, to confirm the puzzle is fair
 * and to grade how hard it is.
 */
export function solveLogically(size: number, regions: number[][], maxTechnique = Technique.Lookahead): LogicResult {
  const n = size;
  const cand: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(true));
  const cats: boolean[][] = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
  let placed = 0;
  let hardest = Technique.Singles;
  let hardSteps = 0;

  const units: [number, number][][] = [];
  for (let r = 0; r < n; r++) units.push(Array.from({ length: n }, (_, c) => [r, c] as [number, number]));
  for (let c = 0; c < n; c++) units.push(Array.from({ length: n }, (_, r) => [r, c] as [number, number]));
  const regionCells: [number, number][][] = Array.from({ length: n }, () => []);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) regionCells[regions[r][c]].push([r, c]);
  units.push(...regionCells);

  const blockedBy = (r: number, c: number): [number, number][] => {
    const out: [number, number][] = [];
    for (let rr = 0; rr < n; rr++) for (let cc = 0; cc < n; cc++) {
      if (rr === r && cc === c) continue;
      if (rr === r || cc === c || regions[rr][cc] === regions[r][c] || (Math.abs(rr - r) <= 1 && Math.abs(cc - c) <= 1)) {
        out.push([rr, cc]);
      }
    }
    return out;
  };

  const place = (r: number, c: number) => {
    cats[r][c] = true;
    cand[r][c] = false;
    placed++;
    for (const [rr, cc] of blockedBy(r, c)) cand[rr][cc] = false;
  };

  const unitHasCat = (unit: [number, number][]) => unit.some(([r, c]) => cats[r][c]);

  const applySingles = (): boolean | null => {
    for (const unit of units) {
      if (unitHasCat(unit)) continue;
      const open = unit.filter(([r, c]) => cand[r][c]);
      if (open.length === 0) return null;
      if (open.length === 1) {
        place(open[0][0], open[0][1]);
        return true;
      }
    }
    return false;
  };

  const confine = (axis: 0 | 1): boolean => {
    const regionMask = new Array<number>(n).fill(0);
    const lineMask = new Array<number>(n).fill(0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!cand[r][c]) continue;
      const line = axis === 0 ? r : c;
      regionMask[regions[r][c]] |= 1 << line;
      lineMask[line] |= 1 << regions[r][c];
    }
    let changed = false;
    const full = (1 << n) - 1;
    for (let subset = 1; subset < full; subset++) {
      const k = popcount(subset);
      let regionUnion = 0;
      let lineUnion = 0;
      for (let i = 0; i < n; i++) {
        if (!(subset & (1 << i))) continue;
        regionUnion |= regionMask[i];
        lineUnion |= lineMask[i];
      }
      if (regionUnion !== 0 && popcount(regionUnion) === k) {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
          const line = axis === 0 ? r : c;
          if (cand[r][c] && regionUnion & (1 << line) && !(subset & (1 << regions[r][c]))) {
            cand[r][c] = false;
            changed = true;
          }
        }
      }
      if (lineUnion !== 0 && popcount(lineUnion) === k) {
        for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
          const line = axis === 0 ? r : c;
          if (cand[r][c] && lineUnion & (1 << regions[r][c]) && !(subset & (1 << line))) {
            cand[r][c] = false;
            changed = true;
          }
        }
      }
      if (changed) return true;
    }
    return false;
  };

  const lookahead = (): boolean => {
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (!cand[r][c]) continue;
      const blocked = new Set(blockedBy(r, c).map(([rr, cc]) => rr * n + cc));
      blocked.add(r * n + c);
      const breaksUnit = units.some(
        (unit) => !unitHasCat(unit) && !unit.some(([rr, cc]) => rr === r && cc === c) &&
          unit.every(([rr, cc]) => !cand[rr][cc] || blocked.has(rr * n + cc)),
      );
      if (breaksUnit) {
        cand[r][c] = false;
        return true;
      }
    }
    return false;
  };

  while (placed < n) {
    const singles = applySingles();
    if (singles === null) return { solved: false, hardest, hardSteps };
    if (singles) continue;
    if (maxTechnique >= Technique.Confinement && (confine(0) || confine(1))) {
      hardest = Math.max(hardest, Technique.Confinement);
      hardSteps++;
      continue;
    }
    if (maxTechnique >= Technique.Lookahead && lookahead()) {
      hardest = Technique.Lookahead;
      hardSteps++;
      continue;
    }
    return { solved: false, hardest, hardSteps };
  }
  return { solved: true, hardest, hardSteps };
}

function popcount(x: number): number {
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}
