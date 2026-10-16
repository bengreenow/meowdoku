import type { GeneratedPuzzle } from "./generator";
import type { Difficulty } from "./levels";
import type { PuzzleSpec } from "./worker";

type Pending = { resolve: (p: GeneratedPuzzle) => void };

const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
const pending = new Map<number, Pending>();
const cache = new Map<string, Promise<GeneratedPuzzle>>();
let nextId = 1;

worker.onmessage = (event: MessageEvent<{ id: number; puzzle: GeneratedPuzzle }>) => {
  pending.get(event.data.id)?.resolve(event.data.puzzle);
  pending.delete(event.data.id);
};

function request(key: string, body: PuzzleSpec): Promise<GeneratedPuzzle> {
  let promise = cache.get(key);
  if (!promise) {
    const id = nextId++;
    promise = new Promise<GeneratedPuzzle>((resolve) => pending.set(id, { resolve }));
    worker.postMessage({ ...body, id });
    cache.set(key, promise);
  }
  return promise;
}

export const getLevel = (difficulty: Difficulty, level: number) =>
  request(`${difficulty}-${level}`, { kind: "level", difficulty, level });
export const getDaily = (date: string) => request(`daily-${date}`, { kind: "daily", date });
