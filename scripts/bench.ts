import { levelPuzzle } from "../src/levels";
for (const level of [30, 70, 95, 150, 300, 1000]) {
  const t = performance.now();
  const p = levelPuzzle("normal", level);
  const sizes = Array(p.size).fill(0); p.regions.flat().forEach((r) => sizes[r]++);
  console.log(level, `${(performance.now() - t).toFixed(0)}ms`, sizes.sort((a, b) => b - a).join(","));
}
