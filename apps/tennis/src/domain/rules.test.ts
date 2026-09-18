import { describe, expect, it } from "vitest";
import type { Match, MatchSet, Player, TennisSnapshot, TournamentEntry } from "./model";
import {
  advanceWinner,
  generateDraw,
  headToHead,
  playerStats,
  seasonRanking,
  validateEntries,
  validateMatchResult,
} from "./rules";

const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const entry = (player_id: string, seed: number | null): TournamentEntry => ({
  id: `e-${player_id}`,
  tournament_edition_id: "edition",
  player_id,
  seed,
  entry_status: "active",
  created_at: stamp.created_at,
});
const player = (id: string): Player => ({
  id,
  display_name: id.toUpperCase(),
  real_name: null,
  nationality: "Chile",
  country_code: "CL",
  avatar_url: null,
  handedness: null,
  status: "active",
  ...stamp,
});
const match = (overrides: Partial<Match> = {}): Match => ({
  id: "m1",
  tournament_edition_id: "edition",
  round: "semifinal",
  round_order: 1,
  match_number: 1,
  player1_id: "a",
  player2_id: "b",
  scheduled_at: null,
  status: "scheduled",
  winner_id: null,
  next_match_id: "m2",
  next_slot: 1,
  best_of: 3,
  ...stamp,
  ...overrides,
});
const set = (set_number: number, player1_score: number, player2_score: number): MatchSet => ({
  id: `s${set_number}`,
  match_id: "m1",
  set_number,
  player1_score,
  player2_score,
  ...stamp,
});

describe("cuadro", () => {
  it("acepta 4/8/16, posiciona seeds y crea enlaces coherentes", () => {
    for (const size of [4, 8, 16]) {
      const entries = Array.from({ length: size }, (_, index) =>
        entry(`p${index + 1}`, index < 2 ? index + 1 : null),
      );
      const draw = generateDraw(entries, size);
      expect(draw).toHaveLength(size - 1);
      expect(draw.filter(({ round }) => round === "final")).toHaveLength(1);
      expect(draw[0]?.player1Id).toBe("p1");
      expect(draw[Math.floor(size / 2) - 1]?.player2Id).toBe("p2");
      expect(draw.filter(({ nextMatchKey }) => nextMatchKey !== null)).toHaveLength(size - 2);
    }
  });
  it("rechaza seeds y jugadores duplicados", () => {
    expect(
      validateEntries([entry("a", 1), entry("b", 1), entry("c", null), entry("d", null)], 4),
    ).toContain("seeds");
    expect(
      validateEntries([entry("a", 1), entry("a", 2), entry("c", null), entry("d", null)], 4),
    ).toContain("jugadores");
    expect(() => generateDraw([entry("a", null)], 4)).toThrow();
  });
});

describe("partidos", () => {
  it("valida dos jugadores, sets y ganador", () => {
    expect(validateMatchResult(match(), [set(1, 6, 4), set(2, 6, 2)])).toMatchObject({
      winnerId: "a",
      player1Sets: 2,
    });
    expect(() =>
      validateMatchResult(match({ player2_id: "a" }), [set(1, 6, 4), set(2, 6, 2)]),
    ).toThrow("distintos");
    expect(() => validateMatchResult(match(), [set(1, 6, 6)])).toThrow("scores");
    expect(() => validateMatchResult(match(), [set(1, 6, 4)])).toThrow("ganador");
  });
  it("avanza sin sobrescribir ni duplicar", () => {
    const source = match({ status: "finished", winner_id: "a" });
    expect(
      advanceWinner(
        source,
        match({
          id: "m2",
          player1_id: null,
          player2_id: "c",
          next_match_id: null,
          next_slot: null,
        }),
      ).player1_id,
    ).toBe("a");
    expect(() =>
      advanceWinner(
        source,
        match({ id: "m2", player1_id: "x", next_match_id: null, next_slot: null }),
      ),
    ).toThrow("slot");
  });
});

const snapshot: TennisSnapshot = {
  seasons: [
    {
      id: "season",
      name: "T1",
      slug: "t1",
      status: "active",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      ...stamp,
    },
  ],
  players: [player("a"), player("b")],
  tournaments: [
    {
      id: "t",
      name: "Open",
      short_name: "Open",
      logo_url: null,
      default_surface: "clay",
      category: "major",
      status: "active",
      ...stamp,
    },
  ],
  editions: [
    {
      id: "edition",
      tournament_id: "t",
      season_id: "season",
      name: null,
      surface: "clay",
      start_date: "2026-03-01",
      end_date: "2026-03-02",
      status: "completed",
      draw_size: 4,
      best_of: 3,
      ...stamp,
    },
  ],
  entries: [entry("a", 1), entry("b", 2)],
  matches: [
    match({
      id: "final",
      round: "final",
      round_order: 2,
      status: "finished",
      winner_id: "a",
      next_match_id: null,
      next_slot: null,
    }),
  ],
  sets: [set(1, 6, 4), set(2, 6, 3)].map((item) => ({ ...item, match_id: "final" })),
  pointRules: [
    { id: "r1", category: "major", round: "final", points: 1000, ...stamp },
    { id: "r2", category: "major", round: "semifinal", points: 600, ...stamp },
  ],
  awards: [],
};

describe("ranking", () => {
  it("calcula puntos y desempata por títulos", () => {
    const ranking = seasonRanking(snapshot, "season");
    expect(ranking.map(({ player: item, points }) => [item.id, points])).toEqual([
      ["a", 1000],
      ["b", 600],
    ]);
    expect(ranking[0]).toMatchObject({ titles: 1, tournamentsPlayed: 1 });

    const tiedOnPoints = seasonRanking(
      {
        ...snapshot,
        pointRules: snapshot.pointRules.map((rule) => ({ ...rule, points: 600 })),
      },
      "season",
    );
    expect(tiedOnPoints.map(({ player: item }) => item.id)).toEqual(["a", "b"]);
  });
});
describe("head-to-head y estadísticas", () => {
  it("cuenta enfrentamientos, sets, victorias, derrotas y títulos", () => {
    expect(headToHead(snapshot, "a", "b")).toEqual({
      matches: 1,
      playerAWins: 1,
      playerBWins: 0,
      playerASets: 2,
      playerBSets: 0,
    });
    expect(playerStats(snapshot, "a", "season")).toMatchObject({
      played: 1,
      wins: 1,
      losses: 0,
      titles: 1,
      finals: 1,
      setsWon: 2,
    });
    expect(playerStats(snapshot, "b", "season")).toMatchObject({
      played: 1,
      wins: 0,
      losses: 1,
      titles: 0,
    });
  });
});
