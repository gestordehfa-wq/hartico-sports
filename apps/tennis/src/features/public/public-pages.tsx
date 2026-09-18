import { DataGrid, type DataGridColumn } from "@hartico/ui";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useTennis } from "../../app/tennis-context";
import { association } from "../../config/association";
import type { Match, TennisSnapshot, TournamentEdition } from "../../domain/model";
import { roundLabels, surfaceLabels } from "../../domain/model";
import {
  activeSeason,
  headToHead,
  orderedRounds,
  playerStats,
  seasonRanking,
  type RankingRow,
} from "../../domain/rules";
import {
  EmptyState,
  formatDate,
  LoadingPanel,
  MetricStrip,
  PageHeader,
  PlayerMark,
  PlayerName,
  SetScore,
  StatusBadge,
  WindowPanel,
  playerFor,
} from "../shared/components";

function tournamentName(snapshot: TennisSnapshot, edition: TournamentEdition): string {
  return (
    edition.name ??
    snapshot.tournaments.find(({ id }) => id === edition.tournament_id)?.name ??
    "Torneo"
  );
}
function activeEdition(snapshot: TennisSnapshot): TournamentEdition | undefined {
  return snapshot.editions
    .filter(({ status }) => status === "active")
    .sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
}
function MatchLine({ match, snapshot }: Readonly<{ match: Match; snapshot: TennisSnapshot }>) {
  return (
    <Link className="match-row" to={`/matches/${match.id}`}>
      <time dateTime={match.scheduled_at ?? undefined}>{formatDate(match.scheduled_at)}</time>
      <span>
        <PlayerName player={playerFor(snapshot, match.player1_id)} />
      </span>
      <strong>vs</strong>
      <span>
        <PlayerName player={playerFor(snapshot, match.player2_id)} />
      </span>
      <StatusBadge status={match.status} />
    </Link>
  );
}
function RankingCompact({ rows }: Readonly<{ rows: readonly RankingRow[] }>) {
  return rows.length ? (
    <ol className="ranking-list">
      {rows.map((row) => (
        <li key={row.player.id}>
          <Link to={`/players/${row.player.id}`}>{row.player.display_name}</Link>
          <strong>{row.points}</strong>
          <small>pts</small>
        </li>
      ))}
    </ol>
  ) : (
    <EmptyState>El ranking se calcula al completar torneos.</EmptyState>
  );
}

export function HomePage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  const season = activeSeason(snapshot.seasons);
  const edition = activeEdition(snapshot);
  const ranking = season ? seasonRanking(snapshot, season.id).slice(0, 5) : [];
  const upcoming = snapshot.matches
    .filter(({ status }) => status === "scheduled")
    .sort((a, b) => (a.scheduled_at ?? "9999").localeCompare(b.scheduled_at ?? "9999"))
    .slice(0, 4);
  return (
    <>
      <div className="dashboard-title">
        <div>
          <p className="eyebrow">{association.holoName}</p>
          <h1>{association.name}</h1>
        </div>
        <div>
          <span>{season?.name ?? association.seasonLabel}</span>
          <StatusBadge
            status={season?.status ?? "draft"}
            label={season?.status === "active" ? "Activa" : "Sin temporada activa"}
          />
        </div>
      </div>
      <WindowPanel
        title="Torneo actual"
        status={
          edition
            ? `${edition.draw_size} jugadores · Mejor de ${edition.best_of}`
            : "Sin edición activa"
        }
      >
        {edition ? (
          <div className="current-tournament">
            <div>
              <p className="eyebrow">Single elimination</p>
              <h2>
                <Link to={`/tournaments/${edition.tournament_id}`}>
                  {tournamentName(snapshot, edition)}
                </Link>
              </h2>
            </div>
            <dl>
              <div>
                <dt>Superficie</dt>
                <dd>{surfaceLabels[edition.surface]}</dd>
              </div>
              <div>
                <dt>Fechas</dt>
                <dd>
                  {formatDate(edition.start_date)} — {formatDate(edition.end_date)}
                </dd>
              </div>
            </dl>
            <Link className="button primary" to={`/draws?edition=${edition.id}`}>
              Ver cuadro
            </Link>
          </div>
        ) : (
          <EmptyState>El torneo activo aparecerá cuando una edición sea publicada.</EmptyState>
        )}
      </WindowPanel>
      <div className="dashboard-columns">
        <WindowPanel title="Ranking">
          <RankingCompact rows={ranking} />
        </WindowPanel>
        <WindowPanel title="Próximos partidos">
          {upcoming.length ? (
            <div>
              {upcoming.map((match) => (
                <MatchLine key={match.id} match={match} snapshot={snapshot} />
              ))}
            </div>
          ) : (
            <EmptyState>No hay partidos programados.</EmptyState>
          )}
        </WindowPanel>
      </div>
    </>
  );
}

