import { generatePuzzle, type GeneratedPuzzle } from "./generator";
import { Technique } from "./solver";

export type Difficulty = "easy" | "normal" | "hard";

export const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Normal" },
  { id: "hard", label: "Hard" },
];

interface Band {
  maxTechnique: Technique;
  minHardSteps: number;
}

interface Track {
  /** Normal keeps the original seed prefix so boards and progress from before difficulties existed stay the same. */
  seed: string;
  size(level: number): number;
  band(level: number): Band;
}

const TRACKS: Record<Difficulty, Track> = {
  easy: {
    seed: "easy",
    size: (level) => (level <= 5 ? 5 : level <= 20 ? 6 : 7),
    band: (level) => ({ maxTechnique: level <= 40 ? Technique.Singles : Technique.Confinement, minHardSteps: 0 }),
  },
  normal: {
    seed: "level",
    size: (level) => {
      if (level <= 3) return 5;
      if (level <= 10) return 6;
      if (level <= 25) return 7;
      if (level <= 50) return 8;
      if (level <= 90) return 9;
      return 10;
    },
    band: (level) => {
      if (level <= 10) return { maxTechnique: Technique.Singles, minHardSteps: 0 };
      if (level <= 30) return { maxTechnique: Technique.Confinement, minHardSteps: level > 20 ? 1 : 0 };
      if (level <= 60) return { maxTechnique: Technique.Lookahead, minHardSteps: 1 };
      if (level <= 120) return { maxTechnique: Technique.Lookahead, minHardSteps: 2 };
      return { maxTechnique: Technique.Lookahead, minHardSteps: 3 };
    },
  },
  hard: {
    seed: "hard",
    size: (level) => (level <= 5 ? 8 : level <= 20 ? 9 : 10),
    band: (level) => ({ maxTechnique: Technique.Lookahead, minHardSteps: level <= 10 ? 2 : 3 }),
  },
};

export function sizeForLevel(difficulty: Difficulty, level: number): number {
  return TRACKS[difficulty].size(level);
}

export function levelPuzzle(difficulty: Difficulty, level: number): GeneratedPuzzle {
  const track = TRACKS[difficulty];
  return generatePuzzle({ size: track.size(level), seed: `${track.seed}-${level}`, ...track.band(level) });
}

export function dailyPuzzle(date: string): GeneratedPuzzle {
  return generatePuzzle({ size: 8, seed: `daily-${date}`, minHardSteps: 2 });
}
