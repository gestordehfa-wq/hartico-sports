import type {
  GrandPrixEvent,
  RacingSnapshot,
  Season,
  SeasonDriverEntry,
} from "./model";

export function activeSeason(seasons: readonly Season[]): Season | null {
  return seasons.find((season) => season.status === "active") ?? null;
}

export function orderedCalendar(events: readonly GrandPrixEvent[]): readonly GrandPrixEvent[] {
  return [...events].sort(
    (left, right) =>
      left.round_number - right.round_number || left.scheduled_date.localeCompare(right.scheduled_date),
  );
}

export function currentEntries(
  snapshot: RacingSnapshot,
  seasonId: string,
  onDate: string = new Date().toISOString().slice(0, 10),
): readonly SeasonDriverEntry[] {
  return snapshot.entries.filter(
    (entry) =>
      entry.season_id === seasonId &&
      entry.status === "active" &&
      (entry.start_date === null || entry.start_date <= onDate) &&
      (entry.end_date === null || entry.end_date >= onDate),
  );
}

export function nextGrandPrix(
  events: readonly GrandPrixEvent[],
  today: string = new Date().toISOString().slice(0, 10),
): GrandPrixEvent | null {
  return (
    orderedCalendar(events).find(
      (event) =>
        event.scheduled_date >= today &&
        event.status !== "cancelled" &&
        event.status !== "completed",
    ) ?? null
  );
}

export function validateDateRange(start: string | null, end: string | null): string | null {
  if (start && end && start > end) return "La fecha inicial no puede ser posterior a la final.";
  return null;
}

export function validateRound(round: number): string | null {
  return Number.isInteger(round) && round > 0 ? null : "La ronda debe ser un entero positivo.";
}

export function validateRacingNumber(number: number | null): string | null {
  return number === null || (Number.isInteger(number) && number >= 0 && number <= 999)
    ? null
    : "El número debe estar entre 0 y 999.";
}
