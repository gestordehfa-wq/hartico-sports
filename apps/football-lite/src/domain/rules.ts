import type { FootballSnapshot, Match, Player, Season, Team } from "./model";

export type StandingRow = Readonly<{
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}>;

export type PlayerStatistic = Readonly<{
  player: Player;
  appearances: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}>;

export type TeamStatistic = Readonly<{
  team: Team;
  matches: number;
  goalsFor: number;
  goalsAgainst: number;
}>;

export function activeSeason(seasons: readonly Season[]): Season | null {
  return seasons.find((season) => season.status === "active") ?? null;
}

export function competitionStandings(
  snapshot: FootballSnapshot,
  competitionId: string,
): readonly StandingRow[] {
  const competition = snapshot.competitions.find((item) => item.id === competitionId);
  if (competition?.type !== "league") return [];
  const teamIds = new Set<string>();
  for (const roster of snapshot.rosters)
    if (roster.season_id === competition.season_id) teamIds.add(roster.team_id);
  for (const match of snapshot.matches)
    if (match.competition_id === competitionId) {
      teamIds.add(match.home_team_id);
      teamIds.add(match.away_team_id);
    }
  const rows = new Map<string, Omit<StandingRow, "team" | "goalDifference">>();
  for (const id of teamIds)
    rows.set(id, { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
  for (const match of snapshot.matches) {
    if (
      match.competition_id !== competitionId ||
      match.status !== "finished" ||
      match.home_score === null ||
      match.away_score === null
    )
      continue;
    applyResult(rows, match.home_team_id, match.home_score, match.away_score);
    applyResult(rows, match.away_team_id, match.away_score, match.home_score);
  }
  return [...rows.entries()]
    .flatMap(([teamId, row]) => {
      const team = snapshot.teams.find((item) => item.id === teamId);
      return team ? [{ team, ...row, goalDifference: row.goalsFor - row.goalsAgainst }] : [];
    })
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.goalDifference - left.goalDifference ||
        right.goalsFor - left.goalsFor ||
        left.team.name.localeCompare(right.team.name),
    );
}

function applyResult(
  rows: Map<string, Omit<StandingRow, "team" | "goalDifference">>,
  teamId: string,
  goalsFor: number,
  goalsAgainst: number,
): void {
  const row = rows.get(teamId) ?? {
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  };
  const won = goalsFor > goalsAgainst ? 1 : 0;
  const drawn = goalsFor === goalsAgainst ? 1 : 0;
  const lost = goalsFor < goalsAgainst ? 1 : 0;
  rows.set(teamId, {
    played: row.played + 1,
    won: row.won + won,
    drawn: row.drawn + drawn,
    lost: row.lost + lost,
    goalsFor: row.goalsFor + goalsFor,
    goalsAgainst: row.goalsAgainst + goalsAgainst,
    points: row.points + won * 3 + drawn,
  });
}

export function playerStatistics(
  snapshot: FootballSnapshot,
  seasonId?: string,
): readonly PlayerStatistic[] {
  const matchIds = new Set(
    snapshot.matches
      .filter((match) => match.status === "finished" && (!seasonId || match.season_id === seasonId))
      .map(({ id }) => id),
  );
  const stats = snapshot.players.map((player) => {
    const playerEvents = snapshot.events.filter(
      (event) => event.player_id === player.id && matchIds.has(event.match_id),
    );
    const relatedAssists = snapshot.events.filter(
      (event) =>
        event.event_type === "goal" &&
        event.related_player_id === player.id &&
        matchIds.has(event.match_id),
    );
    const assistKeys = new Set(
      [...playerEvents.filter((event) => event.event_type === "assist"), ...relatedAssists].map(
        (event) => `${event.match_id}:${event.minute ?? "-"}:${player.id}`,
      ),
    );
    return {
      player,
      appearances: snapshot.appearances.filter(
        (item) => item.player_id === player.id && matchIds.has(item.match_id),
      ).length,
      goals: playerEvents.filter((event) => event.event_type === "goal").length,
      assists: assistKeys.size,
      yellowCards: playerEvents.filter((event) => event.event_type === "yellow_card").length,
      redCards: playerEvents.filter((event) => event.event_type === "red_card").length,
    };
  });
  return stats.sort(
    (left, right) =>
      right.goals - left.goals ||
      right.assists - left.assists ||
      left.player.display_name.localeCompare(right.player.display_name),
  );
}

export function teamStatistics(
  snapshot: FootballSnapshot,
  seasonId?: string,
): readonly TeamStatistic[] {
  const finished = snapshot.matches.filter(
    (match) =>
      match.status === "finished" &&
      match.home_score !== null &&
      match.away_score !== null &&
      (!seasonId || match.season_id === seasonId),
  );
  return snapshot.teams
    .map((team) => {
      const matches = finished.filter(
        (match) => match.home_team_id === team.id || match.away_team_id === team.id,
      );
      return {
        team,
        matches: matches.length,
        goalsFor: sumGoals(matches, team.id, true),
        goalsAgainst: sumGoals(matches, team.id, false),
      };
    })
    .sort(
      (left, right) =>
        right.goalsFor - left.goalsFor || left.team.name.localeCompare(right.team.name),
    );
}

function sumGoals(matches: readonly Match[], teamId: string, own: boolean): number {
  return matches.reduce((total, match) => {
    const home = match.home_team_id === teamId;
    const value = own === home ? match.home_score : match.away_score;
    return total + (value ?? 0);
  }, 0);
}

export function nextMatches(
  matches: readonly Match[],
  seasonId: string,
  now = new Date().toISOString(),
): readonly Match[] {
  return matches
    .filter(
      (match) =>
        match.season_id === seasonId && match.status === "scheduled" && match.scheduled_at >= now,
    )
    .sort((left, right) => left.scheduled_at.localeCompare(right.scheduled_at));
}

export function validateDateRange(start: string | null, end: string | null): string | null {
  return start && end && start > end ? "La fecha inicial no puede ser posterior a la final." : null;
}
