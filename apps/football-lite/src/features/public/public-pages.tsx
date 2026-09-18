import { Link, useParams } from "react-router-dom";
import { useFootball } from "../../app/football-context";
import { association } from "../../config/association";
import type { Competition, FootballSnapshot, Match } from "../../domain/model";
import {
  activeSeason,
  competitionStandings,
  nextMatches,
  playerStatistics,
  teamStatistics,
} from "../../domain/rules";
import {
  Empty,
  formatDate,
  Loader,
  MatchRow,
  PageHeader,
  score,
  StatusBadge,
  TeamMark,
  TeamName,
  Window,
} from "../shared/components";

const teamFor = (snapshot: FootballSnapshot, id: string) =>
  snapshot.teams.find((team) => team.id === id);
const playerFor = (snapshot: FootballSnapshot, id: string) =>
  snapshot.players.find((player) => player.id === id);
const competitionFor = (snapshot: FootballSnapshot, id: string) =>
  snapshot.competitions.find((item) => item.id === id);
const matchesFor = (snapshot: FootballSnapshot, predicate: (match: Match) => boolean) =>
  snapshot.matches
    .filter(predicate)
    .sort((left, right) => right.scheduled_at.localeCompare(left.scheduled_at));

function StandingsTable({
  snapshot,
  competition,
  compact = false,
}: Readonly<{ snapshot: FootballSnapshot; competition: Competition; compact?: boolean }>) {
  const rows = competitionStandings(snapshot, competition.id);
  if (!rows.length)
    return <Empty>No hay resultados suficientes para generar la clasificación.</Empty>;
  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Equipo</th>
            <th scope="col">PJ</th>
            {!compact && (
              <>
                <th scope="col">PG</th>
                <th scope="col">PE</th>
                <th scope="col">PP</th>
                <th scope="col">GF</th>
                <th scope="col">GC</th>
                <th scope="col">DG</th>
              </>
            )}
            <th scope="col">PTS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.team.id}>
              <td>{index + 1}</td>
              <td>
                <TeamMark team={row.team} />
                <Link to={`/teams/${row.team.id}`}>{row.team.short_name}</Link>
              </td>
              <td>{row.played}</td>
              {!compact && (
                <>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                  <td>{row.goalDifference}</td>
                </>
              )}
              <td>
                <strong>{row.points}</strong>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function HomePage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  const season = activeSeason(snapshot.seasons);
  if (!season)
    return (
      <>
        <PageHeader
          eyebrow={association.holoName}
          title={association.name}
          copy="Gestión independiente de competiciones, equipos, jugadores y resultados."
        />
        <Empty>
          No hay una temporada activa publicada. La administración puede crearla cuando el backend
          esté conectado.
        </Empty>
      </>
    );
  const competitions = snapshot.competitions.filter(
    (item) => item.season_id === season.id && item.status === "active",
  );
  const league = competitions.find((item) => item.type === "league");
  const upcoming = nextMatches(snapshot.matches, season.id).slice(0, 4);
  const scorers = playerStatistics(snapshot, season.id)
    .filter((item) => item.goals > 0)
    .slice(0, 5);
  return (
    <>
      <section className="dashboard-title">
        <div>
          <p className="eyebrow">{association.holoName}</p>
          <h1>{association.name}</h1>
        </div>
        <div>
          <span className="label">{association.seasonLabel}</span>
          <strong>{season.name}</strong>
          <StatusBadge status={season.status} />
        </div>
      </section>
      <Window title="Próximos partidos" status={`${upcoming.length} partidos programados`}>
        {upcoming.length ? (
          <div className="match-list">
            {upcoming.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                home={teamFor(snapshot, match.home_team_id)}
                away={teamFor(snapshot, match.away_team_id)}
              />
            ))}
          </div>
        ) : (
          <Empty>No hay próximos partidos publicados.</Empty>
        )}
      </Window>
      <div className="dashboard-columns">
        <Window title={league ? `Clasificación · ${league.short_name}` : "Clasificación"}>
          {league ? (
            <StandingsTable snapshot={snapshot} competition={league} compact />
          ) : (
            <Empty>No existe una liga activa.</Empty>
          )}
        </Window>
        <Window title="Goleadores">
          {scorers.length ? (
            <ol className="ranking-list">
              {scorers.map((row) => (
                <li key={row.player.id}>
                  <Link to={`/players/${row.player.id}`}>{row.player.display_name}</Link>
                  <strong>{row.goals}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>No hay goles registrados.</Empty>
          )}
        </Window>
      </div>
    </>
  );
}

export function CompetitionsPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  return (
    <>
      <PageHeader
        eyebrow="Torneos"
        title="Competiciones"
        copy="Ligas y copas organizadas por temporada."
      />
      {snapshot.competitions.length ? (
        <div className="record-grid">
          {snapshot.competitions.map((item) => (
            <Link className="record-card" to={`/competitions/${item.id}`} key={item.id}>
              <span className="record-icon">
                {item.logo_url ? <img src={item.logo_url} alt="" /> : item.short_name.slice(0, 3)}
              </span>
              <div>
                <StatusBadge status={item.status} />
                <h2>{item.name}</h2>
                <p>
                  {snapshot.seasons.find((season) => season.id === item.season_id)?.name ??
                    "Temporada"}{" "}
                  · {item.type}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>No hay competiciones publicadas.</Empty>
      )}
    </>
  );
}

export function CompetitionDetailPage() {
  const { id } = useParams();
  const { snapshot } = useFootball();
  const competition = snapshot.competitions.find((item) => item.id === id);
  if (!competition) return <Empty>La competición no existe o no está publicada.</Empty>;
  const matches = matchesFor(snapshot, (match) => match.competition_id === competition.id);
  return (
    <>
      <PageHeader
        eyebrow={`${competition.type} · ${competition.short_name}`}
        title={competition.name}
        copy={
          snapshot.seasons.find((season) => season.id === competition.season_id)?.name ??
          "Temporada"
        }
      />
      {competition.type === "league" && (
        <Window title="Clasificación" status="3 puntos por victoria · 1 por empate">
          <StandingsTable snapshot={snapshot} competition={competition} />
        </Window>
      )}
      <Window title="Partidos" status={`${matches.length} registros`}>
        {matches.length ? (
          <div className="match-list">
            {matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                home={teamFor(snapshot, match.home_team_id)}
                away={teamFor(snapshot, match.away_team_id)}
              />
            ))}
          </div>
        ) : (
          <Empty>No hay partidos publicados.</Empty>
        )}
      </Window>
    </>
  );
}

export function TeamsPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  return (
    <>
      <PageHeader
        eyebrow="Clubes"
        title="Equipos"
        copy="Equipos participantes y sus plantillas históricas."
      />
      {snapshot.teams.length ? (
        <div className="record-grid">
          {snapshot.teams.map((team) => (
            <Link className="record-card" to={`/teams/${team.id}`} key={team.id}>
              <TeamMark team={team} />
              <div>
                <span className="record-code">{team.code}</span>
                <h2>{team.name}</h2>
                <p>
                  {team.country_code} · {team.country}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>No hay equipos publicados.</Empty>
      )}
    </>
  );
}

export function TeamDetailPage() {
  const { id } = useParams();
  const { snapshot } = useFootball();
  const team = snapshot.teams.find((item) => item.id === id);
  if (!team) return <Empty>El equipo no existe o no está publicado.</Empty>;
  const season = activeSeason(snapshot.seasons);
  const roster = snapshot.rosters.filter(
    (item) => item.team_id === team.id && (!season || item.season_id === season.id),
  );
  const matches = matchesFor(
    snapshot,
    (match) => match.home_team_id === team.id || match.away_team_id === team.id,
  );
  const stats = teamStatistics(snapshot, season?.id).find((item) => item.team.id === team.id);
  return (
    <>
      <PageHeader
        eyebrow={`${team.code} · ${team.country_code}`}
        title={team.name}
        copy={`${team.short_name} · ${team.country}`}
      />
      <div className="metric-strip">
        <article>
          <span>PJ</span>
          <strong>{stats?.matches ?? 0}</strong>
        </article>
        <article>
          <span>GF</span>
          <strong>{stats?.goalsFor ?? 0}</strong>
        </article>
        <article>
          <span>GC</span>
          <strong>{stats?.goalsAgainst ?? 0}</strong>
        </article>
      </div>
      <div className="dashboard-columns">
        <Window title={`Plantilla · ${season?.name ?? "histórica"}`}>
          {roster.length ? (
            <div className="dense-list">
              {roster.map((item) => {
                const player = playerFor(snapshot, item.player_id);
                return (
                  <article key={item.id}>
                    <span className="position">{player?.position ?? "—"}</span>
                    <Link to={`/players/${item.player_id}`}>
                      {player?.display_name ?? "Jugador"}
                    </Link>
                    <StatusBadge status={item.status} />
                  </article>
                );
              })}
            </div>
          ) : (
            <Empty>No hay jugadores en esta plantilla.</Empty>
          )}
        </Window>
        <Window title="Últimos partidos">
          {matches.length ? (
            <div className="match-list compact">
              {matches.slice(0, 6).map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  home={teamFor(snapshot, match.home_team_id)}
                  away={teamFor(snapshot, match.away_team_id)}
                />
              ))}
            </div>
          ) : (
            <Empty>No hay partidos.</Empty>
          )}
        </Window>
      </div>
    </>
  );
}

export function PlayersPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  return (
    <>
      <PageHeader eyebrow="Registro" title="Jugadores" copy="Futbolistas y posición principal." />
      {snapshot.players.length ? (
        <div className="record-grid players">
          {snapshot.players.map((player) => (
            <Link className="record-card" to={`/players/${player.id}`} key={player.id}>
              <span className="player-avatar">
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt="" />
                ) : (
                  player.display_name.slice(0, 2).toUpperCase()
                )}
              </span>
              <div>
                <span className="position">{player.position}</span>
                <h2>{player.display_name}</h2>
                <p>
                  {player.country_code} · {player.nationality}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <Empty>No hay jugadores publicados.</Empty>
      )}
    </>
  );
}

export function PlayerDetailPage() {
  const { id } = useParams();
  const { snapshot } = useFootball();
  const player = snapshot.players.find((item) => item.id === id);
  if (!player) return <Empty>El jugador no existe o no está publicado.</Empty>;
  const season = activeSeason(snapshot.seasons);
  const stats = playerStatistics(snapshot, season?.id).find((item) => item.player.id === player.id);
  const roster = snapshot.rosters.filter((item) => item.player_id === player.id);
  const events = snapshot.events.filter(
    (item) => item.player_id === player.id || item.related_player_id === player.id,
  );
  return (
    <>
      <PageHeader
        eyebrow={`${player.position} · ${player.country_code}`}
        title={player.display_name}
        copy={player.real_name ? `${player.real_name} · ${player.nationality}` : player.nationality}
      />
      <div className="metric-strip five">
        <article>
          <span>Partidos</span>
          <strong>{stats?.appearances ?? 0}</strong>
        </article>
        <article>
          <span>Goles</span>
          <strong>{stats?.goals ?? 0}</strong>
        </article>
        <article>
          <span>Asist.</span>
          <strong>{stats?.assists ?? 0}</strong>
        </article>
        <article>
          <span>Amarillas</span>
          <strong>{stats?.yellowCards ?? 0}</strong>
        </article>
        <article>
          <span>Rojas</span>
          <strong>{stats?.redCards ?? 0}</strong>
        </article>
      </div>
      <div className="dashboard-columns">
        <Window title="Historial de plantilla">
          {roster.length ? (
            <div className="dense-list">
              {roster.map((item) => (
                <article key={item.id}>
                  <TeamName team={teamFor(snapshot, item.team_id)} />
                  <span>
                    {snapshot.seasons.find((seasonItem) => seasonItem.id === item.season_id)?.name}
                  </span>
                  <StatusBadge status={item.status} />
                </article>
              ))}
            </div>
          ) : (
            <Empty>Sin historial de plantilla.</Empty>
          )}
        </Window>
        <Window title="Eventos recientes">
          {events.length ? (
            <div className="dense-list">
              {events
                .slice(-8)
                .reverse()
                .map((event) => (
                  <article key={event.id}>
                    <span>{event.minute === null ? "—" : `${event.minute}'`}</span>
                    <Link to={`/matches/${event.match_id}`}>
                      {event.event_type.replaceAll("_", " ")}
                    </Link>
                  </article>
                ))}
            </div>
          ) : (
            <Empty>Sin eventos registrados.</Empty>
          )}
        </Window>
      </div>
    </>
  );
}

export function MatchesPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  const matches = matchesFor(snapshot, () => true);
  return (
    <>
      <PageHeader
        eyebrow="Calendario"
        title="Partidos"
        copy="Programación, resultados y estados oficiales."
      />
      {matches.length ? (
        <Window title="Calendario completo" status={`${matches.length} partidos`}>
          <div className="match-list">
            {matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                home={teamFor(snapshot, match.home_team_id)}
                away={teamFor(snapshot, match.away_team_id)}
              />
            ))}
          </div>
        </Window>
      ) : (
        <Empty>No hay partidos publicados.</Empty>
      )}
    </>
  );
}

