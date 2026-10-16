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
  unlocked: number;
  bestTimes: Record<string, number>;
  dailyDone: Record<string, number>;
  autoMark: boolean;
  sound: boolean;
  saved: SavedGame | null;
}

const KEY = "meowdoku:v1";

const defaults = (): Progress => ({ unlocked: 1, bestTimes: {}, dailyDone: {}, autoMark: true, sound: true, saved: null });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaults(), ...JSON.parse(raw) } : defaults();
  } catch {
    return defaults();
  }
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
