import { dailyPuzzle, levelPuzzle, type Difficulty } from "./levels";

export type PuzzleSpec = { kind: "level"; difficulty: Difficulty; level: number } | { kind: "daily"; date: string };
export type PuzzleRequest = PuzzleSpec & { id: number };

self.onmessage = (event: MessageEvent<PuzzleRequest>) => {
  const req = event.data;
  const puzzle = req.kind === "level" ? levelPuzzle(req.difficulty, req.level) : dailyPuzzle(req.date);
  self.postMessage({ id: req.id, puzzle });
};
