import type {
  Match,
  Player,
  RankingPointRule,
  RankingReach,
  TennisSnapshot,
  TournamentCategory,
  TournamentEdition,
} from "./model";

// Ranking inspirado en el ATP (sin datos ni reglamento ATP reales): puntos por
// categoría y ronda alcanzada, acumulados sobre las últimas 52 semanas.
// Se deriva de partidos confirmados y de reglas configurables, por lo que se
// actualiza en cuanto una edición pasa a `completed`.

export const rankingWindowDays = 364; // 52 semanas

export type RankingRow = Readonly<{
  rank: number;
  player: Player;
  points: number;
  tournamentsPlayed: number;
  titles: number;
  finals: number;
  previousRank?: number | null;
}>;
export type EditionPoints = Readonly<{
  playerId: string;
  reached: RankingReach | null;
  points: number;
}>;
export type RankingHistoryEntry = Readonly<{
  editionId: string;
  date: string;
  reached: RankingReach | null;
  rank: number | null;
  points: number;
}>;

export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export const today = (): string => new Date().toISOString().slice(0, 10);

export function pointsFor(
  rules: readonly RankingPointRule[],
  category: TournamentCategory,
  reached: RankingReach,
): number {
  return rules.find((rule) => rule.category === category && rule.reached === reached)?.points ?? 0;
}

/** Mejor ronda alcanzada por el jugador según partidos con ganador definido. */
export function reachedRound(matches: readonly Match[], playerId: string): RankingReach | null {
  const decided = matches.filter(
    (match) => match.winner_id && (match.player1_id === playerId || match.player2_id === playerId),
  );
  const final = decided.find(({ round }) => round === "final");
  if (final) return final.winner_id === playerId ? "champion" : "final";
  const loss = decided
    .filter(({ winner_id }) => winner_id !== playerId)
    .sort((a, b) => b.round_order - a.round_order)[0];
  return loss ? loss.round : null;
}

export function editionPoints(snapshot: TennisSnapshot, edition: TournamentEdition): readonly EditionPoints[] {
  const tournament = snapshot.tournaments.find(({ id }) => id === edition.tournament_id);
  if (!tournament) return [];
  const matches = snapshot.matches.filter(({ tournament_edition_id }) => tournament_edition_id === edition.id);
  return snapshot.entries
    .filter((entry) => entry.tournament_edition_id === edition.id && entry.entry_status !== "withdrawn")
    .map((entry) => {
      const reached = reachedRound(matches, entry.player_id);
      return {
        playerId: entry.player_id,
        reached,
        points: reached ? pointsFor(snapshot.rankingRules, tournament.category, reached) : 0,
      };
    });
}

/** Ediciones completadas cuyo cierre cae dentro de las 52 semanas previas a `asOf`. */
export function eligibleEditions(snapshot: TennisSnapshot, asOf: string): readonly TournamentEdition[] {
  const from = addDays(asOf, -rankingWindowDays);
  return snapshot.editions.filter(
    (edition) => edition.status === "completed" && edition.end_date <= asOf && edition.end_date > from,
  );
}

function rank(snapshot: TennisSnapshot, editions: readonly TournamentEdition[]): readonly RankingRow[] {
  const totals = new Map<string, { points: number; played: number; titles: number; finals: number }>();
  for (const edition of editions) {
    for (const result of editionPoints(snapshot, edition)) {
      const total = totals.get(result.playerId) ?? { points: 0, played: 0, titles: 0, finals: 0 };
      total.points += result.points;
      total.played += 1;
      if (result.reached === "champion") total.titles += 1;
      if (result.reached === "champion" || result.reached === "final") total.finals += 1;
      totals.set(result.playerId, total);
    }
  }
  return snapshot.players
    .flatMap((player) => {
      const total = totals.get(player.id);
      return total && (total.played > 0 || total.points > 0) ? [{ player, ...total }] : [];
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.titles - a.titles ||
        b.finals - a.finals ||
        a.player.display_name.localeCompare(b.player.display_name) ||
        a.player.id.localeCompare(b.player.id),
    )
    .map((row, index) => ({
      rank: index + 1,
      player: row.player,
      points: row.points,
      tournamentsPlayed: row.played,
      titles: row.titles,
      finals: row.finals,
    }));
}

/** Ranking general: puntos de los torneos elegibles de las últimas 52 semanas. */
export function rollingRanking(snapshot: TennisSnapshot, asOf: string = today()): readonly RankingRow[] {
  return rank(snapshot, eligibleEditions(snapshot, asOf));
}

/** Ranking de una temporada: todas sus ediciones completadas, sin ventana móvil. */
export function seasonRanking(snapshot: TennisSnapshot, seasonId: string): readonly RankingRow[] {
  return rank(
    snapshot,
    snapshot.editions.filter((edition) => edition.season_id === seasonId && edition.status === "completed"),
  );
}

/**
 * Ranking actual con la posición previa (ranking a la fecha del torneo completado
 * anterior). Sin al menos dos fechas de cierre no hay comparación (`comparedTo: null`).
 */
export function rankingWithMovement(
  snapshot: TennisSnapshot,
  asOf: string = today(),
): Readonly<{ rows: readonly RankingRow[]; comparedTo: string | null }> {
  const current = rollingRanking(snapshot, asOf);
  const dates = [
    ...new Set(
      snapshot.editions
        .filter((edition) => edition.status === "completed" && edition.end_date <= asOf)
        .map(({ end_date }) => end_date),
    ),
  ].sort();
  const previousDate = dates.length >= 2 ? dates[dates.length - 2] : undefined;
  if (!previousDate) return { rows: current, comparedTo: null };
  const previous = new Map(rollingRanking(snapshot, previousDate).map((row) => [row.player.id, row.rank]));
  return {
    rows: current.map((row) => ({ ...row, previousRank: previous.get(row.player.id) ?? null })),
    comparedTo: previousDate,
  };
}

/** Posición y puntos del jugador tras cada edición completada que disputó. */
export function rankingHistory(snapshot: TennisSnapshot, playerId: string): readonly RankingHistoryEntry[] {
  return snapshot.editions
    .filter((edition) => edition.status === "completed")
    .filter((edition) =>
      snapshot.entries.some(
        (entry) => entry.tournament_edition_id === edition.id && entry.player_id === playerId && entry.entry_status !== "withdrawn",
      ),
    )
    .sort((a, b) => a.end_date.localeCompare(b.end_date) || a.id.localeCompare(b.id))
    .map((edition) => {
      const row = rollingRanking(snapshot, edition.end_date).find((item) => item.player.id === playerId);
      const reached = editionPoints(snapshot, edition).find((item) => item.playerId === playerId)?.reached ?? null;
      return { editionId: edition.id, date: edition.end_date, reached, rank: row?.rank ?? null, points: row?.points ?? 0 };
    });
}
