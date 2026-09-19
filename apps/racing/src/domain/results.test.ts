import { describe, expect, it } from "vitest";
import { emptySnapshot, type QualifyingResult, type RaceResult, type RacingSnapshot } from "./model";
import {
  bestValidTime,
  buildGrid,
  confirmationIssues,
  driverStandings,
  formatLapTime,
  pitCompliance,
  teamStandings,
} from "./results";

const timestamps = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

const qualifying = (driver: string, a1: [QualifyingResult["attempt_1_status"], number | null], a2: [QualifyingResult["attempt_2_status"], number | null]): QualifyingResult => ({
  id: driver, grand_prix_id: "gp", driver_id: driver, team_id: "team",
  attempt_1_status: a1[0], attempt_1_ms: a1[1], attempt_2_status: a2[0], attempt_2_ms: a2[1], best_time_ms: null, ...timestamps,
});

const race = (overrides: Partial<RaceResult> & Pick<RaceResult, "driver_id">): RaceResult => ({
  id: `${overrides.grand_prix_id ?? "gp"}-${overrides.driver_id}`, grand_prix_id: "gp", team_id: "team", grid_position: null, status: "finished",
  final_position: 1, laps_completed: 6, total_time_ms: null, pit_stop_completed: true, pit_stop_lap: 3, pit_resolution_note: null, points: 0, ...timestamps, ...overrides,
});

describe("clasificación", () => {
  it("usa el mejor de dos intentos válidos", () => {
    expect(bestValidTime(qualifying("a", ["valid", 83000], ["valid", 82500]))).toBe(82500);
  });

  it("ignora intentos inválidos aunque conserven tiempo", () => {
    expect(bestValidTime(qualifying("a", ["invalid", 70000], ["valid", 84000]))).toBe(84000);
  });

  it("no hay mejor tiempo sin intentos válidos", () => {
    expect(bestValidTime(qualifying("a", ["invalid", null], ["not_recorded", null]))).toBeNull();
  });

  it("ordena la parrilla por mejor tiempo y deja sin tiempo al final", () => {
    const grid = buildGrid([
      qualifying("sin-tiempo", ["not_recorded", null], ["invalid", null]),
      qualifying("lento", ["valid", 90000], ["not_recorded", null]),
      qualifying("rapido", ["valid", 88000], ["valid", 85000]),
    ]);
    expect(grid.map(({ driver_id }) => driver_id)).toEqual(["rapido", "lento", "sin-tiempo"]);
    expect(grid.map(({ position }) => position)).toEqual([1, 2, 3]);
  });

  it("desempata por el segundo tiempo válido y luego de forma determinista", () => {
    const grid = buildGrid([
      qualifying("b", ["valid", 80000], ["valid", 81000]),
      qualifying("a", ["valid", 80000], ["valid", 80500]),
      qualifying("c", ["valid", 80000], ["not_recorded", null]),
    ]);
    expect(grid.map(({ driver_id }) => driver_id)).toEqual(["a", "b", "c"]);
    const tied = buildGrid([qualifying("z", ["valid", 80000], ["not_recorded", null]), qualifying("y", ["valid", 80000], ["not_recorded", null])]);
    expect(tied.map(({ driver_id }) => driver_id)).toEqual(["y", "z"]);
  });

  it("formatea milisegundos como tiempo de vuelta", () => {
    expect(formatLapTime(83456)).toBe("1:23.456");
    expect(formatLapTime(5_025_007)).toBe("1:23:45.007");
    expect(formatLapTime(null)).toBe("—");
  });
});

describe("pit stop obligatorio", () => {
  it("identifica cumplimiento, incumplimiento y resolución sin inventar sanciones", () => {
    expect(pitCompliance(race({ driver_id: "a" }))).toBe("completed");
    expect(pitCompliance(race({ driver_id: "a", pit_stop_completed: false, pit_stop_lap: null }))).toBe("missing");
    expect(pitCompliance(race({ driver_id: "a", pit_stop_completed: false, pit_stop_lap: null, pit_resolution_note: "Resuelto por reglamento" }))).toBe("resolved");
    expect(pitCompliance(race({ driver_id: "a", status: "dnf", final_position: null, pit_stop_completed: false, pit_stop_lap: null }))).toBe("not_applicable");
  });

  it("bloquea la confirmación mientras exista un incumplimiento sin resolver", () => {
    const results = [
      race({ driver_id: "a", final_position: 1 }),
      race({ driver_id: "b", final_position: 2, pit_stop_completed: false, pit_stop_lap: null }),
    ];
    expect(confirmationIssues(results, 6).join(" ")).toMatch(/parada obligatoria/);
    const resolved = [results[0] as RaceResult, race({ driver_id: "b", final_position: 2, pit_stop_completed: false, pit_stop_lap: null, pit_resolution_note: "Resolución" })];
    expect(confirmationIssues(resolved, 6)).toEqual([]);
  });

  it("exige posiciones finales únicas y consecutivas", () => {
    expect(confirmationIssues([race({ driver_id: "a", final_position: 1 }), race({ driver_id: "b", final_position: 3 })], 6)).not.toEqual([]);
    expect(confirmationIssues([race({ driver_id: "a", final_position: 1 }), race({ driver_id: "b", final_position: 1 })], 6)).not.toEqual([]);
    expect(confirmationIssues([], 6)).not.toEqual([]);
  });
});

