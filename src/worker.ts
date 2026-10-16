import { dailyPuzzle, levelPuzzle } from "./levels";

export type PuzzleSpec = { kind: "level"; level: number } | { kind: "daily"; date: string };
export type PuzzleRequest = PuzzleSpec & { id: number };

self.onmessage = (event: MessageEvent<PuzzleRequest>) => {
  const req = event.data;
  const puzzle = req.kind === "level" ? levelPuzzle(req.level) : dailyPuzzle(req.date);
  self.postMessage({ id: req.id, puzzle });
};
