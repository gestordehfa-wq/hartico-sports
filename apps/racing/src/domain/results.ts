import type {
  GrandPrixEvent,
  QualifyingResult,
  RaceResult,
  RacingSnapshot,
} from "./model";

// Reglas puras de Racing v0.2: clasificación, parrilla, pits y campeonato.
// Reflejan las restricciones de la migración 008; la base de datos es la
// autoridad final y estas funciones solo ofrecen feedback previo y vistas.

type Attempt = Readonly<{ status: QualifyingResult["attempt_1_status"]; ms: number | null }>;

export function validAttemptTimes(result: Pick<QualifyingResult, "attempt_1_status" | "attempt_1_ms" | "attempt_2_status" | "attempt_2_ms">): readonly number[] {
  const attempts: readonly Attempt[] = [
    { status: result.attempt_1_status, ms: result.attempt_1_ms },
    { status: result.attempt_2_status, ms: result.attempt_2_ms },
  ];
  return attempts
    .flatMap((attempt) => (attempt.status === "valid" && attempt.ms !== null ? [attempt.ms] : []))
    .sort((left, right) => left - right);
}

export function bestValidTime(result: Parameters<typeof validAttemptTimes>[0]): number | null {
  return validAttemptTimes(result)[0] ?? null;
}

export function formatLapTime(ms: number | null): string {
  if (ms === null) return "—";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  const millis = ms % 1000;
  const tail = `${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${tail}` : `${minutes}:${tail}`;
}

export type GridSlot = Readonly<{
  position: number;
  driver_id: string;
  team_id: string;
  best_time_ms: number | null;
}>;

/**
 * Ordena por mejor tiempo válido; desempata por el segundo tiempo válido y
 * luego por driver_id. Quien no tiene tiempo válido sale detrás de los demás.
 */
export function buildGrid(qualifying: readonly QualifyingResult[]): readonly GridSlot[] {
  const rows = qualifying.map((result) => {
    const times = validAttemptTimes(result);
    return { result, best: times[0] ?? null, second: times[1] ?? null };
  });
  const rank = (value: number | null) => value ?? Number.POSITIVE_INFINITY;
  rows.sort((left, right) => {
    const best = rank(left.best) - rank(right.best);
    if (best !== 0 && !Number.isNaN(best)) return best;
    const second = rank(left.second) - rank(right.second);
    if (second !== 0 && !Number.isNaN(second)) return second;
    return left.result.driver_id.localeCompare(right.result.driver_id);
  });
  return rows.map(({ result, best }, index) => ({
    position: index + 1,
    driver_id: result.driver_id,
    team_id: result.team_id,
    best_time_ms: best,
  }));
}

export function raceLapsFor(event: GrandPrixEvent, circuitDefaultLaps: number): number {
  return event.race_laps ?? circuitDefaultLaps;
}

export type PitCompliance = "not_applicable" | "completed" | "missing" | "resolved";

export function pitCompliance(result: Pick<RaceResult, "status" | "pit_stop_completed" | "pit_resolution_note">): PitCompliance {
  if (result.pit_stop_completed) return "completed";
  if (result.status !== "finished") return "not_applicable";
  return result.pit_resolution_note?.trim() ? "resolved" : "missing";
}

export const pitComplianceLabels: Readonly<Record<PitCompliance, string>> = {
  not_applicable: "No aplica",
  completed: "Cumplida",
  missing: "Incumplimiento sin resolver",
  resolved: "Incumplimiento resuelto",
};

/** Motivos por los que un Gran Premio aún no puede confirmarse. */
export function confirmationIssues(results: readonly RaceResult[], raceLaps: number): readonly string[] {
  const issues: string[] = [];
  const finished = results.filter((result) => result.status === "finished");
  if (finished.length === 0) issues.push("No hay pilotos clasificados como finished.");
  const positions = finished.map((result) => result.final_position).sort((a, b) => (a ?? 0) - (b ?? 0));
  if (positions.some((position, index) => position !== index + 1)) {
    issues.push("Las posiciones finales deben ser únicas y consecutivas desde 1.");
  }
  const missingPit = finished.filter((result) => pitCompliance(result) === "missing").length;
  if (missingPit > 0) {
    issues.push(`${missingPit} piloto(s) finalizaron sin parada obligatoria y requieren resolución administrativa.`);
  }
  if (results.some((result) => result.laps_completed > raceLaps)) {
    issues.push(`Hay vueltas completadas superiores a las ${raceLaps} de la carrera.`);
  }
  return issues;
}

