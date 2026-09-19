import type {
  Award,
  GamePoints,
  GamesBestOf,
  Match,
  MatchSet,
  MutationPayload,
  Player,
  Season,
  TennisSnapshot,
  TennisTable,
  Tournament,
  TournamentEdition,
  TournamentCategoryRecord,
  TournamentEntry,
  RankingPointRule,
} from "../domain/model";
import { gamePointValues, gamesBestOfValues, rankingReaches, scoringFormats } from "../domain/model";
import type { TennisSupabaseClient } from "./supabase";

export interface TennisRepository {
  load(): Promise<TennisSnapshot>;
  create(table: TennisTable, payload: MutationPayload): Promise<void>;
  update(table: TennisTable, id: string, payload: MutationPayload): Promise<void>;
  remove(table: TennisTable, id: string): Promise<void>;
  confirmResult(matchId: string): Promise<void>;
  generateDraw(editionId: string): Promise<void>;
  recordPoint(matchId: string, scorer: 1 | 2): Promise<void>;
  setScore(matchId: string, score: MatchScoreInput, confirm: boolean): Promise<void>;
}
export type MatchScoreInput = Readonly<{
  games1: number;
  games2: number;
  points1: number;
  points2: number;
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
function number(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== "number") throw new Error(`Campo inválido: ${key}.`);
  return value;
}
function optionalNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "number") throw new Error(`Campo inválido: ${key}.`);
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
function gamesBestOf(row: Record<string, unknown>): GamesBestOf | null {
  const value = optionalNumber(row, "games_best_of");
  if (value === null) return null;
  const found = gamesBestOfValues.find((item) => item === value);
  if (!found) throw new Error(`Valor inválido para games_best_of: ${value}.`);
  return found;
}
function gamePoints(row: Record<string, unknown>, key: string): GamePoints {
  const value = number(row, key);
  const found = gamePointValues.find((item) => item === value);
  if (found === undefined) throw new Error(`Valor inválido para ${key}: ${value}.`);
  return found;
}
const timestamps = (row: Record<string, unknown>) => ({
  created_at: text(row, "created_at"),
  updated_at: text(row, "updated_at"),
});
const parseSeason = (value: unknown): Season => {
  const row = record(value);
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    slug: text(row, "slug"),
    status: oneOf(row, "status", ["draft", "active", "completed", "archived"]),
    start_date: text(row, "start_date"),
    end_date: text(row, "end_date"),
    ...timestamps(row),
  };
};
const parsePlayer = (value: unknown): Player => {
  const row = record(value);
  const handedness = optionalText(row, "handedness");
  return {
    id: text(row, "id"),
    display_name: text(row, "display_name"),
    real_name: optionalText(row, "real_name"),
    nationality: text(row, "nationality"),
    country_code: text(row, "country_code"),
    avatar_url: optionalText(row, "avatar_url"),
    handedness: handedness === null ? null : oneOf(row, "handedness", ["right", "left"]),
    status: oneOf(row, "status", ["active", "inactive", "retired"]),
    ...timestamps(row),
  };
};
const parseTournament = (value: unknown): Tournament => {
  const row = record(value);
  return {
    id: text(row, "id"),
    name: text(row, "name"),
    short_name: text(row, "short_name"),
    logo_url: optionalText(row, "logo_url"),
    default_surface: oneOf(row, "default_surface", ["hard", "clay", "grass", "indoor", "custom"]),
    category: text(row, "category"),
    status: oneOf(row, "status", ["active", "inactive", "archived"]),
    ...timestamps(row),
  };
};
const parseEdition = (value: unknown): TournamentEdition => {
  const row = record(value);
  return {
    id: text(row, "id"),
    tournament_id: text(row, "tournament_id"),
    season_id: text(row, "season_id"),
    name: optionalText(row, "name"),
    surface: oneOf(row, "surface", ["hard", "clay", "grass", "indoor", "custom"]),
    start_date: text(row, "start_date"),
    end_date: text(row, "end_date"),
    status: oneOf(row, "status", ["draft", "registration", "active", "completed", "cancelled"]),
    draw_size: number(row, "draw_size"),
    best_of: number(row, "best_of"),
    scoring_format: oneOf(row, "scoring_format", scoringFormats),
    games_best_of: gamesBestOf(row),
    ...timestamps(row),
  };
};
const parseEntry = (value: unknown): TournamentEntry => {
  const row = record(value);
  return {
    id: text(row, "id"),
    tournament_edition_id: text(row, "tournament_edition_id"),
    player_id: text(row, "player_id"),
    seed: optionalNumber(row, "seed"),
    entry_status: oneOf(row, "entry_status", [
      "registered",
      "active",
      "withdrawn",
      "eliminated",
      "champion",
    ]),
    created_at: text(row, "created_at"),
  };
};
const parseMatch = (value: unknown): Match => {
  const row = record(value);
  const nextSlot = optionalNumber(row, "next_slot");
  if (nextSlot !== null && nextSlot !== 1 && nextSlot !== 2) throw new Error("next_slot inválido.");
  return {
    id: text(row, "id"),
    tournament_edition_id: text(row, "tournament_edition_id"),
    round: oneOf(row, "round", ["round_of_16", "quarterfinal", "semifinal", "final"]),
    round_order: number(row, "round_order"),
    match_number: number(row, "match_number"),
    player1_id: optionalText(row, "player1_id"),
    player2_id: optionalText(row, "player2_id"),
    scheduled_at: optionalText(row, "scheduled_at"),
    status: oneOf(row, "status", [
      "scheduled",
      "in_progress",
      "finished",
      "walkover",
      "retired",
      "cancelled",
    ]),
    winner_id: optionalText(row, "winner_id"),
    next_match_id: optionalText(row, "next_match_id"),
    next_slot: nextSlot,
    best_of: number(row, "best_of"),
    scoring_format: oneOf(row, "scoring_format", scoringFormats),
    games_best_of: gamesBestOf(row),
    player1_games: number(row, "player1_games"),
    player2_games: number(row, "player2_games"),
    player1_points: gamePoints(row, "player1_points"),
    player2_points: gamePoints(row, "player2_points"),
    ...timestamps(row),
  };
};
const parseSet = (value: unknown): MatchSet => {
  const row = record(value);
  return {
    id: text(row, "id"),
    match_id: text(row, "match_id"),
    set_number: number(row, "set_number"),
    player1_score: number(row, "player1_score"),
    player2_score: number(row, "player2_score"),
    ...timestamps(row),
  };
};
const parseCategory = (value: unknown): TournamentCategoryRecord => {
  const row = record(value);
  return {
    id: text(row, "id"),
    code: text(row, "code"),
    name: text(row, "name"),
    sort_order: number(row, "sort_order"),
    ...timestamps(row),
  };
};
const parseRankingRule = (value: unknown): RankingPointRule => {
  const row = record(value);
  return {
    id: text(row, "id"),
    category: text(row, "category"),
    reached: oneOf(row, "reached", rankingReaches),
    points: number(row, "points"),
    ...timestamps(row),
  };
};
const parseAward = (value: unknown): Award => {
  const row = record(value);
  return {
    id: text(row, "id"),
    season_id: text(row, "season_id"),
    tournament_edition_id: optionalText(row, "tournament_edition_id"),
    player_id: text(row, "player_id"),
    award_type: oneOf(row, "award_type", [
      "season_mvp",
      "best_player",
      "revelation",
      "tournament_mvp",
    ]),
    title: text(row, "title"),
    description: optionalText(row, "description"),
    created_at: text(row, "created_at"),
  };
};