export function MatchDetailPage() {
  const { id } = useParams();
  const { snapshot } = useFootball();
  const match = snapshot.matches.find((item) => item.id === id);
  if (!match) return <Empty>El partido no existe o no está publicado.</Empty>;
  const home = teamFor(snapshot, match.home_team_id);
  const away = teamFor(snapshot, match.away_team_id);
  const events = snapshot.events
    .filter((item) => item.match_id === match.id)
    .sort((left, right) => (left.minute ?? 999) - (right.minute ?? 999));
  return (
    <>
      <PageHeader
        eyebrow={competitionFor(snapshot, match.competition_id)?.name ?? "Partido"}
        title={`${home?.short_name ?? "Local"} vs ${away?.short_name ?? "Visita"}`}
        copy={`${formatDate(match.scheduled_at)}${match.matchday ? ` · Jornada ${match.matchday}` : ""}`}
      />
      <section className="scoreboard">
        <div>
          <TeamMark team={home} />
          <TeamName team={home} />
        </div>
        <strong>{score(match)}</strong>
        <div>
          <TeamMark team={away} />
          <TeamName team={away} />
        </div>
        <StatusBadge status={match.status} />
      </section>
      <Window
        title="Eventos del partido"
        status={match.referee_name ? `Árbitro: ${match.referee_name}` : "Árbitro no informado"}
      >
        {events.length ? (
          <div className="event-list">
            {events.map((event) => (
              <article key={event.id}>
                <time>{event.minute === null ? "—" : `${event.minute}'`}</time>
                <strong>{event.event_type.replaceAll("_", " ")}</strong>
                <Link to={`/players/${event.player_id}`}>
                  {playerFor(snapshot, event.player_id)?.display_name ?? "Jugador"}
                </Link>
                <span>{teamFor(snapshot, event.team_id)?.short_name}</span>
                {event.related_player_id && (
                  <small>
                    Relacionado: {playerFor(snapshot, event.related_player_id)?.display_name}
                  </small>
                )}
              </article>
            ))}
          </div>
        ) : (
          <Empty>No hay eventos registrados.</Empty>
        )}
      </Window>
    </>
  );
}