export function isConfirmed(snapshot: Pick<RacingSnapshot, "confirmations">, grandPrixId: string): boolean {
  return snapshot.confirmations.some((confirmation) => confirmation.grand_prix_id === grandPrixId);
}

export function classifiedResults(results: readonly RaceResult[]): readonly RaceResult[] {
  const order = { finished: 0, dnf: 1, dsq: 2, dns: 3 } as const;
  return [...results].sort(
    (left, right) =>
      order[left.status] - order[right.status] ||
      (left.final_position ?? 999) - (right.final_position ?? 999) ||
      right.laps_completed - left.laps_completed ||
      left.driver_id.localeCompare(right.driver_id),
  );
}

export type StandingRow = Readonly<{
  id: string;
  name: string;
  points: number;
  wins: number;
  podiums: number;
  races: number;
  teamIds: readonly string[];
}>;

type Accumulator = { id: string; name: string; points: number; positions: number[]; races: number; teamIds: Set<string> };

function compareStandings(left: Accumulator, right: Accumulator): number {
  if (left.points !== right.points) return right.points - left.points;
  const depth = Math.max(left.positions.length, right.positions.length);
  for (let index = 0; index < depth; index += 1) {
    const difference = (right.positions[index] ?? 0) - (left.positions[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.name.localeCompare(right.name) || left.id.localeCompare(right.id);
}

function standings(
  results: readonly RaceResult[],
  keyOf: (result: RaceResult) => string,
  nameOf: (key: string) => string,
): readonly StandingRow[] {
  const table = new Map<string, Accumulator>();
  for (const result of results) {
    const key = keyOf(result);
    const row = table.get(key) ?? { id: key, name: nameOf(key), points: 0, positions: [], races: 0, teamIds: new Set<string>() };
    row.points += result.points ?? 0;
    row.races += 1;
    row.teamIds.add(result.team_id);
    if (result.status === "finished" && result.final_position !== null) {
      row.positions[result.final_position - 1] = (row.positions[result.final_position - 1] ?? 0) + 1;
    }
    table.set(key, row);
  }
  return [...table.values()].sort(compareStandings).map((row) => ({
    id: row.id,
    name: row.name,
    points: row.points,
    wins: row.positions[0] ?? 0,
    podiums: (row.positions[0] ?? 0) + (row.positions[1] ?? 0) + (row.positions[2] ?? 0),
    races: row.races,
    teamIds: [...row.teamIds],
  }));
}

/** Resultados confirmados de una temporada; el equipo proviene de cada resultado, no de la participación actual. */
export function confirmedSeasonResults(snapshot: RacingSnapshot, seasonId: string): readonly RaceResult[] {
  const confirmedEvents = new Set(
    snapshot.grandPrix
      .filter((event) => event.season_id === seasonId && isConfirmed(snapshot, event.id))
      .map(({ id }) => id),
  );
  return snapshot.raceResults.filter((result) => confirmedEvents.has(result.grand_prix_id));
}

export function driverStandings(snapshot: RacingSnapshot, seasonId: string): readonly StandingRow[] {
  const names = new Map(snapshot.drivers.map((driver) => [driver.id, driver.display_name]));
  return standings(confirmedSeasonResults(snapshot, seasonId), (result) => result.driver_id, (id) => names.get(id) ?? id);
}

export function teamStandings(snapshot: RacingSnapshot, seasonId: string): readonly StandingRow[] {
  const names = new Map(snapshot.teams.map((team) => [team.id, team.name]));
  return standings(confirmedSeasonResults(snapshot, seasonId), (result) => result.team_id, (id) => names.get(id) ?? id);
}
