import { describe, expect, it } from "vitest";
import {
  generateCupBracket,
  generateLeagueFixture,
  isKnockoutTie,
  knockoutOutcome,
  leagueTopTie,
  seededOrder,
  supercupPairing,
} from "./formats";
import { emptySnapshot, type FootballSnapshot, type Match, type Team } from "./model";
import { competitionStandings, playerStatistics } from "./rules";

const stamp = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const ids = (count: number) => Array.from({ length: count }, (_, index) => `t${index + 1}`);
const team = (id: string): Team => ({ id, name: id, short_name: id, code: id.toUpperCase(), country: "Chile", country_code: "CL", logo_url: null, status: "active", ...stamp });
const pairKey = (a: string, b: string) => [a, b].sort().join("|");

describe("fixture de liga (todos contra todos)", () => {
  it.each([2, 4, 5, 6])("con %i equipos cada pareja se enfrenta una vez y nadie juega dos veces por jornada", (count) => {
    const fixture = generateLeagueFixture(ids(count), 1);
    expect(fixture).toHaveLength((count * (count - 1)) / 2);
    expect(new Set(fixture.map((match) => pairKey(match.homeTeamId, match.awayTeamId))).size).toBe(fixture.length);
    const matchdays = new Set(fixture.map(({ matchday }) => matchday));
    expect(matchdays.size).toBe(count % 2 === 0 ? count - 1 : count);
    for (const matchday of matchdays) {
      const teams = fixture.filter((match) => match.matchday === matchday).flatMap((match) => [match.homeTeamId, match.awayTeamId]);
      expect(new Set(teams).size).toBe(teams.length);
    }
  });

  it("ida y vuelta invierte la localía y equilibra locales y visitantes", () => {
    const fixture = generateLeagueFixture(ids(4), 2);
    expect(fixture).toHaveLength(12);
    for (const match of fixture.filter(({ matchday }) => matchday <= 3)) {
      expect(fixture).toContainEqual({ matchday: match.matchday + 3, homeTeamId: match.awayTeamId, awayTeamId: match.homeTeamId });
    }
    for (const team of ids(4)) {
      expect(fixture.filter((match) => match.homeTeamId === team)).toHaveLength(3);
      expect(fixture.filter((match) => match.awayTeamId === team)).toHaveLength(3);
    }
  });

  it("rechaza equipos duplicados y ligas de un solo equipo", () => {
    expect(() => generateLeagueFixture(["a", "a"])).toThrow(/duplicados/);
    expect(() => generateLeagueFixture(["a"])).toThrow(/al menos 2/);
  });
});

describe("cuadro de copa", () => {
  it.each([4, 8, 16])("cuadro de %i: enlaces coherentes hasta la final", (size) => {
    const bracket = generateCupBracket(ids(size));
    expect(bracket).toHaveLength(size - 1);
    expect(bracket.filter(({ stage }) => stage === "final")).toHaveLength(1);
    const byKey = new Map(bracket.map((draft) => [draft.key, draft]));
    for (const draft of bracket.filter(({ nextKey }) => nextKey !== null)) {
      const next = byKey.get(draft.nextKey ?? "");
      expect(next?.roundOrder).toBe(draft.roundOrder + 1);
      expect(draft.nextSlot === 1 || draft.nextSlot === 2).toBe(true);
    }
    for (const next of bracket.filter(({ roundOrder }) => roundOrder > 1)) {
      const feeders = bracket.filter(({ nextKey }) => nextKey === next.key);
      expect(feeders.map(({ nextSlot }) => nextSlot).sort()).toEqual([1, 2]);
    }
    const firstRound = bracket.filter(({ roundOrder }) => roundOrder === 1);
    expect(firstRound.flatMap((draft) => [draft.homeTeamId, draft.awayTeamId]).sort()).toEqual([...ids(size)].sort());
    expect(bracket.filter(({ roundOrder }) => roundOrder > 1).every((draft) => draft.homeTeamId === null && draft.awayTeamId === null)).toBe(true);
  });

  it("enfrenta al mejor cabeza de serie con el peor y separa a los dos primeros hasta la final", () => {
    const bracket = generateCupBracket(ids(8));
    expect(bracket[0]).toMatchObject({ homeTeamId: "t1", awayTeamId: "t8" });
    const half = (team: string) => {
      const first = bracket.findIndex((draft) => draft.homeTeamId === team || draft.awayTeamId === team);
      return first < 2 ? "arriba" : "abajo";
    };
    expect(half("t1")).not.toBe(half("t2"));
  });

  it("solo acepta 4, 8 o 16 equipos sin duplicados", () => {
    expect(() => generateCupBracket(ids(6))).toThrow(/4, 8 o 16/);
    expect(() => generateCupBracket(["a", "a", "b", "c"])).toThrow(/duplicados/);
  });

  it("ordena inscripciones por seed y luego por id de forma determinista", () => {
    expect(seededOrder([{ team_id: "z", seed: null }, { team_id: "b", seed: 2 }, { team_id: "a", seed: null }, { team_id: "c", seed: 1 }])).toEqual(["c", "b", "a", "z"]);
  });
});

