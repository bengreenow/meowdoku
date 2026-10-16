import { generatePuzzle, type GeneratedPuzzle } from "./generator";
import { Technique } from "./solver";

export function sizeForLevel(level: number): number {
  if (level <= 3) return 5;
  if (level <= 10) return 6;
  if (level <= 25) return 7;
  if (level <= 50) return 8;
  if (level <= 90) return 9;
  return 10;
}

function difficultyBand(level: number): { maxTechnique: Technique; minHardSteps: number } {
  if (level <= 10) return { maxTechnique: Technique.Singles, minHardSteps: 0 };
  if (level <= 30) return { maxTechnique: Technique.Confinement, minHardSteps: level > 20 ? 1 : 0 };
  if (level <= 60) return { maxTechnique: Technique.Lookahead, minHardSteps: 1 };
  if (level <= 120) return { maxTechnique: Technique.Lookahead, minHardSteps: 2 };
  return { maxTechnique: Technique.Lookahead, minHardSteps: 3 };
}

export function levelPuzzle(level: number): GeneratedPuzzle {
  return generatePuzzle({ size: sizeForLevel(level), seed: `level-${level}`, ...difficultyBand(level) });
}

export function dailyPuzzle(date: string): GeneratedPuzzle {
  return generatePuzzle({ size: 8, seed: `daily-${date}`, minHardSteps: 2 });
}
