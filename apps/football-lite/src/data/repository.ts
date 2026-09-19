import type {
  Award,
  Competition,
  CompetitionTeam,
  EntityStatus,
  FootballSnapshot,
  FootballTable,
  Match,
  MatchEvent,
  MatchEventType,
  MatchPlayerAppearance,
  MatchStatus,
  MutationPayload,
  Player,
  PlayerPosition,
  Season,
  SeasonPlayerRoster,
  Team,
} from "../domain/model";
import { knockoutStages, legOptions, type KnockoutStage, type Legs } from "../domain/model";
import type { FootballSupabaseClient } from "./supabase";

export interface FootballRepository {
  load(): Promise<FootballSnapshot>;
  create(table: FootballTable, payload: MutationPayload): Promise<void>;
  update(table: FootballTable, id: string, payload: MutationPayload): Promise<void>;
  remove(table: FootballTable, id: string): Promise<void>;
  /** Inserta varias filas en una sola sentencia (atómica), p. ej. un fixture completo. */
  createMany(table: FootballTable, payloads: readonly MutationPayload[]): Promise<void>;
  advanceWinner(matchId: string, tiebreak?: Readonly<{ winnerId: string; note: string }>): Promise<void>;
  closeLeague(competitionId: string, decision?: Readonly<{ championId: string; note: string }>): Promise<void>;
  generateSupercup(input: SupercupInput): Promise<void>;
}
export type SupercupInput = Readonly<{
  competitionId: string;
  leagueId: string;
  cupId: string;
  scheduledAt: string;
  opponentTeamId?: string;
}>;

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw new Error("El backend devolvió una fila inválida.");
  return value as Record<string, unknown>;
}
function text(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Campo inválido: ${key}.`);
  return value;
}
function optionalText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "string") throw new Error(`Campo inválido: ${key}.`);
  return value;
}
function optionalNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "number") throw new Error(`Campo inválido: ${key}.`);
  return value;
}
function flag(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") throw new Error(`Campo inválido: ${key}.`);
  return value;
}
function oneOf<const T extends readonly string[]>(
  row: Record<string, unknown>,
  key: string,
  values: T,
): T[number] {
  const value = text(row, key);
  const found = values.find((item) => item === value);
  if (!found) throw new Error(`Valor inválido para ${key}: ${value}.`);
  return found;
}
function legs(row: Record<string, unknown>): Legs {
  const value = optionalNumber(row, "legs");
  const found = legOptions.find((item) => item === value);
  if (found === undefined) throw new Error(`Valor inválido para legs: ${String(value)}.`);
  return found;
}
function stage(row: Record<string, unknown>): KnockoutStage | null {
  return row.stage === null ? null : oneOf(row, "stage", knockoutStages);
}
function nextSlot(row: Record<string, unknown>): 1 | 2 | null {
  const value = optionalNumber(row, "next_slot");
  if (value === null) return null;
  if (value !== 1 && value !== 2) throw new Error("next_slot inválido.");
  return value;
}
const timestamp = (row: Record<string, unknown>) => ({
  created_at: text(row, "created_at"),
  updated_at: text(row, "updated_at"),
});

function season(value: unknown): Season {
  const row = record(value);
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    status: oneOf(row, "status", ["draft", "active", "completed", "archived"]),
    start_date: text(row, "start_date"),
    end_date: text(row, "end_date"),
    ...timestamp(row),
  };
}
function competition(value: unknown): Competition {
  const row = record(value);
  return {
    id: text(row, "id"),
    season_id: text(row, "season_id"),
    name: text(row, "name"),
    short_name: text(row, "short_name"),
    type: oneOf(row, "type", ["league", "cup", "supercup"]),
    legs: legs(row),
    champion_team_id: optionalText(row, "champion_team_id"),
    source_league_id: optionalText(row, "source_league_id"),
    source_cup_id: optionalText(row, "source_cup_id"),
    status: oneOf(row, "status", ["draft", "active", "completed", "archived"]),
    logo_url: optionalText(row, "logo_url"),
    ...timestamp(row),
  };
}
function entityStatus(row: Record<string, unknown>): EntityStatus {
  return oneOf(row, "status", ["active", "inactive", "archived"]);
}
function team(value: unknown): Team {
  const row = record(value);
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    short_name: text(row, "short_name"),
    code: text(row, "code"),
    country: text(row, "country"),
    country_code: text(row, "country_code"),
    logo_url: optionalText(row, "logo_url"),
    status: entityStatus(row),
    ...timestamp(row),
  };
}
function player(value: unknown): Player {
  const row = record(value);
  const position: PlayerPosition = oneOf(row, "position", ["POR", "DEF", "MED", "ATK"]);
  return {
    id: text(row, "id"),
    display_name: text(row, "display_name"),
    real_name: optionalText(row, "real_name"),
    nationality: text(row, "nationality"),
    country_code: text(row, "country_code"),
    position,
    avatar_url: optionalText(row, "avatar_url"),
    status: entityStatus(row),
    ...timestamp(row),
  };
}
function roster(value: unknown): SeasonPlayerRoster {
  const row = record(value);
  return {
    id: text(row, "id"),
    season_id: text(row, "season_id"),
    player_id: text(row, "player_id"),
    team_id: text(row, "team_id"),
    start_date: optionalText(row, "start_date"),
    end_date: optionalText(row, "end_date"),
    role: oneOf(row, "role", ["player", "captain", "loan"]),
    status: oneOf(row, "status", ["active", "completed", "released"]),
    ...timestamp(row),
  };
}
function footballMatch(value: unknown): Match {
  const row = record(value);
  const status: MatchStatus = oneOf(row, "status", [
    "scheduled",
    "live",
    "finished",
    "postponed",
    "cancelled",
  ]);
  return {
    id: text(row, "id"),
    competition_id: text(row, "competition_id"),
    season_id: text(row, "season_id"),
    home_team_id: optionalText(row, "home_team_id"),
    away_team_id: optionalText(row, "away_team_id"),
    matchday: optionalNumber(row, "matchday"),
    scheduled_at: text(row, "scheduled_at"),
    status,
    home_score: optionalNumber(row, "home_score"),
    away_score: optionalNumber(row, "away_score"),
    referee_name: optionalText(row, "referee_name"),
    stage: stage(row),
    round_order: optionalNumber(row, "round_order"),
    match_number: optionalNumber(row, "match_number"),
    next_match_id: optionalText(row, "next_match_id"),
    next_slot: nextSlot(row),
    winner_team_id: optionalText(row, "winner_team_id"),
    tiebreak_note: optionalText(row, "tiebreak_note"),
    ...timestamp(row),
  };
}
function competitionTeam(value: unknown): CompetitionTeam {
  const row = record(value);
  return {
    id: text(row, "id"),
    competition_id: text(row, "competition_id"),
    team_id: text(row, "team_id"),
    seed: optionalNumber(row, "seed"),
    created_at: text(row, "created_at"),
  };
}
function event(value: unknown): MatchEvent {
  const row = record(value);
  const event_type: MatchEventType = oneOf(row, "event_type", [
    "goal",
    "assist",
    "yellow_card",
    "red_card",
    "own_goal",
  ]);
  return {
    id: text(row, "id"),
    match_id: text(row, "match_id"),
    player_id: text(row, "player_id"),
    team_id: text(row, "team_id"),
    event_type,
    minute: optionalNumber(row, "minute"),
    related_player_id: optionalText(row, "related_player_id"),
    created_at: text(row, "created_at"),
  };
}
function appearance(value: unknown): MatchPlayerAppearance {
  const row = record(value);
  return {
    id: text(row, "id"),
    match_id: text(row, "match_id"),
    player_id: text(row, "player_id"),
    team_id: text(row, "team_id"),
    starter: flag(row, "starter"),
    created_at: text(row, "created_at"),
  };
}
function award(value: unknown): Award {
  const row = record(value);
  return {
    id: text(row, "id"),
    season_id: text(row, "season_id"),
    competition_id: optionalText(row, "competition_id"),
    award_type: oneOf(row, "award_type", ["champion", "top_scorer", "top_assister", "best_player"]),
    player_id: optionalText(row, "player_id"),
    team_id: optionalText(row, "team_id"),
    title: text(row, "title"),
    description: optionalText(row, "description"),
    created_at: text(row, "created_at"),
  };
}

async function rows(
  client: FootballSupabaseClient,
  table: FootballTable,
): Promise<readonly unknown[]> {
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error(`No se pudo leer ${table}.`);
  return data;
}

export class SupabaseFootballRepository implements FootballRepository {
  constructor(private readonly client: FootballSupabaseClient) {}
  async load(): Promise<FootballSnapshot> {
    const [
      seasons,
      competitions,
      teams,
      players,
      rosters,
      enrollments,
      matches,
      events,
      appearances,
      awards,
    ] = await Promise.all([
        rows(this.client, "seasons"),
        rows(this.client, "competitions"),
        rows(this.client, "teams"),
        rows(this.client, "players"),
        rows(this.client, "season_player_rosters"),
        rows(this.client, "competition_teams"),
        rows(this.client, "matches"),
        rows(this.client, "match_events"),
        rows(this.client, "match_player_appearances"),
        rows(this.client, "awards"),
      ]);
    return {
      seasons: seasons.map(season),
      competitions: competitions.map(competition),
      teams: teams.map(team),
      players: players.map(player),
      rosters: rosters.map(roster),
      competitionTeams: enrollments.map(competitionTeam),
      matches: matches.map(footballMatch),
      events: events.map(event),
      appearances: appearances.map(appearance),
      awards: awards.map(award),
    };
  }
  async create(table: FootballTable, payload: MutationPayload): Promise<void> {
    const { error } = await this.client.from(table).insert(payload);
    if (error) throw new Error(error.message);
  }
  async update(table: FootballTable, id: string, payload: MutationPayload): Promise<void> {
    const { error } = await this.client.from(table).update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  }
  async remove(table: FootballTable, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }
  async createMany(table: FootballTable, payloads: readonly MutationPayload[]): Promise<void> {
    const { error } = await this.client.from(table).insert([...payloads]);
    if (error) throw new Error(error.message);
  }
  async advanceWinner(
    matchId: string,
    tiebreak?: Readonly<{ winnerId: string; note: string }>,
  ): Promise<void> {
    const { error } = await this.client.rpc("advance_knockout_winner", {
      target_match_id: matchId,
      p_tiebreak_winner_id: tiebreak?.winnerId ?? null,
      p_tiebreak_note: tiebreak?.note ?? null,
    });
    if (error) throw new Error(error.message);
  }
  async closeLeague(
    competitionId: string,
    decision?: Readonly<{ championId: string; note: string }>,
  ): Promise<void> {
    const { error } = await this.client.rpc("close_league", {
      target_competition_id: competitionId,
      p_champion_team_id: decision?.championId ?? null,
      p_note: decision?.note ?? null,
    });
    if (error) throw new Error(error.message);
  }
  async generateSupercup(input: SupercupInput): Promise<void> {
    const { error } = await this.client.rpc("generate_supercup", {
      target_competition_id: input.competitionId,
      p_league_id: input.leagueId,
      p_cup_id: input.cupId,
      p_scheduled_at: input.scheduledAt,
      p_opponent_team_id: input.opponentTeamId ?? null,
    });
    if (error) throw new Error(error.message);
  }
}
