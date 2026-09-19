import { describe, expect, it } from "vitest";
import type {
  Match,
  Player,
  RankingPointRule,
  TennisSnapshot,
  Tournament,
  TournamentEdition,
  TournamentEntry,
} from "./model";
import { emptySnapshot } from "./model";
import {
  addDays,
  editionPoints,
  rankingHistory,
  rankingWithMovement,
  reachedRound,
  rollingRanking,
  seasonRanking,
} from "./ranking";

const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const player = (id: string): Player => ({ id, display_name: id, real_name: null, nationality: "X", country_code: "XX", avatar_url: null, handedness: null, status: "active", ...stamp });
const tournament = (id: string, category: string): Tournament => ({ id, name: id, short_name: id, logo_url: null, default_surface: "hard", category, status: "active", ...stamp });
const rule = (category: string, reached: RankingPointRule["reached"], points: number): RankingPointRule => ({ id: `${category}-${reached}`, category, reached, points, ...stamp });
const edition = (id: string, tournamentId: string, endDate: string, status: TournamentEdition["status"] = "completed"): TournamentEdition => ({
  id, tournament_id: tournamentId, season_id: "season", name: null, surface: "hard", start_date: endDate, end_date: endDate, status,
  draw_size: 4, best_of: 3, scoring_format: "games", games_best_of: 5, ...stamp,
});
const entry = (editionId: string, playerId: string): TournamentEntry => ({ id: `${editionId}-${playerId}`, tournament_edition_id: editionId, player_id: playerId, seed: null, entry_status: "active", created_at: stamp.created_at });
const match = (editionId: string, round: Match["round"], order: number, p1: string, p2: string, winner: string): Match => ({
  id: `${editionId}-${round}-${p1}`, tournament_edition_id: editionId, round, round_order: order, match_number: 1, player1_id: p1, player2_id: p2,
  scheduled_at: null, status: "finished", winner_id: winner, next_match_id: null, next_slot: null, best_of: 3, scoring_format: "games", games_best_of: 5,
  player1_games: 3, player2_games: 1, player1_points: 0, player2_points: 0, ...stamp,
});

/** Cuadro de 4 completo: ana campeona, carla finalista, beto y dani caen en semifinales. */
const fourDraw = (editionId: string, champion = "ana", runnerUp = "carla") => ({
  entries: ["ana", "beto", "carla", "dani"].map((id) => entry(editionId, id)),
  matches: [
    match(editionId, "semifinal", 1, "ana", "beto", "ana"),
    { ...match(editionId, "semifinal", 1, "carla", "dani", "carla"), match_number: 2 },
    match(editionId, "final", 2, champion, runnerUp, champion),
  ],
});

const build = (editions: readonly TournamentEdition[], extra: Partial<TennisSnapshot> = {}): TennisSnapshot => {
  const draws = editions.map(({ id }) => fourDraw(id));
  return {
    ...emptySnapshot,
    players: ["ana", "beto", "carla", "dani"].map(player),
    tournaments: [tournament("major", "major"), tournament("club", "club")],
    editions,
    entries: draws.flatMap(({ entries }) => entries),
    matches: draws.flatMap(({ matches }) => matches),
    rankingRules: [
      rule("major", "champion", 1000), rule("major", "final", 600), rule("major", "semifinal", 360), rule("major", "quarterfinal", 180),
      rule("club", "champion", 100), rule("club", "final", 60), rule("club", "semifinal", 30),
    ],
    ...extra,
  };
};

describe("puntos por categoría y ronda alcanzada", () => {
  it("asigna puntos según la ronda alcanzada y la categoría del torneo", () => {
    const snapshot = build([edition("e1", "major", "2026-03-01"), edition("e2", "club", "2026-03-10")]);
    const points = (editionId: string) => Object.fromEntries(editionPoints(snapshot, snapshot.editions.find(({ id }) => id === editionId) as TournamentEdition).map(({ playerId, points: value }) => [playerId, value]));
    expect(points("e1")).toEqual({ ana: 1000, carla: 600, beto: 360, dani: 360 });
    expect(points("e2")).toEqual({ ana: 100, carla: 60, beto: 30, dani: 30 });
  });

  it("respeta categorías creadas por el administrador y puntos editados", () => {
    const snapshot = build([edition("e1", "exhibicion", "2026-03-01")], {
      tournaments: [tournament("exhibicion", "exhibicion")],
      rankingRules: [rule("exhibicion", "champion", 7)],
    });
    expect(rollingRanking(snapshot, "2026-04-01")[0]).toMatchObject({ rank: 1, points: 7 });
  });

  it("identifica la ronda alcanzada con partidos decididos", () => {
    const { matches } = fourDraw("e1");
    expect(reachedRound(matches, "ana")).toBe("champion");
    expect(reachedRound(matches, "carla")).toBe("final");
    expect(reachedRound(matches, "beto")).toBe("semifinal");
    expect(reachedRound(matches, "nadie")).toBeNull();
  });
});

