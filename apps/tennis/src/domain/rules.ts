import type {
  Match,
  MatchSet,
  Season,
  TennisSnapshot,
  TournamentEntry,
  TournamentRound,
} from "./model";

export type DrawMatchDraft = Readonly<{
  key: string;
  round: TournamentRound;
  roundOrder: number;
  matchNumber: number;
  player1Id: string | null;
  player2Id: string | null;
  nextMatchKey: string | null;
  nextSlot: 1 | 2 | null;
}>;
export type PlayerStats = Readonly<{
  played: number;
  wins: number;
  losses: number;
  winRate: number;
  titles: number;
  finals: number;
  setsWon: number;
  setsLost: number;
}>;
export type HeadToHead = Readonly<{
  matches: number;
  playerAWins: number;
  playerBWins: number;
  playerASets: number;
  playerBSets: number;
}>;

export const validDrawSizes = [4, 8, 16] as const;
const roundSequence: Readonly<Record<number, readonly TournamentRound[]>> = {
  4: ["semifinal", "final"],
  8: ["quarterfinal", "semifinal", "final"],
  16: ["round_of_16", "quarterfinal", "semifinal", "final"],
};

export function activeSeason(seasons: readonly Season[]): Season | null {
  return seasons.find(({ status }) => status === "active") ?? null;
}

export function validateEntries(
  entries: readonly TournamentEntry[],
  drawSize: number,
): string | null {
  if (!validDrawSizes.includes(drawSize as 4 | 8 | 16)) return "El cuadro debe ser de 4, 8 o 16.";
  if (entries.length !== drawSize)
    return `Se requieren exactamente ${drawSize} inscripciones activas.`;
  const players = entries.map(({ player_id }) => player_id);
  if (new Set(players).size !== players.length) return "No puede haber jugadores duplicados.";
  const seeds = entries.flatMap(({ seed }) => (seed === null ? [] : [seed]));
  if (new Set(seeds).size !== seeds.length) return "No puede haber seeds duplicadas.";
  if (seeds.some((seed) => !Number.isInteger(seed) || seed < 1 || seed > drawSize))
    return "Cada seed debe estar dentro del tamaño del cuadro.";
  return null;
}

const seedSlots: Readonly<Record<number, readonly number[]>> = {
  4: [0, 3, 2, 1],
  8: [0, 7, 4, 3, 2, 5, 6, 1],
  16: [0, 15, 8, 7, 4, 11, 12, 3, 2, 13, 10, 5, 6, 9, 14, 1],
};

export function generateDraw(
  entries: readonly TournamentEntry[],
  drawSize: number,
): readonly DrawMatchDraft[] {
  const error = validateEntries(entries, drawSize);
  if (error) throw new Error(error);
  const slots: Array<string | null> = Array.from({ length: drawSize }, () => null);
  const seeded = entries
    .filter(({ seed }) => seed !== null)
    .sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0));
  for (const entry of seeded)
    slots[seedSlots[drawSize]?.[(entry.seed ?? 1) - 1] ?? -1] = entry.player_id;
  const remaining = entries
    .filter(({ seed }) => seed === null)
    .sort((a, b) => a.player_id.localeCompare(b.player_id));
  let remainingIndex = 0;
  for (let index = 0; index < slots.length; index += 1)
    if (slots[index] === null) slots[index] = remaining[remainingIndex++]?.player_id ?? null;

  const sequence = roundSequence[drawSize];
  if (!sequence) throw new Error("Tamaño de cuadro no soportado.");
  const drafts: DrawMatchDraft[] = [];
  for (let roundIndex = 0; roundIndex < sequence.length; roundIndex += 1) {
    const round = sequence[roundIndex];
    if (!round) continue;
    const matchCount = drawSize / 2 ** (roundIndex + 1);
    for (let index = 0; index < matchCount; index += 1) {
      const key = `${round}-${index + 1}`;
      const nextRound = sequence[roundIndex + 1];
      drafts.push({
        key,
        round,
        roundOrder: roundIndex + 1,
        matchNumber: index + 1,
        player1Id: roundIndex === 0 ? (slots[index * 2] ?? null) : null,
        player2Id: roundIndex === 0 ? (slots[index * 2 + 1] ?? null) : null,
        nextMatchKey: nextRound ? `${nextRound}-${Math.floor(index / 2) + 1}` : null,
        nextSlot: nextRound ? (index % 2 === 0 ? 1 : 2) : null,
      });
    }
  }
  return drafts;
}

