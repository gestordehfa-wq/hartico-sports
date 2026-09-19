import type { CompetitionTeam, Legs, Match } from "./model";
import type { StandingRow } from "./rules";

// Reglas puras de los formatos de competición de Football Lite v0.2. Reflejan
// `advance_knockout_winner`, `close_league` y `generate_supercup` (migración 006);
// la base de datos es la autoridad final.

export const cupSizes = [4, 8, 16] as const;
export type CupSize = (typeof cupSizes)[number];
export type CupRound = "round_of_16" | "quarterfinal" | "semifinal" | "final";

export type FixtureDraft = Readonly<{ matchday: number; homeTeamId: string; awayTeamId: string }>;
export type BracketDraft = Readonly<{
  key: string;
  stage: CupRound;
  roundOrder: number;
  matchNumber: number;
  homeTeamId: string | null;
  awayTeamId: string | null;
  nextKey: string | null;
  nextSlot: 1 | 2 | null;
}>;

/** Orden determinista de equipos inscritos: seed ascendente (sin seed al final) y luego id. */
export function seededOrder(enrollments: readonly Pick<CompetitionTeam, "team_id" | "seed">[]): readonly string[] {
  return [...enrollments]
    .sort(
      (a, b) =>
        (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER) ||
        a.team_id.localeCompare(b.team_id),
    )
    .map(({ team_id }) => team_id);
}

/**
 * Todos contra todos por el método del círculo. Con `legs = 2` la segunda vuelta repite
 * las jornadas con la localía invertida. Con número impar de equipos uno descansa cada jornada.
 */
export function generateLeagueFixture(teamIds: readonly string[], legs: Legs = 1): readonly FixtureDraft[] {
  if (new Set(teamIds).size !== teamIds.length) throw new Error("No puede haber equipos duplicados.");
  if (teamIds.length < 2) throw new Error("Se requieren al menos 2 equipos inscritos.");
  const lineup: Array<string | null> = [...teamIds];
  if (lineup.length % 2 === 1) lineup.push(null);
  const size = lineup.length;
  const rounds = size - 1;
  const fixed = lineup[0] ?? null;
  let rotating = lineup.slice(1);
  const firstLeg: FixtureDraft[] = [];
  for (let round = 0; round < rounds; round += 1) {
    const current = [fixed, ...rotating];
    for (let index = 0; index < size / 2; index += 1) {
      const first = current[index] ?? null;
      const second = current[size - 1 - index] ?? null;
      if (first === null || second === null) continue;
      // Alterna la localía para equilibrarla razonablemente entre jornadas.
      const swap = index === 0 ? round % 2 === 1 : (index + round) % 2 === 1;
      firstLeg.push({ matchday: round + 1, homeTeamId: swap ? second : first, awayTeamId: swap ? first : second });
    }
    const last = rotating[rotating.length - 1] ?? null;
    rotating = [last, ...rotating.slice(0, -1)];
  }
  if (legs === 1) return firstLeg;
  return [
    ...firstLeg,
    ...firstLeg.map((match) => ({
      matchday: match.matchday + rounds,
      homeTeamId: match.awayTeamId,
      awayTeamId: match.homeTeamId,
    })),
  ];
}

const seedSlots: Readonly<Record<CupSize, readonly number[]>> = {
  4: [0, 3, 2, 1],
  8: [0, 7, 4, 3, 2, 5, 6, 1],
  16: [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1],
};
const roundSequence: Readonly<Record<CupSize, readonly CupRound[]>> = {
  4: ["semifinal", "final"],
  8: ["quarterfinal", "semifinal", "final"],
  16: ["round_of_16", "quarterfinal", "semifinal", "final"],
};

export function isCupSize(value: number): value is CupSize {
  return cupSizes.some((size) => size === value);
}