export function StandingsPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  const leagues = snapshot.competitions.filter(
    (item) => item.type === "league" && (item.status === "active" || item.status === "completed"),
  );
  return (
    <>
      <PageHeader
        eyebrow="Rendimiento"
        title="Clasificación"
        copy="Tablas derivadas exclusivamente de partidos finalizados."
      />
      {leagues.length ? (
        leagues.map((competition) => (
          <Window
            key={competition.id}
            title={`${competition.name} · ${snapshot.seasons.find((season) => season.id === competition.season_id)?.name ?? "Temporada"}`}
            status="Orden: PTS, DG, GF"
          >
            <StandingsTable snapshot={snapshot} competition={competition} />
          </Window>
        ))
      ) : (
        <Empty>No hay ligas publicadas.</Empty>
      )}
    </>
  );
}

export function StatsPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  const season = activeSeason(snapshot.seasons);
  const players = playerStatistics(snapshot, season?.id);
  const teams = teamStatistics(snapshot, season?.id);
  return (
    <>
      <PageHeader
        eyebrow={season?.name ?? association.seasonLabel}
        title="Estadísticas"
        copy="Datos básicos derivados de apariciones, eventos y resultados."
      />
      <Window title="Jugadores" status={`${players.length} jugadores`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Jugador</th>
                <th scope="col">POS</th>
                <th scope="col">PJ</th>
                <th scope="col">G</th>
                <th scope="col">A</th>
                <th scope="col">TA</th>
                <th scope="col">TR</th>
              </tr>
            </thead>
            <tbody>
              {players.map((row) => (
                <tr key={row.player.id}>
                  <td>
                    <Link to={`/players/${row.player.id}`}>{row.player.display_name}</Link>
                  </td>
                  <td>{row.player.position}</td>
                  <td>{row.appearances}</td>
                  <td>{row.goals}</td>
                  <td>{row.assists}</td>
                  <td>{row.yellowCards}</td>
                  <td>{row.redCards}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Window>
      <Window title="Equipos" status={`${teams.length} equipos`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Equipo</th>
                <th scope="col">PJ</th>
                <th scope="col">GF</th>
                <th scope="col">GC</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((row) => (
                <tr key={row.team.id}>
                  <td>
                    <TeamName team={row.team} />
                  </td>
                  <td>{row.matches}</td>
                  <td>{row.goalsFor}</td>
                  <td>{row.goalsAgainst}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Window>
    </>
  );
}

export function HistoryPage() {
  const { snapshot, loading } = useFootball();
  if (loading) return <Loader />;
  const seasons = snapshot.seasons
    .filter((item) => item.status === "completed" || item.status === "archived")
    .sort((left, right) => right.end_date.localeCompare(left.end_date));
  return (
    <>
      <PageHeader
        eyebrow="Archivo"
        title="Historial"
        copy="Temporadas cerradas, campeones, premios y resultados conservados."
      />
      {seasons.length ? (
        seasons.map((season) => {
          const competitions = snapshot.competitions.filter((item) => item.season_id === season.id);
          const awards = snapshot.awards.filter((item) => item.season_id === season.id);
          const finished = snapshot.matches.filter(
            (item) => item.season_id === season.id && item.status === "finished",
          );
          return (
            <Window
              key={season.id}
              title={season.name}
              status={`${competitions.length} competiciones · ${finished.length} resultados`}
            >
              <div className="history-grid">
                <div>
                  <h3>Competiciones</h3>
                  {competitions.map((item) => (
                    <Link key={item.id} to={`/competitions/${item.id}`}>
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div>
                  <h3>Premios</h3>
                  {awards.length ? (
                    awards.map((award) => (
                      <article key={award.id}>
                        <strong>{award.title}</strong>
                        <span>{award.award_type.replaceAll("_", " ")}</span>
                      </article>
                    ))
                  ) : (
                    <p>Sin premios registrados.</p>
                  )}
                </div>
              </div>
            </Window>
          );
        })
      ) : (
        <Empty>Aún no hay temporadas anteriores.</Empty>
      )}
    </>
  );
}
