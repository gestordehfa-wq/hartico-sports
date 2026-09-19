import { type GamePoints, gamePointValues, type GamesBestOf } from "./model";

// Regla propia de Hartico Tennis (no son reglas oficiales ATP): dentro de un juego
// los puntos avanzan 0 → 15 → 30 → 40 → 45 → juego. Sin deuce ni ventajas: quien
// puntúa estando en 45 gana el juego. El partido es al mejor de 5 o 7 juegos.
// Estas funciones reflejan `tennis.record_match_point` / `tennis.set_match_score`.

export type GamesScore = Readonly<{
  games1: number;
  games2: number;
  points1: GamePoints;
  points2: GamePoints;
}>;
/** Marcador sin restringir los puntos al tipo válido (entrada de formularios). */
export type ScoreInput = Readonly<{ games1: number; games2: number; points1: number; points2: number }>;
export type Slot = 1 | 2;

export const gamesToWin = (gamesBestOf: GamesBestOf): number => Math.floor(gamesBestOf / 2) + 1;

export function nextGamePoint(points: GamePoints): GamePoints | null {
  const index = gamePointValues.indexOf(points);
  return gamePointValues[index + 1] ?? null;
}

export function gamesWinner(score: ScoreInput, gamesBestOf: GamesBestOf): Slot | null {
  const target = gamesToWin(gamesBestOf);
  if (score.games1 === target && score.games2 < target) return 1;
  if (score.games2 === target && score.games1 < target) return 2;
  return null;
}

/** Aplica un punto; lanza si el partido ya está decidido. */
export function pointWon(score: GamesScore, scorer: Slot, gamesBestOf: GamesBestOf): GamesScore {
  if (gamesWinner(score, gamesBestOf) !== null) throw new Error("El partido ya está decidido; confirma el resultado.");
  const current = scorer === 1 ? score.points1 : score.points2;
  const next = nextGamePoint(current);
  if (next !== null) return scorer === 1 ? { ...score, points1: next } : { ...score, points2: next };
  return {
    games1: score.games1 + (scorer === 1 ? 1 : 0),
    games2: score.games2 + (scorer === 2 ? 1 : 0),
    points1: 0,
    points2: 0,
  };
}

/** Valida un marcador manual (en juego o corrección) contra el formato. */
export function validateGamesScore(score: ScoreInput, gamesBestOf: GamesBestOf): string | null {
  const target = gamesToWin(gamesBestOf);
  const integers = [score.games1, score.games2].every((value) => Number.isInteger(value) && value >= 0 && value <= target);
  if (!integers) return `Los juegos deben estar entre 0 y ${target}.`;
  if (score.games1 === target && score.games2 === target) return "Ambos jugadores no pueden alcanzar el objetivo.";
  if (![score.points1, score.points2].every((points) => gamePointValues.some((value) => value === points))) return "Los puntos válidos son 0, 15, 30, 40 y 45.";
  if ((score.games1 === target || score.games2 === target) && (score.points1 !== 0 || score.points2 !== 0)) {
    return "Con el partido decidido los puntos del juego deben quedar en 0.";
  }
  return null;
}

/** Un resultado directo (partido ya disputado) debe determinar un ganador. */
export function validateDirectResult(games1: number, games2: number, gamesBestOf: GamesBestOf): string | null {
  const score: ScoreInput = { games1, games2, points1: 0, points2: 0 };
  return validateGamesScore(score, gamesBestOf) ?? (gamesWinner(score, gamesBestOf) === null ? `Al mejor de ${gamesBestOf} gana quien llega a ${gamesToWin(gamesBestOf)} juegos.` : null);
}

export function formatGameScore(score: ScoreInput): string {
  const running = score.points1 !== 0 || score.points2 !== 0 ? ` (${score.points1}–${score.points2})` : "";
  return `${score.games1}–${score.games2}${running}`;
}
