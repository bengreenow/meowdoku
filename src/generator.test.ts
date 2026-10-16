import { describe, expect, it } from "vitest";
import { dailyPuzzle, levelPuzzle } from "./levels";
import { findSolution } from "./solver";
import type { Puzzle } from "./solver";

function assertValid(p: Puzzle) {
  const { size, regions, solution } = p;
  expect(new Set(solution).size).toBe(size);
  expect(new Set(solution.map((c, r) => regions[r][c])).size).toBe(size);
  for (let r = 1; r < size; r++) expect(Math.abs(solution[r] - solution[r - 1])).toBeGreaterThan(1);
  expect(findSolution(size, regions, solution)).toBeNull();
}

describe("generator", () => {
  it.each([1, 2, 5, 12, 30, 60, 100, 250, 1000])("level %i has exactly one valid solution", (level) => {
    assertValid(levelPuzzle(level));
  });

  it("is deterministic per level", () => {
    expect(levelPuzzle(42)).toEqual(levelPuzzle(42));
  });

  it("gives different days different puzzles", () => {
    const a = dailyPuzzle("2026-10-16");
    assertValid(a);
    expect(a.regions).not.toEqual(dailyPuzzle("2026-10-17").regions);
  });
});
