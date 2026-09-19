import type { RacingSupabaseClient } from "./supabase";
import type {
  Circuit,
  Driver,
  GrandPrixEvent,
  MutationPayload,
  PointsScaleEntry,
  QualifyingResult,
  RaceResult,
  RacingSnapshot,
  ResultConfirmation,
  RacingTable,
  Season,
  SeasonDriverEntry,
  Team,
} from "../domain/model";

export interface RacingRepository {
  load(): Promise<RacingSnapshot>;
  create(table: RacingTable, payload: MutationPayload): Promise<void>;
  update(table: RacingTable, id: string, payload: MutationPayload): Promise<void>;
  remove(table: RacingTable, id: string): Promise<void>;
  confirmResults(grandPrixId: string): Promise<void>;
  reopenResults(grandPrixId: string, reason: string): Promise<void>;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("El backend devolvió una fila inválida.");
  }
  return value as Record<string, unknown>;
}

function string(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== "string") throw new Error(`Campo inválido: ${key}.`);
  return value;
}

function nullableString(row: Record<string, unknown>, key: string): string | null {
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

function nullableNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null) return null;
  if (typeof value !== "number") throw new Error(`Campo inválido: ${key}.`);
  return value;
}

function boolean(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") throw new Error(`Campo inválido: ${key}.`);
  return value;
}

// numeric(6,2) puede llegar como número o cadena según el transporte.
function numeric(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  const parsed = typeof value === "string" ? Number(value) : value;
  if (typeof parsed !== "number" || Number.isNaN(parsed)) throw new Error(`Campo inválido: ${key}.`);
  return parsed;
}

function nullableNumeric(row: Record<string, unknown>, key: string): number | null {
  return row[key] === null ? null : numeric(row, key);
}

const timestamps = (row: Record<string, unknown>) => ({
  created_at: string(row, "created_at"),
  updated_at: string(row, "updated_at"),
});

function season(value: unknown): Season {
  const row = record(value);
  return {
    id: string(row, "id"), name: string(row, "name"), slug: string(row, "slug"),
    year: nullableNumber(row, "year"), status: string(row, "status") as Season["status"],
    start_date: string(row, "start_date"), end_date: string(row, "end_date"), ...timestamps(row),
  };
}

function driver(value: unknown): Driver {
  const row = record(value);
  return {
    id: string(row, "id"), display_name: string(row, "display_name"), real_name: nullableString(row, "real_name"),
    nationality: string(row, "nationality"), country_code: string(row, "country_code"),
    racing_number: nullableNumber(row, "racing_number"), avatar_url: nullableString(row, "avatar_url"),
    date_of_birth: nullableString(row, "date_of_birth"), status: string(row, "status") as Driver["status"], ...timestamps(row),
  };
}

function team(value: unknown): Team {
  const row = record(value);
  return {
    id: string(row, "id"), name: string(row, "name"), short_name: string(row, "short_name"), code: string(row, "code"),
    country: string(row, "country"), country_code: string(row, "country_code"), logo_url: nullableString(row, "logo_url"),
    primary_color: nullableString(row, "primary_color"), secondary_color: nullableString(row, "secondary_color"),
    status: string(row, "status") as Team["status"], ...timestamps(row),
  };
}

function entry(value: unknown): SeasonDriverEntry {
  const row = record(value);
  return {
    id: string(row, "id"), season_id: string(row, "season_id"), driver_id: string(row, "driver_id"), team_id: string(row, "team_id"),
    racing_number: nullableNumber(row, "racing_number"), role: string(row, "role") as SeasonDriverEntry["role"],
    status: string(row, "status") as SeasonDriverEntry["status"], start_date: nullableString(row, "start_date"),
    end_date: nullableString(row, "end_date"), ...timestamps(row),
  };
}

function circuit(value: unknown): Circuit {
  const row = record(value);
  return {
    id: string(row, "id"), name: string(row, "name"), slug: string(row, "slug"), short_name: nullableString(row, "short_name"),
    country: string(row, "country"), country_code: string(row, "country_code"), city: nullableString(row, "city"),
    image_url: nullableString(row, "image_url"), length_km: nullableNumber(row, "length_km"), default_laps: number(row, "default_laps"),
    status: string(row, "status") as Circuit["status"], ...timestamps(row),
  };
}

