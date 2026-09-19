import { Link } from "react-router-dom";
import { stageLabels } from "../../domain/formats";
import type { Competition, FootballSnapshot, Match } from "../../domain/model";
import { playerStatistics } from "../../domain/rules";
import { Empty, MatchRow, TeamMark, Window } from "../shared/components";

const teamFor = (snapshot: FootballSnapshot, id: string | null) =>
  snapshot.teams.find((team) => team.id === id);

export function ChampionBanner({
  snapshot,
  competition,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition }>) {
  const champion = teamFor(snapshot, competition.champion_team_id);
  if (!champion) return null;
  return (
    <p className="champion-banner">
      <TeamMark team={champion} /> Campeón: <Link to={`/teams/${champion.id}`}>{champion.name}</Link>
    </p>
  );
}

/** Calendario de liga agrupado por jornada, con resultados. */
export function LeagueCalendar({
  snapshot,
  competition,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition }>) {
  const matches = snapshot.matches
    .filter((match) => match.competition_id === competition.id)
    .sort((a, b) => (a.matchday ?? 0) - (b.matchday ?? 0) || a.scheduled_at.localeCompare(b.scheduled_at));
  const matchdays = [...new Set(matches.map(({ matchday }) => matchday))];
  return (
    <Window
      title="Calendario y resultados"
      status={`${matches.length} partidos · ${competition.legs === 2 ? "ida y vuelta" : "una vuelta"}`}
    >
      {matches.length ? (
        matchdays.map((matchday) => (
          <section key={matchday ?? "sin-jornada"} aria-label={`Jornada ${matchday ?? "sin número"}`}>
            <h3 className="matchday-title">{matchday ? `Jornada ${matchday}` : "Sin jornada"}</h3>
            <div className="match-list">
              {matches
                .filter((match) => match.matchday === matchday)
                .map((match) => (
                  <MatchRow
                    key={match.id}
                    match={match}
                    home={teamFor(snapshot, match.home_team_id)}
                    away={teamFor(snapshot, match.away_team_id)}
                  />
                ))}
            </div>
          </section>
        ))
      ) : (
        <Empty>El fixture aún no fue generado.</Empty>
      )}
    </Window>
  );
}

function BracketMatch({ match, snapshot }: Readonly<{ match: Match; snapshot: FootballSnapshot }>) {
  const side = (teamId: string | null, goals: number | null) => (
    <span className={teamId && match.winner_team_id === teamId ? "winner" : ""}>
      <span>{teamFor(snapshot, teamId)?.short_name ?? "Por definir"}</span>
      <i>{goals ?? ""}</i>
    </span>
  );
  return (
    <Link className="bracket-match" to={`/matches/${match.id}`}>
      {side(match.home_team_id, match.home_score)}
      {side(match.away_team_id, match.away_score)}
      {match.tiebreak_note && <small>Empate definido por la asociación</small>}
    </Link>
  );
}

/** Cuadro público de eliminación directa por rondas. */
export function CupBracket({
  snapshot,
  competition,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition }>) {
  const matches = snapshot.matches
    .filter((match) => match.competition_id === competition.id && match.stage !== null)
    .sort((a, b) => (a.round_order ?? 0) - (b.round_order ?? 0) || (a.match_number ?? 0) - (b.match_number ?? 0));
  const stages = [...new Set(matches.map(({ stage }) => stage))];
  return (
    <Window title="Cuadro" status={`${matches.length} partidos`}>
      {matches.length ? (
        <section className="bracket" aria-label="Cuadro de la copa">
          {stages.map((stage) => (
            <section className="bracket-round" key={stage}>
              <h3>{stage ? (stageLabels[stage] ?? stage) : ""}</h3>
              <div className="bracket-matches">
                {matches
                  .filter((match) => match.stage === stage)
                  .map((match) => (
                    <BracketMatch key={match.id} match={match} snapshot={snapshot} />
                  ))}
              </div>
            </section>
          ))}
        </section>
      ) : (
        <Empty>El cuadro aún no fue generado.</Empty>
      )}
    </Window>
  );
}

/** Supercopa: enfrentamiento entre los campeones registrados de Liga y Copa. */
export function SupercupView({
  snapshot,
  competition,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition }>) {
  const match = snapshot.matches.find((item) => item.competition_id === competition.id);
  const league = snapshot.competitions.find((item) => item.id === competition.source_league_id);
  const cup = snapshot.competitions.find((item) => item.id === competition.source_cup_id);
  return (
    <Window
      title="Supercopa"
      status={league && cup ? `${league.name} vs ${cup.name}` : "Enfrentamiento pendiente"}
    >
      {match ? (
        <div className="match-list">
          <MatchRow
            match={match}
            home={teamFor(snapshot, match.home_team_id)}
            away={teamFor(snapshot, match.away_team_id)}
          />
        </div>
      ) : (
        <Empty>La Supercopa se genera con los campeones registrados de Liga y Copa.</Empty>
      )}
    </Window>
  );
}

/** Goleadores y asistentes de la competición. */
export function CompetitionLeaders({
  snapshot,
  competition,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition }>) {
  const stats = playerStatistics(snapshot, competition.season_id, competition.id);
  const scorers = stats.filter((row) => row.goals > 0).slice(0, 5);
  const assisters = [...stats]
    .filter((row) => row.assists > 0)
    .sort((a, b) => b.assists - a.assists || a.player.display_name.localeCompare(b.player.display_name))
    .slice(0, 5);
  if (!scorers.length && !assisters.length) return null;
  return (
    <div className="dashboard-columns">
      <Window title="Goleadores">
        <ol className="ranking-list">
          {scorers.map((row) => (
            <li key={row.player.id}>
              <Link to={`/players/${row.player.id}`}>{row.player.display_name}</Link>
              <strong>{row.goals}</strong>
            </li>
          ))}
        </ol>
      </Window>
      <Window title="Asistentes">
        <ol className="ranking-list">
          {assisters.map((row) => (
            <li key={row.player.id}>
              <Link to={`/players/${row.player.id}`}>{row.player.display_name}</Link>
              <strong>{row.assists}</strong>
            </li>
          ))}
        </ol>
      </Window>
    </div>
  );
}

export function CompetitionAwards({
  snapshot,
  competition,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition }>) {
  const awards = snapshot.awards.filter((award) => award.competition_id === competition.id);
  if (!awards.length) return null;
  return (
    <Window title="Premios" status={`${awards.length} registros`}>
      <div className="list-stack">
        {awards.map((award) => (
          <article key={award.id}>
            <strong>{award.title}</strong>
            <span>
              {award.award_type.replaceAll("_", " ")}
              {award.description ? ` · ${award.description}` : ""}
            </span>
          </article>
        ))}
      </div>
    </Window>
  );
}
