import { describe, expect, it } from "vitest";
import {
  formatGameScore,
  gamesToWin,
  gamesWinner,
  type GamesScore,
  nextGamePoint,
  pointWon,
  validateDirectResult,
  validateGamesScore,
} from "./games";

const start: GamesScore = { games1: 0, games2: 0, points1: 0, points2: 0 };
const play = (score: GamesScore, scorer: 1 | 2, times: number, bestOf: 5 | 7 = 5): GamesScore =>
  Array.from({ length: times }).reduce<GamesScore>((current) => pointWon(current, scorer, bestOf), score);

describe("puntuación dentro del juego", () => {
  it("avanza 0 → 15 → 30 → 40 → 45 → juego", () => {
    expect([0, 15, 30, 40].map((points) => nextGamePoint(points as 0 | 15 | 30 | 40))).toEqual([15, 30, 40, 45]);
    expect(nextGamePoint(45)).toBeNull();
    let score = start;
    const seen: number[] = [];
    for (let point = 0; point < 4; point += 1) {
      score = pointWon(score, 1, 5);
      seen.push(score.points1);
    }
    expect(seen).toEqual([15, 30, 40, 45]);
    score = pointWon(score, 1, 5);
    expect(score).toEqual({ games1: 1, games2: 0, points1: 0, points2: 0 });
  });

  it("no tiene deuce: con ambos en 45 el siguiente punto gana el juego", () => {
    const both45 = play(play(start, 1, 4), 2, 4);
    expect(both45).toMatchObject({ points1: 45, points2: 45, games1: 0, games2: 0 });
    expect(pointWon(both45, 2, 5)).toEqual({ games1: 0, games2: 1, points1: 0, points2: 0 });
  });
});

describe("formato al mejor de 5 o 7 juegos", () => {
  it("gana el primero en llegar a 3 (mejor de 5) o 4 (mejor de 7)", () => {
    expect(gamesToWin(5)).toBe(3);
    expect(gamesToWin(7)).toBe(4);
    expect(gamesWinner({ ...start, games1: 3, games2: 2 }, 5)).toBe(1);
    expect(gamesWinner({ ...start, games1: 3, games2: 2 }, 7)).toBeNull();
    expect(gamesWinner({ ...start, games1: 1, games2: 4 }, 7)).toBe(2);
  });

  it("decide el partido tras el último juego y rechaza más puntos", () => {
    const decided = play(start, 1, 15);
    expect(decided).toMatchObject({ games1: 3, games2: 0 });
    expect(() => pointWon(decided, 2, 5)).toThrow(/decidido/);
    expect(formatGameScore({ games1: 2, games2: 1, points1: 30, points2: 15 })).toBe("2–1 (30–15)");
  });

  it("valida marcadores manuales y resultados directos", () => {
    expect(validateGamesScore({ games1: 3, games2: 3, points1: 0, points2: 0 }, 5)).toMatch(/objetivo/);
    expect(validateGamesScore({ games1: 4, games2: 0, points1: 0, points2: 0 }, 5)).toMatch(/entre 0 y 3/);
    expect(validateGamesScore({ games1: 3, games2: 1, points1: 15, points2: 0 }, 5)).toMatch(/en 0/);
    expect(validateGamesScore({ games1: 2, games2: 1, points1: 30, points2: 40 }, 5)).toBeNull();
    expect(validateDirectResult(3, 1, 5)).toBeNull();
    expect(validateDirectResult(2, 1, 5)).toMatch(/gana quien llega a 3/);
    expect(validateDirectResult(3, 2, 7)).toMatch(/gana quien llega a 4/);
    expect(validateDirectResult(4, 2, 7)).toBeNull();
  });
});