function grandPrix(value: unknown): GrandPrixEvent {
  const row = record(value);
  return {
    id: string(row, "id"), season_id: string(row, "season_id"), circuit_id: string(row, "circuit_id"), name: string(row, "name"),
    slug: string(row, "slug"), round_number: number(row, "round_number"), scheduled_date: string(row, "scheduled_date"), race_laps: nullableNumber(row, "race_laps"),
    status: string(row, "status") as GrandPrixEvent["status"], ...timestamps(row),
  };
}

function pointsScaleEntry(value: unknown): PointsScaleEntry {
  const row = record(value);
  return {
    id: string(row, "id"), season_id: string(row, "season_id"), race_position: number(row, "race_position"),
    points: numeric(row, "points"), ...timestamps(row),
  };
}

function qualifying(value: unknown): QualifyingResult {
  const row = record(value);
  return {
    id: string(row, "id"), grand_prix_id: string(row, "grand_prix_id"), driver_id: string(row, "driver_id"), team_id: string(row, "team_id"),
    attempt_1_status: string(row, "attempt_1_status") as QualifyingResult["attempt_1_status"], attempt_1_ms: nullableNumber(row, "attempt_1_ms"),
    attempt_2_status: string(row, "attempt_2_status") as QualifyingResult["attempt_2_status"], attempt_2_ms: nullableNumber(row, "attempt_2_ms"),
    best_time_ms: nullableNumber(row, "best_time_ms"), ...timestamps(row),
  };
}

function raceResult(value: unknown): RaceResult {
  const row = record(value);
  return {
    id: string(row, "id"), grand_prix_id: string(row, "grand_prix_id"), driver_id: string(row, "driver_id"), team_id: string(row, "team_id"),
    grid_position: nullableNumber(row, "grid_position"), status: string(row, "status") as RaceResult["status"],
    final_position: nullableNumber(row, "final_position"), laps_completed: number(row, "laps_completed"),
    total_time_ms: nullableNumber(row, "total_time_ms"), pit_stop_completed: boolean(row, "pit_stop_completed"),
    pit_stop_lap: nullableNumber(row, "pit_stop_lap"), pit_resolution_note: nullableString(row, "pit_resolution_note"),
    points: nullableNumeric(row, "points"), ...timestamps(row),
  };
}

function confirmation(value: unknown): ResultConfirmation {
  const row = record(value);
  return { id: string(row, "id"), grand_prix_id: string(row, "grand_prix_id"), confirmed_at: string(row, "confirmed_at") };
}

async function rows(client: RacingSupabaseClient, table: RacingTable | "grand_prix_result_confirmations"): Promise<readonly unknown[]> {
  const { data, error } = await client.from(table).select("*");
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error(`No se pudo leer ${table}.`);
  return data;
}

export class SupabaseRacingRepository implements RacingRepository {
  constructor(private readonly client: RacingSupabaseClient) {}

  async load(): Promise<RacingSnapshot> {
    const [seasons, drivers, teams, entries, circuits, grandPrixEvents, scale, qualifyingRows, raceRows, confirmationRows] = await Promise.all([
      rows(this.client, "seasons"), rows(this.client, "drivers"), rows(this.client, "teams"),
      rows(this.client, "season_driver_entries"), rows(this.client, "circuits"), rows(this.client, "grand_prix_events"),
      rows(this.client, "points_scale"), rows(this.client, "qualifying_results"), rows(this.client, "race_results"),
      rows(this.client, "grand_prix_result_confirmations"),
    ]);
    return {
      seasons: seasons.map(season), drivers: drivers.map(driver), teams: teams.map(team), entries: entries.map(entry),
      circuits: circuits.map(circuit), grandPrix: grandPrixEvents.map(grandPrix), pointsScale: scale.map(pointsScaleEntry),
      qualifying: qualifyingRows.map(qualifying), raceResults: raceRows.map(raceResult), confirmations: confirmationRows.map(confirmation),
    };
  }

  async create(table: RacingTable, payload: MutationPayload): Promise<void> {
    const { error } = await this.client.from(table).insert(payload);
    if (error) throw new Error(error.message);
  }

  async update(table: RacingTable, id: string, payload: MutationPayload): Promise<void> {
    const { error } = await this.client.from(table).update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  }

  async remove(table: RacingTable, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  async confirmResults(grandPrixId: string): Promise<void> {
    const { error } = await this.client.rpc("confirm_grand_prix_results", { p_grand_prix_id: grandPrixId });
    if (error) throw new Error(error.message);
  }

  async reopenResults(grandPrixId: string, reason: string): Promise<void> {
    const { error } = await this.client.rpc("reopen_grand_prix_results", { p_grand_prix_id: grandPrixId, p_reason: reason });
    if (error) throw new Error(error.message);
  }
}
