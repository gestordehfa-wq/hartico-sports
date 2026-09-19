import { describe, expect, it } from "vitest";
import type { Competition, FootballSnapshot, Match, Player, Season, Team } from "./model";
import {
  activeSeason,
  competitionStandings,
  playerStatistics,
  teamStatistics,
  validateDateRange,
} from "./rules";

const timestamps = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };
const season: Season = {
  id: "s",
  name: "T1",
  slug: "t1",
  status: "active",
  start_date: "2026-01-01",
  end_date: "2026-12-31",
  ...timestamps,
};
const competition: Competition = {
  id: "c",
  season_id: "s",
  name: "Liga",
  short_name: "L",
  type: "league",
  status: "active",
  logo_url: null,
  legs: 1,
  champion_team_id: null,
  source_league_id: null,
  source_cup_id: null,
  ...timestamps,
};
const team = (id: string, name: string): Team => ({
  id,
  name,
  short_name: name,
  code: id.toUpperCase(),
  country: "Chile",
  country_code: "CL",
  logo_url: null,
  status: "active",
  ...timestamps,
});
const player: Player = {
  id: "p",
  display_name: "Nueve",
  real_name: null,
  nationality: "Chile",
  country_code: "CL",
  position: "ATK",
  avatar_url: null,
  status: "active",
  ...timestamps,
};
const match = (id: string, home: string, away: string, hs: number, as: number): Match => ({
  id,
  competition_id: "c",
  season_id: "s",
  home_team_id: home,
  away_team_id: away,
  matchday: 1,
  scheduled_at: "2026-03-01T20:00:00Z",
  status: "finished",
  home_score: hs,
  away_score: as,
  referee_name: null,
  stage: null,
  round_order: null,
  match_number: null,
  next_match_id: null,
  next_slot: null,
  winner_team_id: null,
  tiebreak_note: null,
  ...timestamps,
});
const snapshot: FootballSnapshot = {
  seasons: [season],
  competitions: [competition],
  teams: [team("a", "Alfa"), team("b", "Beta")],
  players: [player],
  rosters: [],
  competitionTeams: [],
  matches: [match("m", "a", "b", 2, 1)],
  events: [
    {
      id: "e",
      match_id: "m",
      player_id: "p",
      team_id: "a",
      event_type: "goal",
      minute: 10,
      related_player_id: null,
      created_at: timestamps.created_at,
    },
  ],
  appearances: [
    {
      id: "ap",
      match_id: "m",
      player_id: "p",
      team_id: "a",
      starter: true,
      created_at: timestamps.created_at,
    },
  ],
  awards: [],
};

describe("clasificación", () => {
  it("aplica 3-1-0 y ordena", () => {
    const table = competitionStandings(snapshot, "c");
    expect(table[0]?.team.id).toBe("a");
    expect(table[0]?.points).toBe(3);
    expect(table[1]?.goalDifference).toBe(-1);
  });
  it("solo existe para ligas", () => {
    expect(
      competitionStandings({ ...snapshot, competitions: [{ ...competition, type: "cup" }] }, "c"),
    ).toEqual([]);
  });
});

describe("estadísticas derivadas", () => {
  it("calcula jugadores desde apariciones y eventos", () => {
    expect(playerStatistics(snapshot, "s")[0]).toMatchObject({
      appearances: 1,
      goals: 1,
      assists: 0,
    });
  });
  it("calcula goles de equipo desde resultados", () => {
    expect(teamStatistics(snapshot, "s")[0]).toMatchObject({ goalsFor: 2, goalsAgainst: 1 });
  });
});

describe("temporadas", () => {
  it("encuentra la activa y valida fechas", () => {
    expect(activeSeason([season])?.id).toBe("s");
    expect(validateDateRange("2026-02-01", "2026-01-01")).not.toBeNull();
  });
});