/** Cuadro de eliminación directa para 4, 8 o 16 equipos ordenados por cabeza de serie. */
export function generateCupBracket(orderedTeamIds: readonly string[]): readonly BracketDraft[] {
  const size = orderedTeamIds.length;
  if (!isCupSize(size)) throw new Error("El cuadro requiere exactamente 4, 8 o 16 equipos inscritos.");
  if (new Set(orderedTeamIds).size !== size) throw new Error("No puede haber equipos duplicados.");
  const slots: Array<string | null> = Array.from({ length: size }, () => null);
  orderedTeamIds.forEach((teamId, seedIndex) => {
    slots[seedSlots[size][seedIndex] ?? -1] = teamId;
  });
  const sequence = roundSequence[size];
  const drafts: BracketDraft[] = [];
  sequence.forEach((stage, roundIndex) => {
    const matchCount = size / 2 ** (roundIndex + 1);
    const nextStage = sequence[roundIndex + 1];
    for (let index = 0; index < matchCount; index += 1) {
      drafts.push({
        key: `${stage}-${index + 1}`,
        stage,
        roundOrder: roundIndex + 1,
        matchNumber: index + 1,
        homeTeamId: roundIndex === 0 ? (slots[index * 2] ?? null) : null,
        awayTeamId: roundIndex === 0 ? (slots[index * 2 + 1] ?? null) : null,
        nextKey: nextStage ? `${nextStage}-${Math.floor(index / 2) + 1}` : null,
        nextSlot: nextStage ? (index % 2 === 0 ? 1 : 2) : null,
      });
    }
  });
  return drafts;
}

export type KnockoutOutcome = Readonly<{ winnerId: string; decidedByAdministrator: boolean }>;
export type TiebreakDecision = Readonly<{ winnerId: string; note: string }>;

/**
 * Ganador de un partido eliminatorio finalizado. Un empate nunca se resuelve solo ni al
 * azar: exige que el administrador indique al ganador y el mecanismo reglamentario.
 */
export function knockoutOutcome(
  match: Pick<Match, "status" | "home_team_id" | "away_team_id" | "home_score" | "away_score">,
  decision?: TiebreakDecision,
): KnockoutOutcome {
  if (match.status !== "finished" || match.home_score === null || match.away_score === null)
    throw new Error("El partido debe estar finalizado con marcador.");
  if (match.home_team_id === null || match.away_team_id === null)
    throw new Error("El partido requiere ambos equipos.");
  if (match.home_score > match.away_score) return { winnerId: match.home_team_id, decidedByAdministrator: false };
  if (match.away_score > match.home_score) return { winnerId: match.away_team_id, decidedByAdministrator: false };
  if (!decision || (decision.winnerId !== match.home_team_id && decision.winnerId !== match.away_team_id))
    throw new Error("Empate eliminatorio: el administrador debe definir al ganador entre los dos equipos.");
  if (decision.note.trim().length < 5)
    throw new Error("Empate eliminatorio: registra el mecanismo reglamentario de la asociación.");
  return { winnerId: decision.winnerId, decidedByAdministrator: true };
}

export function isKnockoutTie(match: Pick<Match, "home_score" | "away_score">): boolean {
  return match.home_score !== null && match.home_score === match.away_score;
}

/** Equipos empatados en la cima (PTS, DG y GF); solo uno significa campeón directo. */
export function leagueTopTie(standings: readonly StandingRow[]): readonly string[] {
  const top = standings[0];
  if (!top) return [];
  return standings
    .filter(
      (row) =>
        row.points === top.points && row.goalDifference === top.goalDifference && row.goalsFor === top.goalsFor,
    )
    .map(({ team }) => team.id);
}

export type SupercupPairing =
  | Readonly<{ status: "ready"; homeTeamId: string; awayTeamId: string }>
  | Readonly<{ status: "needs_opponent"; championId: string }>
  | Readonly<{ status: "missing"; reason: string }>;

/** Enfrentamiento de Supercopa; con doblete no elige rival: lo decide el administrador. */
export function supercupPairing(leagueChampionId: string | null, cupChampionId: string | null): SupercupPairing {
  if (!leagueChampionId) return { status: "missing", reason: "La liga aún no tiene campeón registrado." };
  if (!cupChampionId) return { status: "missing", reason: "La copa aún no tiene campeón registrado." };
  if (leagueChampionId === cupChampionId) return { status: "needs_opponent", championId: leagueChampionId };
  return { status: "ready", homeTeamId: leagueChampionId, awayTeamId: cupChampionId };
}

export const stageLabels: Readonly<Record<string, string>> = {
  round_of_16: "Octavos",
  quarterfinal: "Cuartos",
  semifinal: "Semifinal",
  final: "Final",
  supercup: "Supercopa",
};