export function validateMatchResult(
  match: Pick<Match, "player1_id" | "player2_id" | "best_of">,
  sets: readonly Pick<MatchSet, "set_number" | "player1_score" | "player2_score">[],
): { winnerId: string; player1Sets: number; player2Sets: number } {
  if (!match.player1_id || !match.player2_id || match.player1_id === match.player2_id)
    throw new Error("El partido requiere dos jugadores distintos.");
  if (match.best_of < 1 || match.best_of % 2 === 0)
    throw new Error("best_of debe ser impar y positivo.");
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number);
  if (!ordered.length || ordered.length > match.best_of)
    throw new Error("Cantidad de sets inválida.");
  if (
    new Set(ordered.map(({ set_number }) => set_number)).size !== ordered.length ||
    ordered.some((set, index) => set.set_number !== index + 1)
  )
    throw new Error("Los sets deben ser consecutivos y únicos.");
  if (
    ordered.some(
      ({ player1_score, player2_score }) =>
        !Number.isInteger(player1_score) ||
        !Number.isInteger(player2_score) ||
        player1_score < 0 ||
        player2_score < 0 ||
        player1_score === player2_score,
    )
  )
    throw new Error("Cada set necesita scores enteros, no negativos y distintos.");
  const needed = Math.floor(match.best_of / 2) + 1;
  const player1Sets = ordered.filter((set) => set.player1_score > set.player2_score).length;
  const player2Sets = ordered.length - player1Sets;
  if (Math.max(player1Sets, player2Sets) !== needed || Math.min(player1Sets, player2Sets) >= needed)
    throw new Error("El resultado no determina un ganador coherente con el formato.");
  return {
    winnerId: player1Sets > player2Sets ? match.player1_id : match.player2_id,
    player1Sets,
    player2Sets,
  };
}

export function advanceWinner(match: Match, next: Match): Match {
  if (
    !match.winner_id ||
    match.status !== "finished" ||
    match.next_match_id !== next.id ||
    !match.next_slot
  )
    throw new Error("El partido no puede avanzar a ese destino.");
  const slot = match.next_slot === 1 ? "player1_id" : "player2_id";
  const existing = next[slot];
  if (existing && existing !== match.winner_id)
    throw new Error("El slot de destino ya pertenece a otro jugador.");
  const other = match.next_slot === 1 ? next.player2_id : next.player1_id;
  if (other === match.winner_id)
    throw new Error("El ganador no puede duplicarse en el siguiente partido.");
  return { ...next, [slot]: match.winner_id };
}

function finishedMatches(snapshot: TennisSnapshot, seasonId?: string): readonly Match[] {
  const editionIds = new Set(
    snapshot.editions
      .filter((edition) => !seasonId || edition.season_id === seasonId)
      .map(({ id }) => id),
  );
  return snapshot.matches.filter(
    (match) =>
      editionIds.has(match.tournament_edition_id) &&
      ["finished", "walkover", "retired"].includes(match.status) &&
      match.winner_id,
  );
}

export function headToHead(
  snapshot: TennisSnapshot,
  playerAId: string,
  playerBId: string,
): HeadToHead {
  const matches = finishedMatches(snapshot).filter(
    (match) =>
      (match.player1_id === playerAId && match.player2_id === playerBId) ||
      (match.player1_id === playerBId && match.player2_id === playerAId),
  );
  let playerASets = 0;
  let playerBSets = 0;
  for (const match of matches)
    for (const set of snapshot.sets.filter(({ match_id }) => match_id === match.id)) {
      const firstWon = set.player1_score > set.player2_score;
      const aWon = match.player1_id === playerAId ? firstWon : !firstWon;
      if (aWon) playerASets += 1;
      else playerBSets += 1;
    }
  return {
    matches: matches.length,
    playerAWins: matches.filter(({ winner_id }) => winner_id === playerAId).length,
    playerBWins: matches.filter(({ winner_id }) => winner_id === playerBId).length,
    playerASets,
    playerBSets,
  };
}

export function playerStats(
  snapshot: TennisSnapshot,
  playerId: string,
  seasonId?: string,
): PlayerStats {
  const matches = finishedMatches(snapshot, seasonId).filter(
    (match) => match.player1_id === playerId || match.player2_id === playerId,
  );
  let setsWon = 0;
  let setsLost = 0;
  for (const match of matches)
    for (const set of snapshot.sets.filter(({ match_id }) => match_id === match.id)) {
      const firstWon = set.player1_score > set.player2_score;
      const playerWon = match.player1_id === playerId ? firstWon : !firstWon;
      if (playerWon) setsWon += 1;
      else setsLost += 1;
    }
  const wins = matches.filter(({ winner_id }) => winner_id === playerId).length;
  const finalMatches = matches.filter(({ round }) => round === "final");
  return {
    played: matches.length,
    wins,
    losses: matches.length - wins,
    winRate: matches.length ? Math.round((wins / matches.length) * 1000) / 10 : 0,
    titles: finalMatches.filter(({ winner_id }) => winner_id === playerId).length,
    finals: finalMatches.length,
    setsWon,
    setsLost,
  };
}

export function orderedRounds(matches: readonly Match[]): readonly TournamentRound[] {
  return [
    ...new Set(
      [...matches].sort((a, b) => a.round_order - b.round_order).map(({ round }) => round),
    ),
  ];
}