const tables = [
  "seasons",
  "players",
  "tournaments",
  "tournament_editions",
  "tournament_entries",
  "matches",
  "match_sets",
  "tournament_categories",
  "ranking_point_rules",
  "awards",
] as const;
export class SupabaseTennisRepository implements TennisRepository {
  constructor(private readonly client: TennisSupabaseClient) {}
  async load(): Promise<TennisSnapshot> {
    const results = await Promise.all(
      tables.map(async (table) => {
        const { data, error } = await this.client.from(table).select("*");
        if (error) throw error;
        return data ?? [];
      }),
    );
    return {
      seasons: (results[0] ?? []).map(parseSeason),
      players: (results[1] ?? []).map(parsePlayer),
      tournaments: (results[2] ?? []).map(parseTournament),
      editions: (results[3] ?? []).map(parseEdition),
      entries: (results[4] ?? []).map(parseEntry),
      matches: (results[5] ?? []).map(parseMatch),
      sets: (results[6] ?? []).map(parseSet),
      categories: (results[7] ?? []).map(parseCategory),
      rankingRules: (results[8] ?? []).map(parseRankingRule),
      awards: (results[9] ?? []).map(parseAward),
    };
  }
  async create(table: TennisTable, payload: MutationPayload): Promise<void> {
    const { error } = await this.client.from(table).insert(payload);
    if (error) throw error;
  }
  async update(table: TennisTable, id: string, payload: MutationPayload): Promise<void> {
    const { error } = await this.client.from(table).update(payload).eq("id", id);
    if (error) throw error;
  }
  async remove(table: TennisTable, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw error;
  }
  async confirmResult(matchId: string): Promise<void> {
    const { error } = await this.client.rpc("confirm_match_result", { target_match_id: matchId });
    if (error) throw error;
  }
  async recordPoint(matchId: string, scorer: 1 | 2): Promise<void> {
    const { error } = await this.client.rpc("record_match_point", {
      target_match_id: matchId,
      scorer_slot: scorer,
    });
    if (error) throw error;
  }
  async setScore(matchId: string, score: MatchScoreInput, confirm: boolean): Promise<void> {
    const { error } = await this.client.rpc("set_match_score", {
      target_match_id: matchId,
      p1_games: score.games1,
      p2_games: score.games2,
      p1_points: score.points1,
      p2_points: score.points2,
      confirm_result: confirm,
    });
    if (error) throw error;
  }
  async generateDraw(editionId: string): Promise<void> {
    const { error } = await this.client.rpc("generate_tournament_draw", {
      target_edition_id: editionId,
    });
    if (error) throw error;
  }
}
