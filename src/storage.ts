import type { Difficulty } from "./levels";

export type Mark = 0 | 1 | 2;

export interface SavedGame {
  key: string;
  /** Guards against restoring marks onto a different board if the generator ever changes. */
  shape: string;
  marks: Mark[][];
  lives: number;
  elapsed: number;
}

export interface Progress {
  difficulty: Difficulty;
  unlocked: Record<Difficulty, number>;
  /** Keyed by `${difficulty}-${level}`. */
  bestTimes: Record<string, number>;
  dailyDone: Record<string, number>;
  autoMark: boolean;
  sound: boolean;
  saved: SavedGame | null;
}

const KEY = "meowdoku:v1";

const defaults = (): Progress => ({
  difficulty: "normal",
  unlocked: { easy: 1, normal: 1, hard: 1 },
  bestTimes: {},
  dailyDone: {},
  autoMark: true,
  sound: true,
  saved: null,
});

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate({ ...defaults(), ...JSON.parse(raw) }) : defaults();
  } catch {
    return defaults();
  }
}

/** Before difficulties, there was a single track, which is now Normal. */
function migrate(progress: Progress): Progress {
  const legacy = progress.unlocked as unknown;
  if (typeof legacy === "number") {
    progress.unlocked = { easy: 1, normal: legacy, hard: 1 };
    progress.bestTimes = Object.fromEntries(
      Object.entries(progress.bestTimes).map(([k, v]) => [/^\d+$/.test(k) ? `normal-${k}` : k, v]),
    );
  }
  return progress;
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Private mode or full storage: the game still works, it just forgets.
  }
}

export function todayKey(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function dailyStreak(done: Record<string, number>, now = new Date()): number {
  const day = new Date(now);
  if (!done[todayKey(day)]) day.setDate(day.getDate() - 1);
  let streak = 0;
  while (done[todayKey(day)]) {
    streak++;
    day.setDate(day.getDate() - 1);
  }
  return streak;
}
