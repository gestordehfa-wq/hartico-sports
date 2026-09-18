import { describe, expect, it } from "vitest";
import type { GrandPrixEvent, Season } from "./model";
import { activeSeason, nextGrandPrix, orderedCalendar, validateDateRange, validateRound } from "./rules";

const timestamps = { created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

describe("reglas de temporada", () => {
  it("encuentra la temporada activa", () => {
    const seasons: Season[] = [
      { id: "1", name: "Anterior", slug: "anterior", year: 2025, status: "completed", start_date: "2025-01-01", end_date: "2025-12-01", ...timestamps },
      { id: "2", name: "Actual", slug: "actual", year: null, status: "active", start_date: "2026-03-01", end_date: "2027-02-01", ...timestamps },
    ];
    expect(activeSeason(seasons)?.id).toBe("2");
  });

  it("valida rangos de fecha", () => {
    expect(validateDateRange("2026-04-01", "2026-03-01")).toMatch(/inicial/);
    expect(validateDateRange("2026-03-01", "2026-04-01")).toBeNull();
  });
});

describe("calendario", () => {
  const event = (id: string, round: number, date: string, status: GrandPrixEvent["status"] = "scheduled"): GrandPrixEvent => ({
    id,
    season_id: "season",
    circuit_id: "circuit",
    name: `GP ${id}`,
    slug: `gp-${id}`,
    round_number: round,
    scheduled_date: date,
    race_laps: null,
    status,
    ...timestamps,
  });

  it("ordena por ronda y luego fecha", () => {
    expect(orderedCalendar([event("2", 2, "2026-04-01"), event("1", 1, "2026-05-01")]).map(({ id }) => id)).toEqual(["1", "2"]);
  });

  it("omite eventos cancelados al buscar el próximo", () => {
    expect(nextGrandPrix([event("x", 1, "2026-05-01", "cancelled"), event("y", 2, "2026-06-01")], "2026-04-01")?.id).toBe("y");
  });

  it("rechaza rondas inválidas", () => {
    expect(validateRound(0)).not.toBeNull();
    expect(validateRound(1)).toBeNull();
  });
});