describe("ranking de 52 semanas", () => {
  it("solo suma ediciones completadas dentro de la ventana", () => {
    const asOf = "2026-06-01";
    const snapshot = build([
      edition("dentro", "major", addDays(asOf, -363)),
      edition("borde", "club", addDays(asOf, -364)),
      edition("fuera", "major", addDays(asOf, -400)),
      edition("activa", "major", addDays(asOf, -10), "active"),
      edition("futura", "major", addDays(asOf, 5)),
    ]);
    const rows = rollingRanking(snapshot, asOf);
    expect(rows.find(({ player: item }) => item.id === "ana")).toMatchObject({ points: 1000, tournamentsPlayed: 1, titles: 1 });
    // 40 días después "dentro" sale de la ventana y "futura" entra: solo cuenta un torneo.
    expect(rollingRanking(snapshot, addDays(asOf, 40)).find(({ player: item }) => item.id === "ana")?.tournamentsPlayed).toBe(1);
  });

  it("desempata de forma determinista por puntos, títulos, finales y nombre", () => {
    const snapshot = build([edition("e1", "major", "2026-03-01")], {
      rankingRules: [rule("major", "champion", 100), rule("major", "final", 100), rule("major", "semifinal", 100)],
    });
    const order = rollingRanking(snapshot, "2026-04-01").map(({ player: item }) => item.id);
    expect(order).toEqual(["ana", "carla", "beto", "dani"]);
    expect(rollingRanking(snapshot, "2026-04-01").map(({ rank }) => rank)).toEqual([1, 2, 3, 4]);
  });

  it("acumula varios torneos y el ranking de temporada no usa ventana", () => {
    const snapshot = build([edition("e1", "major", "2026-03-01"), edition("e2", "major", "2026-05-01")]);
    expect(rollingRanking(snapshot, "2026-06-01")[0]).toMatchObject({ points: 2000, titles: 2, tournamentsPlayed: 2 });
    expect(seasonRanking(snapshot, "season")[0]).toMatchObject({ points: 2000 });
  });
});

describe("evolución de posición", () => {
  const snapshot = build([edition("e1", "major", "2026-03-01"), edition("e2", "major", "2026-05-01")], {});
  // En e2 ana cae en semifinales y carla se corona: cambia el orden respecto a e1.
  const swapped: TennisSnapshot = {
    ...snapshot,
    matches: [
      ...snapshot.matches.filter((item) => item.tournament_edition_id !== "e2"),
      match("e2", "semifinal", 1, "ana", "beto", "beto"),
      { ...match("e2", "semifinal", 1, "carla", "dani", "carla"), match_number: 2 },
      match("e2", "final", 2, "beto", "carla", "carla"),
    ],
  };

  it("compara contra el ranking del torneo anterior cuando hay datos suficientes", () => {
    expect(rankingWithMovement(build([edition("e1", "major", "2026-03-01")]), "2026-04-01").comparedTo).toBeNull();
    const { rows, comparedTo } = rankingWithMovement(swapped, "2026-06-01");
    expect(comparedTo).toBe("2026-03-01");
    const carla = rows.find(({ player: item }) => item.id === "carla");
    expect(carla).toMatchObject({ previousRank: 2 });
  });

  it("devuelve historial de posiciones por edición", () => {
    const history = rankingHistory(swapped, "carla");
    expect(history.map(({ date, rank, reached }) => [date, rank, reached])).toEqual([
      ["2026-03-01", 2, "final"],
      ["2026-05-01", 1, "champion"],
    ]);
  });
});