describe("campeonato", () => {
  const base = (): RacingSnapshot => ({
    ...emptySnapshot,
    drivers: ["ana", "beto", "carla"].map((id) => ({ id, display_name: id, real_name: null, nationality: "X", country_code: "XX", racing_number: null, avatar_url: null, date_of_birth: null, status: "active" as const, ...timestamps })),
    teams: ["rojo", "azul"].map((id) => ({ id, name: id, short_name: id, code: id.toUpperCase(), country: "X", country_code: "XX", logo_url: null, primary_color: null, secondary_color: null, status: "active" as const, ...timestamps })),
    grandPrix: ["gp1", "gp2", "gp3"].map((id, index) => ({ id, season_id: "s1", circuit_id: "c", name: id, slug: id, round_number: index + 1, scheduled_date: "2026-01-01", race_laps: null, status: "completed" as const, ...timestamps })),
    confirmations: [
      { id: "c1", grand_prix_id: "gp1", confirmed_at: "2026-01-02T00:00:00Z" },
      { id: "c2", grand_prix_id: "gp2", confirmed_at: "2026-01-03T00:00:00Z" },
    ],
  });

  it("suma solo resultados confirmados y conserva el equipo de cada GP tras una transferencia", () => {
    const snapshot: RacingSnapshot = {
      ...base(),
      raceResults: [
        race({ grand_prix_id: "gp1", driver_id: "ana", team_id: "rojo", final_position: 1, points: 25 }),
        race({ grand_prix_id: "gp1", driver_id: "beto", team_id: "azul", final_position: 2, points: 18 }),
        // Ana se transfiere a azul en la segunda carrera.
        race({ grand_prix_id: "gp2", driver_id: "ana", team_id: "azul", final_position: 2, points: 18 }),
        race({ grand_prix_id: "gp2", driver_id: "beto", team_id: "azul", final_position: 1, points: 25 }),
        // Borrador: GP sin confirmar, no cuenta.
        race({ grand_prix_id: "gp3", driver_id: "carla", team_id: "rojo", final_position: 1, points: 25 }),
      ],
    };
    const drivers = driverStandings(snapshot, "s1");
    expect(drivers.map(({ id, points }) => [id, points])).toEqual([["ana", 43], ["beto", 43]]);
    const teams = teamStandings(snapshot, "s1");
    expect(teams.map(({ id, points }) => [id, points])).toEqual([["azul", 61], ["rojo", 25]]);
  });

  it("desempata por victorias y luego por mejores posiciones", () => {
    const snapshot: RacingSnapshot = {
      ...base(),
      raceResults: [
        race({ grand_prix_id: "gp1", driver_id: "ana", final_position: 1, points: 10 }),
        race({ grand_prix_id: "gp1", driver_id: "beto", final_position: 2, points: 10 }),
        race({ grand_prix_id: "gp2", driver_id: "ana", final_position: 3, points: 10 }),
        race({ grand_prix_id: "gp2", driver_id: "beto", final_position: 2, points: 10 }),
      ],
    };
    expect(driverStandings(snapshot, "s1").map(({ id }) => id)).toEqual(["ana", "beto"]);
    expect(driverStandings(snapshot, "s1")[0]?.wins).toBe(1);
  });

  it("los no clasificados suman cero y quedan por nombre en empates totales", () => {
    const snapshot: RacingSnapshot = {
      ...base(),
      raceResults: [
        race({ grand_prix_id: "gp1", driver_id: "carla", status: "dnf", final_position: null, points: 0 }),
        race({ grand_prix_id: "gp1", driver_id: "ana", status: "dns", final_position: null, laps_completed: 0, pit_stop_completed: false, pit_stop_lap: null, points: 0 }),
      ],
    };
    expect(driverStandings(snapshot, "s1").map(({ id }) => id)).toEqual(["ana", "carla"]);
  });
});