describe("resultado eliminatorio y empates", () => {
  const finished = (home: number, away: number): Pick<Match, "status" | "home_team_id" | "away_team_id" | "home_score" | "away_score"> => ({
    status: "finished", home_team_id: "casa", away_team_id: "visita", home_score: home, away_score: away,
  });

  it("gana el marcador cuando no hay empate", () => {
    expect(knockoutOutcome(finished(2, 1))).toEqual({ winnerId: "casa", decidedByAdministrator: false });
    expect(knockoutOutcome(finished(0, 3))).toEqual({ winnerId: "visita", decidedByAdministrator: false });
  });

  it("un empate no se resuelve solo: exige ganador y mecanismo definidos por el administrador", () => {
    expect(isKnockoutTie(finished(1, 1))).toBe(true);
    expect(() => knockoutOutcome(finished(1, 1))).toThrow(/administrador/);
    expect(() => knockoutOutcome(finished(1, 1), { winnerId: "otro", note: "Reglamento art. 4" })).toThrow(/entre los dos equipos/);
    expect(() => knockoutOutcome(finished(1, 1), { winnerId: "casa", note: "  " })).toThrow(/mecanismo reglamentario/);
    expect(knockoutOutcome(finished(1, 1), { winnerId: "visita", note: "Reglamento art. 4" })).toEqual({ winnerId: "visita", decidedByAdministrator: true });
  });

  it("no resuelve partidos sin finalizar o sin rival", () => {
    expect(() => knockoutOutcome({ ...finished(1, 0), status: "scheduled" })).toThrow(/finalizado/);
    expect(() => knockoutOutcome({ ...finished(1, 0), away_team_id: null })).toThrow(/ambos equipos/);
  });
});

describe("campeones y Supercopa", () => {
  const row = (id: string, points: number, goalDifference: number, goalsFor: number) => ({
    team: team(id), played: 1, won: 0, drawn: 0, lost: 0, goalsFor, goalsAgainst: goalsFor - goalDifference, goalDifference, points,
  });

  it("detecta el empate en la cima por PTS, DG y GF", () => {
    expect(leagueTopTie([row("a", 7, 3, 5), row("b", 7, 3, 5), row("c", 7, 2, 5)])).toEqual(["a", "b"]);
    expect(leagueTopTie([row("a", 7, 3, 5), row("b", 7, 3, 4)])).toEqual(["a"]);
    expect(leagueTopTie([])).toEqual([]);
  });

  it("empareja campeón de liga y de copa; con doblete no elige rival", () => {
    expect(supercupPairing("liga", "copa")).toEqual({ status: "ready", homeTeamId: "liga", awayTeamId: "copa" });
    expect(supercupPairing("dobles", "dobles")).toEqual({ status: "needs_opponent", championId: "dobles" });
    expect(supercupPairing(null, "copa").status).toBe("missing");
    expect(supercupPairing("liga", null).status).toBe("missing");
  });
});

describe("clasificación con inscripciones y estadísticas por competición", () => {
  const competition = (id: string, type: "league" | "cup") => ({ id, season_id: "s", name: id, short_name: id, type, status: "active" as const, logo_url: null, legs: 1 as const, champion_team_id: null, source_league_id: null, source_cup_id: null, ...stamp });
  const fixture = (id: string, competitionId: string, home: string | null, away: string | null, hs: number | null, as: number | null): Match => ({
    id, competition_id: competitionId, season_id: "s", home_team_id: home, away_team_id: away, matchday: 1, scheduled_at: "2026-03-01T20:00:00Z",
    status: hs === null ? "scheduled" : "finished", home_score: hs, away_score: as, referee_name: null, stage: null, round_order: null, match_number: null,
    next_match_id: null, next_slot: null, winner_team_id: null, tiebreak_note: null, ...stamp,
  });
  const snapshot: FootballSnapshot = {
    ...emptySnapshot,
    competitions: [competition("liga", "league"), competition("copa", "cup")],
    teams: ["a", "b", "c"].map(team),
    rosters: ["a", "b", "c"].map((teamId) => ({ id: `r-${teamId}`, season_id: "s", player_id: "p", team_id: teamId, start_date: null, end_date: null, role: "player" as const, status: "active" as const, ...stamp })),
    competitionTeams: ["a", "b"].map((teamId) => ({ id: `e-${teamId}`, competition_id: "liga", team_id: teamId, seed: null, created_at: stamp.created_at })),
    matches: [fixture("m1", "liga", "a", "b", 3, 0), fixture("m2", "liga", "b", "a", 1, 1), fixture("m3", "copa", "a", "c", 5, 0), fixture("m4", "copa", null, null, null, null)],
  };

  it("solo clasifica a los equipos inscritos y aplica 3-1-0 con PJ/PG/PE/PP/GF/GC/DG", () => {
    const table = competitionStandings(snapshot, "liga");
    expect(table.map(({ team: item }) => item.id)).toEqual(["a", "b"]);
    expect(table[0]).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 4, goalsAgainst: 1, goalDifference: 3, points: 4 });
    expect(table[1]).toMatchObject({ played: 2, won: 0, drawn: 1, lost: 1, points: 1 });
  });

  it("sin inscripciones conserva el criterio v0.1 (planteles de la temporada)", () => {
    const legacy = { ...snapshot, competitionTeams: [] };
    expect(competitionStandings(legacy, "liga").map(({ team: item }) => item.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("las estadísticas se pueden filtrar por competición", () => {
    const withEvents: FootballSnapshot = {
      ...snapshot,
      players: [{ id: "p", display_name: "P", real_name: null, nationality: "Chile", country_code: "CL", position: "ATK", avatar_url: null, status: "active", ...stamp }],
      events: [
        { id: "g1", match_id: "m1", player_id: "p", team_id: "a", event_type: "goal", minute: 10, related_player_id: null, created_at: stamp.created_at },
        { id: "g2", match_id: "m3", player_id: "p", team_id: "a", event_type: "goal", minute: 20, related_player_id: null, created_at: stamp.created_at },
      ],
    };
    expect(playerStatistics(withEvents, "s")[0]?.goals).toBe(2);
    expect(playerStatistics(withEvents, "s", "liga")[0]?.goals).toBe(1);
    expect(playerStatistics(withEvents, "s", "copa")[0]?.goals).toBe(1);
  });
});