export function TournamentsPage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader
        eyebrow="Circuito propio"
        title="Torneos"
        copy="Identidades históricas y sus ediciones por temporada."
      />
      {snapshot.tournaments.length ? (
        <div className="record-grid">
          {snapshot.tournaments.map((tournament) => {
            const editions = snapshot.editions.filter(
              ({ tournament_id }) => tournament_id === tournament.id,
            );
            return (
              <Link
                className="record-card"
                to={`/tournaments/${tournament.id}`}
                key={tournament.id}
              >
                <span className="record-icon">
                  {tournament.short_name.slice(0, 3).toUpperCase()}
                </span>
                <div>
                  <StatusBadge status={tournament.status} />
                  <h2>{tournament.name}</h2>
                  <p>
                    {tournament.category} · {surfaceLabels[tournament.default_surface]} ·{" "}
                    {editions.length} ediciones
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState>No hay torneos publicados.</EmptyState>
      )}
    </>
  );
}
export function TournamentDetailPage() {
  const { id } = useParams();
  const { snapshot } = useTennis();
  const tournament = snapshot.tournaments.find((item) => item.id === id);
  if (!tournament) return <EmptyState>El torneo no existe o no está publicado.</EmptyState>;
  const editions = snapshot.editions
    .filter(({ tournament_id }) => tournament_id === tournament.id)
    .sort((a, b) => b.start_date.localeCompare(a.start_date));
  return (
    <>
      <PageHeader
        eyebrow={`${tournament.category} · ${surfaceLabels[tournament.default_surface]}`}
        title={tournament.name}
        copy={tournament.short_name}
      />
      <WindowPanel title="Ediciones" status={`${editions.length} ediciones`}>
        {editions.length ? (
          <div className="dense-list">
            {editions.map((edition) => (
              <article key={edition.id}>
                <div>
                  <strong>{tournamentName(snapshot, edition)}</strong>
                  <small>
                    {
                      snapshot.seasons.find(({ id: seasonId }) => seasonId === edition.season_id)
                        ?.name
                    }{" "}
                    · {surfaceLabels[edition.surface]}
                  </small>
                </div>
                <StatusBadge status={edition.status} />
                <Link to={`/draws?edition=${edition.id}`}>Cuadro →</Link>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>Aún no hay ediciones.</EmptyState>
        )}
      </WindowPanel>
    </>
  );
}

export function DrawsPage() {
  const { snapshot, loading } = useTennis();
  const [params, setParams] = useSearchParams();
  if (loading) return <LoadingPanel />;
  const editionId =
    params.get("edition") ?? activeEdition(snapshot)?.id ?? snapshot.editions[0]?.id;
  const edition = snapshot.editions.find(({ id }) => id === editionId);
  const matches = snapshot.matches
    .filter(({ tournament_edition_id }) => tournament_edition_id === editionId)
    .sort((a, b) => a.match_number - b.match_number);
  return (
    <>
      <PageHeader
        eyebrow="Single elimination"
        title="Cuadro"
        copy="Rondas enlazadas, resultados y avance hasta el campeón."
      />
      <div className="toolbar">
        <label htmlFor="draw-edition">Edición</label>
        <select
          id="draw-edition"
          value={editionId ?? ""}
          onChange={(event) => setParams({ edition: event.currentTarget.value })}
        >
          <option value="">Seleccionar…</option>
          {snapshot.editions.map((item) => (
            <option key={item.id} value={item.id}>
              {tournamentName(snapshot, item)} ·{" "}
              {snapshot.seasons.find(({ id }) => id === item.season_id)?.name}
            </option>
          ))}
        </select>
        {edition && (
          <>
            <StatusBadge status={edition.status} />
            <span>{surfaceLabels[edition.surface]}</span>
          </>
        )}
      </div>
      {edition && matches.length ? (
        <Bracket matches={matches} snapshot={snapshot} />
      ) : (
        <EmptyState>Selecciona una edición con cuadro generado.</EmptyState>
      )}
    </>
  );
}
function Bracket({
  matches,
  snapshot,
}: Readonly<{ matches: readonly Match[]; snapshot: TennisSnapshot }>) {
  return (
    <section className="bracket" aria-label="Cuadro del torneo">
      {orderedRounds(matches).map((round) => (
        <section className="bracket-round" key={round}>
          <h2>{roundLabels[round]}</h2>
          <div className="bracket-matches">
            {matches
              .filter((match) => match.round === round)
              .map((match) => (
                <Link className="bracket-match" to={`/matches/${match.id}`} key={match.id}>
                  <span className={match.winner_id === match.player1_id ? "winner" : ""}>
                    <PlayerName player={playerFor(snapshot, match.player1_id)} />
                    <i>
                      {snapshot.sets
                        .filter(({ match_id }) => match_id === match.id)
                        .filter((set) => set.player1_score > set.player2_score).length || ""}
                    </i>
                  </span>
                  <span className={match.winner_id === match.player2_id ? "winner" : ""}>
                    <PlayerName player={playerFor(snapshot, match.player2_id)} />
                    <i>
                      {snapshot.sets
                        .filter(({ match_id }) => match_id === match.id)
                        .filter((set) => set.player2_score > set.player1_score).length || ""}
                    </i>
                  </span>
                  <StatusBadge status={match.status} />
                </Link>
              ))}
          </div>
        </section>
      ))}
    </section>
  );
}

export function PlayersPage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  return (
    <>
      <PageHeader
        eyebrow="Singles"
        title="Jugadores"
        copy="Plantel independiente gestionado por la asociación."
      />
      {snapshot.players.length ? (
        <div className="record-grid">
          {snapshot.players.map((player) => (
            <Link className="record-card" to={`/players/${player.id}`} key={player.id}>
              <PlayerMark player={player} />
              <div>
                <StatusBadge status={player.status} />
                <h2>{player.display_name}</h2>
                <p>
                  {player.nationality} ·{" "}
                  {player.handedness === "left"
                    ? "Zurdo"
                    : player.handedness === "right"
                      ? "Diestro"
                      : "Mano no informada"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState>No hay jugadores publicados.</EmptyState>
      )}
    </>
  );
}
export function PlayerDetailPage() {
  const { id } = useParams();
  const { snapshot } = useTennis();
  const player = snapshot.players.find((item) => item.id === id);
  if (!player) return <EmptyState>El jugador no existe o no está publicado.</EmptyState>;
  const season = activeSeason(snapshot.seasons);
  const ranking = season ? seasonRanking(snapshot, season.id) : [];
  const position = ranking.findIndex((row) => row.player.id === player.id);
  const stats = playerStats(snapshot, player.id, season?.id);
  const titles = snapshot.matches
    .filter((match) => match.round === "final" && match.winner_id === player.id)
    .map((match) =>
      snapshot.editions.find(({ id: editionId }) => editionId === match.tournament_edition_id),
    )
    .filter((edition): edition is TournamentEdition => Boolean(edition));
  const recent = snapshot.matches
    .filter((match) => match.player1_id === player.id || match.player2_id === player.id)
    .sort((a, b) => (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at))
    .slice(0, 5);
  const recentEditions = snapshot.entries
    .filter(({ player_id }) => player_id === player.id)
    .flatMap((entry) => {
      const edition = snapshot.editions.find(
        ({ id: editionId }) => editionId === entry.tournament_edition_id,
      );
      return edition ? [edition] : [];
    })
    .sort((a, b) => b.end_date.localeCompare(a.end_date))
    .slice(0, 5);
  return (
    <>
      <PageHeader
        eyebrow={`${player.country_code} · ${player.status}`}
        title={player.display_name}
        copy={player.real_name ?? player.nationality}
      />
      <MetricStrip
        items={[
          { label: "Ranking", value: position >= 0 ? `#${position + 1}` : "—" },
          { label: "PJ", value: stats.played },
          { label: "Victorias", value: stats.wins },
          { label: "Títulos", value: stats.titles },
          { label: "Win rate", value: `${stats.winRate}%` },
        ]}
      />
      <div className="dashboard-columns">
        <WindowPanel title="Palmarés" status={`${titles.length} títulos`}>
          {titles.length ? (
            <div className="dense-list">
              {titles.map((edition) => (
                <article key={edition.id}>
                  <strong>{tournamentName(snapshot, edition)}</strong>
                  <span>
                    {
                      snapshot.seasons.find(({ id: seasonId }) => seasonId === edition.season_id)
                        ?.name
                    }
                  </span>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No registra títulos.</EmptyState>
          )}
        </WindowPanel>
        <WindowPanel title="Rivales directos">
          {snapshot.players
            .filter(({ id: otherId }) => otherId !== player.id)
            .slice(0, 8)
            .map((other) => (
              <Link
                className="h2h-link"
                to={`/players/${player.id}/h2h/${other.id}`}
                key={other.id}
              >
                vs {other.display_name}
              </Link>
            ))}
        </WindowPanel>
      </div>
      <WindowPanel title="Torneos recientes">
        {recentEditions.length ? (
          <div className="dense-list">
            {recentEditions.map((edition) => (
              <article key={edition.id}>
                <Link to={`/tournaments/${edition.tournament_id}`}>
                  {tournamentName(snapshot, edition)}
                </Link>
                <span>
                  {
                    snapshot.seasons.find(({ id: seasonId }) => seasonId === edition.season_id)
                      ?.name
                  }
                </span>
                <StatusBadge status={edition.status} />
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>Sin participaciones registradas.</EmptyState>
        )}
      </WindowPanel>
      <WindowPanel title="Partidos recientes">
        {recent.length ? (
          recent.map((match) => <MatchLine key={match.id} match={match} snapshot={snapshot} />)
        ) : (
          <EmptyState>Sin partidos registrados.</EmptyState>
        )}
      </WindowPanel>
    </>
  );
}

export function MatchesPage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  const matches = [...snapshot.matches].sort((a, b) =>
    (b.scheduled_at ?? b.created_at).localeCompare(a.scheduled_at ?? a.created_at),
  );
  return (
    <>
      <PageHeader
        eyebrow="Calendario"
        title="Partidos"
        copy="Programación y resultados de todas las ediciones publicadas."
      />
      {matches.length ? (
        <WindowPanel title="Todos los partidos" status={`${matches.length} partidos`}>
          {matches.map((match) => (
            <MatchLine key={match.id} match={match} snapshot={snapshot} />
          ))}
        </WindowPanel>
      ) : (
        <EmptyState>No hay partidos publicados.</EmptyState>
      )}
    </>
  );
}
export function MatchDetailPage() {
  const { id } = useParams();
  const { snapshot } = useTennis();
  const match = snapshot.matches.find((item) => item.id === id);
  if (!match) return <EmptyState>El partido no existe o no está publicado.</EmptyState>;
  const edition = snapshot.editions.find(
    ({ id: editionId }) => editionId === match.tournament_edition_id,
  );
  const sets = snapshot.sets.filter(({ match_id }) => match_id === match.id);
  return (
    <>
      <PageHeader
        eyebrow={`${edition ? tournamentName(snapshot, edition) : "Torneo"} · ${roundLabels[match.round]}`}
        title="Detalle del partido"
        copy={formatDate(match.scheduled_at)}
      />
      <WindowPanel
        title={
          <>
            <span>{roundLabels[match.round]}</span> <StatusBadge status={match.status} />
          </>
        }
        status={`Mejor de ${match.best_of}`}
      >
        <div className="match-detail">
          <div className="match-detail-player">
            <PlayerMark player={playerFor(snapshot, match.player1_id)} />
            <PlayerName player={playerFor(snapshot, match.player1_id)} />
          </div>
          <strong>vs</strong>
          <div className="match-detail-player">
            <PlayerMark player={playerFor(snapshot, match.player2_id)} />
            <PlayerName player={playerFor(snapshot, match.player2_id)} />
          </div>
        </div>
        {sets.length ? (
          <SetScore match={match} sets={sets} snapshot={snapshot} />
        ) : (
          <EmptyState>El resultado aún no tiene sets registrados.</EmptyState>
        )}
      </WindowPanel>
    </>
  );
}

export function RankingPage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  const season =
    activeSeason(snapshot.seasons) ?? snapshot.seasons.find(({ status }) => status === "completed");
  const rows = season ? seasonRanking(snapshot, season.id) : [];
  const columns: readonly DataGridColumn<RankingRow>[] = [
    { key: "position", label: "Pos.", render: (row) => rows.indexOf(row) + 1 },
    { key: "player", label: "Jugador", render: (row) => <PlayerName player={row.player} /> },
    { key: "points", label: "Puntos", render: (row) => <strong>{row.points}</strong> },
    { key: "played", label: "Torneos", render: (row) => row.tournamentsPlayed },
    { key: "titles", label: "Títulos", render: (row) => row.titles },
  ];
  return (
    <>
      <PageHeader
        eyebrow={season?.name ?? "Temporada"}
        title="Ranking"
        copy="Puntos derivados de resultados y reglas configurables por categoría."
      />
      <WindowPanel title="Ranking de temporada" status={`${rows.length} jugadores`}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowKey={(row) => row.player.id}
          empty="No existen resultados puntuables."
        />
      </WindowPanel>
    </>
  );
}
export function StatsPage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  const season = activeSeason(snapshot.seasons);
  const rows = snapshot.players
    .map((player) => ({ player, ...playerStats(snapshot, player.id, season?.id) }))
    .filter(({ played }) => played > 0)
    .sort((a, b) => b.wins - a.wins || b.titles - a.titles);
  return (
    <>
      <PageHeader
        eyebrow={season?.name ?? "Histórico"}
        title="Estadísticas"
        copy="Rendimiento derivado de partidos y sets confirmados."
      />
      <WindowPanel title="Jugadores" status={`${rows.length} con actividad`}>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Jugador</th>
                <th>PJ</th>
                <th>V</th>
                <th>D</th>
                <th>%</th>
                <th>Títulos</th>
                <th>Finales</th>
                <th>Sets +</th>
                <th>Sets -</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.player.id}>
                  <td>
                    <PlayerName player={row.player} />
                  </td>
                  <td>{row.played}</td>
                  <td>{row.wins}</td>
                  <td>{row.losses}</td>
                  <td>{row.winRate}%</td>
                  <td>{row.titles}</td>
                  <td>{row.finals}</td>
                  <td>{row.setsWon}</td>
                  <td>{row.setsLost}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="table-empty">No hay estadísticas confirmadas.</div>}
        </div>
      </WindowPanel>
    </>
  );
}
export function HeadToHeadPage() {
  const params = useParams();
  const { snapshot } = useTennis();
  const [query, setQuery] = useSearchParams();
  const aId = params.id ?? query.get("a") ?? snapshot.players[0]?.id;
  const bId =
    params.opponentId ?? query.get("b") ?? snapshot.players.find(({ id }) => id !== aId)?.id;
  const a = playerFor(snapshot, aId ?? null);
  const b = playerFor(snapshot, bId ?? null);
  const result = a && b ? headToHead(snapshot, a.id, b.id) : null;
  return (
    <>
      <PageHeader
        eyebrow="Comparador"
        title="Head-to-Head"
        copy="Enfrentamientos directos y sets registrados."
      />
      <div className="toolbar">
        <select
          aria-label="Jugador A"
          value={aId ?? ""}
          onChange={(event) => setQuery({ a: event.currentTarget.value, b: bId ?? "" })}
        >
          {snapshot.players.map((player) => (
            <option value={player.id} key={player.id}>
              {player.display_name}
            </option>
          ))}
        </select>
        <span>vs</span>
        <select
          aria-label="Jugador B"
          value={bId ?? ""}
          onChange={(event) => setQuery({ a: aId ?? "", b: event.currentTarget.value })}
        >
          {snapshot.players
            .filter(({ id }) => id !== aId)
            .map((player) => (
              <option value={player.id} key={player.id}>
                {player.display_name}
              </option>
            ))}
        </select>
      </div>
      {a && b && result ? (
        <WindowPanel title={`${a.display_name} vs ${b.display_name}`}>
          <div className="h2h-score">
            <div className="h2h-score-player">
              <PlayerMark player={a} />
              <strong>{result.playerAWins}</strong>
              <span>victorias · {result.playerASets} sets</span>
            </div>
            <b>{result.matches}</b>
            <div className="h2h-score-player">
              <PlayerMark player={b} />
              <strong>{result.playerBWins}</strong>
              <span>victorias · {result.playerBSets} sets</span>
            </div>
          </div>
        </WindowPanel>
      ) : (
        <EmptyState>Se necesitan dos jugadores.</EmptyState>
      )}
    </>
  );
}
export function HistoryPage() {
  const { snapshot, loading } = useTennis();
  if (loading) return <LoadingPanel />;
  const completed = snapshot.editions
    .filter(({ status }) => status === "completed")
    .sort((a, b) => b.end_date.localeCompare(a.end_date));
  return (
    <>
      <PageHeader
        eyebrow="Archivo"
        title="Historial"
        copy="Temporadas, campeones y premios conservados por edición."
      />
      {snapshot.seasons.map((season) => {
        const editions = completed.filter(({ season_id }) => season_id === season.id);
        const awards = snapshot.awards.filter(({ season_id }) => season_id === season.id);
        return (
          <WindowPanel
            key={season.id}
            title={
              <>
                {season.name} <StatusBadge status={season.status} />
              </>
            }
            status={`${editions.length} torneos · ${awards.length} awards`}
          >
            <div className="history-grid">
              <div>
                <h3>Campeones</h3>
                {editions.map((edition) => {
                  const final = snapshot.matches.find(
                    (match) =>
                      match.tournament_edition_id === edition.id && match.round === "final",
                  );
                  return (
                    <article key={edition.id}>
                      <strong>{tournamentName(snapshot, edition)}</strong>
                      <PlayerName player={playerFor(snapshot, final?.winner_id ?? null)} />
                    </article>
                  );
                })}
              </div>
              <div>
                <h3>Awards</h3>
                {awards.map((award) => (
                  <article key={award.id}>
                    <strong>{award.title}</strong>
                    <PlayerName player={playerFor(snapshot, award.player_id)} />
                  </article>
                ))}
              </div>
            </div>
          </WindowPanel>
        );
      })}
      {!snapshot.seasons.length && <EmptyState>No hay historia publicada.</EmptyState>}
    </>
  );
}
