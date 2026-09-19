import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useFootball } from "../../app/football-context";
import {
  generateCupBracket,
  generateLeagueFixture,
  isCupSize,
  isKnockoutTie,
  knockoutOutcome,
  leagueTopTie,
  seededOrder,
  stageLabels,
  supercupPairing,
} from "../../domain/formats";
import type { Competition, FootballSnapshot, Match, MutationPayload } from "../../domain/model";
import { competitionStandings } from "../../domain/rules";
import { Empty, StatusBadge, Window } from "../shared/components";
import { AdminGate } from "./admin-pages";

const DAY = 86_400_000;
const teamName = (snapshot: FootballSnapshot, id: string | null) =>
  snapshot.teams.find((team) => team.id === id)?.short_name ?? "Por definir";
const label = (match: Match) => (match.stage ? (stageLabels[match.stage] ?? match.stage) : `Jornada ${match.matchday ?? "—"}`);
const isDecided = (match: Match, competition: Competition) =>
  match.winner_team_id !== null || competition.champion_team_id !== null;

type Runner = (action: () => Promise<void>, done: string) => Promise<void>;

function MatchAdminRow({
  match,
  competition,
  snapshot,
  run,
  busy,
}: Readonly<{ match: Match; competition: Competition; snapshot: FootballSnapshot; run: Runner; busy: boolean }>) {
  const { repository } = useFootball();
  const [error, setError] = useState<string | null>(null);
  const [tiebreakWinner, setTiebreakWinner] = useState("");
  const [tiebreakNote, setTiebreakNote] = useState("");
  const decided = isDecided(match, competition);
  const ready = match.home_team_id !== null && match.away_team_id !== null;
  const pendingWinner = match.stage !== null && match.status === "finished" && match.winner_team_id === null;
  const tie = isKnockoutTie(match);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: MutationPayload = {
      status: "finished",
      home_score: Number(data.get("home_score")),
      away_score: Number(data.get("away_score")),
    };
    void run(async () => repository?.update("matches", match.id, payload), "Resultado guardado.");
  }

  function advance() {
    try {
      const decision = tie ? { winnerId: tiebreakWinner, note: tiebreakNote } : undefined;
      knockoutOutcome(match, decision);
      setError(null);
      void run(async () => repository?.advanceWinner(match.id, decision), "Ganador registrado y propagado.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo validar el resultado.");
    }
  }

  return (
    <article className="score-card" aria-label={`${label(match)} ${teamName(snapshot, match.home_team_id)} contra ${teamName(snapshot, match.away_team_id)}`}>
      <header>
        <strong>{label(match)}</strong>
        <StatusBadge status={match.status} />
        <span>
          {teamName(snapshot, match.home_team_id)} vs {teamName(snapshot, match.away_team_id)}
        </span>
        {match.home_score !== null && (
          <span className="score-live">
            {match.home_score}–{match.away_score}
          </span>
        )}
      </header>
      {decided ? (
        <p>
          Resultado bloqueado
          {match.winner_team_id && ` · ganador ${teamName(snapshot, match.winner_team_id)}`}
          {match.tiebreak_note && ` · ${match.tiebreak_note}`}
        </p>
      ) : (
        <form className="form-grid score-form" onSubmit={save}>
          <label htmlFor={`hs-${match.id}`}>
            Goles local
            <input id={`hs-${match.id}`} name="home_score" type="number" min={0} defaultValue={match.home_score ?? 0} required disabled={!ready} />
          </label>
          <label htmlFor={`as-${match.id}`}>
            Goles visita
            <input id={`as-${match.id}`} name="away_score" type="number" min={0} defaultValue={match.away_score ?? 0} required disabled={!ready} />
          </label>
          <div className="dialog-actions">
            <button type="submit" className="button" disabled={!ready || busy || pendingWinner}>
              Guardar y finalizar
            </button>
          </div>
        </form>
      )}
      {pendingWinner && !decided && (
        <div className="form-grid">
          {tie && (
            <>
              <p className="form-message">
                Empate eliminatorio: define al ganador según el reglamento de la asociación. No se
                resuelve al azar.
              </p>
              <label htmlFor={`tw-${match.id}`}>
                Ganador
                <select id={`tw-${match.id}`} value={tiebreakWinner} onChange={(event) => setTiebreakWinner(event.currentTarget.value)}>
                  <option value="">Seleccionar…</option>
                  {[match.home_team_id, match.away_team_id].map((id) => (
                    <option key={id} value={id ?? ""}>
                      {teamName(snapshot, id)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`tn-${match.id}`}>
                Mecanismo reglamentario aplicado
                <input id={`tn-${match.id}`} type="text" value={tiebreakNote} onChange={(event) => setTiebreakNote(event.currentTarget.value)} />
              </label>
            </>
          )}
          <div className="dialog-actions">
            <button type="button" className="button primary" disabled={busy} onClick={advance}>
              {tie ? "Definir ganador y avanzar" : "Avanzar ganador"}
            </button>
          </div>
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function LeagueClosing({ competition, snapshot, run, busy }: Readonly<{ competition: Competition; snapshot: FootballSnapshot; run: Runner; busy: boolean }>) {
  const { repository } = useFootball();
  const [champion, setChampion] = useState("");
  const [note, setNote] = useState("");
  const matches = snapshot.matches.filter((match) => match.competition_id === competition.id);
  const pending = matches.filter((match) => match.status !== "finished" && match.status !== "cancelled").length;
  const standings = competitionStandings(snapshot, competition.id);
  const tied = leagueTopTie(standings);
  const canClose = pending === 0 && matches.some((match) => match.status === "finished");
  if (competition.champion_team_id) return <p>Campeón: <strong>{teamName(snapshot, competition.champion_team_id)}</strong></p>;
  return (
    <div className="form-grid">
      <p>
        {canClose
          ? "Todos los partidos están finalizados: puedes cerrar la liga."
          : `Faltan ${pending} partido(s) por finalizar o cancelar.`}
      </p>
      {canClose && tied.length > 1 && (
        <>
          <p className="form-message">
            Empate en PTS, DG y GF en la cima. El administrador define al campeón con la regla de la asociación.
          </p>
          <label htmlFor="league-champion">
            Campeón
            <select id="league-champion" value={champion} onChange={(event) => setChampion(event.currentTarget.value)}>
              <option value="">Seleccionar…</option>
              {tied.map((id) => (
                <option key={id} value={id}>
                  {teamName(snapshot, id)}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="league-note">
            Regla aplicada
            <input id="league-note" type="text" value={note} onChange={(event) => setNote(event.currentTarget.value)} />
          </label>
        </>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button primary"
          disabled={!canClose || busy || (tied.length > 1 && (!champion || note.trim().length < 5))}
          onClick={() =>
            void run(
              async () => repository?.closeLeague(competition.id, tied.length > 1 ? { championId: champion, note } : undefined),
              "Liga cerrada y campeón registrado.",
            )
          }
        >
          Cerrar liga y registrar campeón
        </button>
      </div>
    </div>
  );
}

function SupercupForm({ competition, snapshot, run, busy }: Readonly<{ competition: Competition; snapshot: FootballSnapshot; run: Runner; busy: boolean }>) {
  const { repository } = useFootball();
  const [leagueId, setLeagueId] = useState("");
  const [cupId, setCupId] = useState("");
  const [opponent, setOpponent] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const leagues = snapshot.competitions.filter((item) => item.type === "league" && item.champion_team_id);
  const cups = snapshot.competitions.filter((item) => item.type === "cup" && item.champion_team_id);
  const pairing = leagueId && cupId
    ? supercupPairing(
        snapshot.competitions.find((item) => item.id === leagueId)?.champion_team_id ?? null,
        snapshot.competitions.find((item) => item.id === cupId)?.champion_team_id ?? null,
      )
    : null;
  const exists = snapshot.matches.some((match) => match.competition_id === competition.id);
  if (exists) return <p>La Supercopa ya tiene su enfrentamiento.</p>;
  return (
    <div className="form-grid">
      <label htmlFor="sc-league">
        Liga (campeón registrado)
        <select id="sc-league" value={leagueId} onChange={(event) => setLeagueId(event.currentTarget.value)}>
          <option value="">Seleccionar…</option>
          {leagues.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {teamName(snapshot, item.champion_team_id)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="sc-cup">
        Copa (campeón registrado)
        <select id="sc-cup" value={cupId} onChange={(event) => setCupId(event.currentTarget.value)}>
          <option value="">Seleccionar…</option>
          {cups.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} · {teamName(snapshot, item.champion_team_id)}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="sc-date">
        Fecha y hora
        <input id="sc-date" type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.currentTarget.value)} />
      </label>
      {pairing?.status === "missing" && <p className="form-message error">{pairing.reason}</p>}
      {pairing?.status === "needs_opponent" && (
        <>
          <p className="form-message">
            {teamName(snapshot, pairing.championId)} ganó Liga y Copa. Elige el rival según la norma de la
            asociación; no se selecciona automáticamente.
          </p>
          <label htmlFor="sc-opponent">
            Rival
            <select id="sc-opponent" value={opponent} onChange={(event) => setOpponent(event.currentTarget.value)}>
              <option value="">Seleccionar…</option>
              {snapshot.teams
                .filter((team) => team.status === "active" && team.id !== pairing.championId)
                .map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
            </select>
          </label>
        </>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="button primary"
          disabled={busy || !scheduledAt || !pairing || pairing.status === "missing" || (pairing.status === "needs_opponent" && !opponent)}
          onClick={() =>
            void run(
              async () =>
                repository?.generateSupercup({
                  competitionId: competition.id,
                  leagueId,
                  cupId,
                  scheduledAt: new Date(scheduledAt).toISOString(),
                  ...(pairing?.status === "needs_opponent" ? { opponentTeamId: opponent } : {}),
                }),
              "Supercopa generada.",
            )
          }
        >
          Generar enfrentamiento
        </button>
      </div>
    </div>
  );
}

// Consola de formatos: inscripción → fixture/cuadro → resultados → campeón → Supercopa.
export function CompetitionControlPage() {
  const { snapshot, repository, refresh } = useFootball();
  const [competitionId, setCompetitionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [spacing, setSpacing] = useState(7);
  const competition = snapshot.competitions.find(({ id }) => id === competitionId);
  const enrolled = snapshot.competitionTeams.filter((item) => item.competition_id === competitionId);
  const matches = snapshot.matches
    .filter((match) => match.competition_id === competitionId)
    .sort((a, b) => (a.round_order ?? 0) - (b.round_order ?? 0) || (a.matchday ?? 0) - (b.matchday ?? 0) || (a.match_number ?? 0) - (b.match_number ?? 0) || a.scheduled_at.localeCompare(b.scheduled_at));
  const order = seededOrder(enrolled);
  const hasFixture = matches.length > 0;

  const run: Runner = async (action, done) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      await refresh();
      setMessage(done);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "La operación no pudo completarse.");
    } finally {
      setBusy(false);
    }
  };

  function generate() {
    if (!competition || !repository || !startsAt) return;
    const start = new Date(startsAt).getTime();
    try {
      if (competition.type === "league") {
        const fixture = generateLeagueFixture(order, competition.legs);
        const payloads: MutationPayload[] = fixture.map((match) => ({
          competition_id: competition.id,
          season_id: competition.season_id,
          home_team_id: match.homeTeamId,
          away_team_id: match.awayTeamId,
          matchday: match.matchday,
          scheduled_at: new Date(start + (match.matchday - 1) * spacing * DAY).toISOString(),
          status: "scheduled",
        }));
        void run(async () => repository.createMany("matches", payloads), `Fixture generado: ${payloads.length} partidos.`);
      } else if (competition.type === "cup") {
        const bracket = generateCupBracket(order);
        const ids = new Map(bracket.map((draft) => [draft.key, crypto.randomUUID()]));
        const payloads: MutationPayload[] = bracket.map((draft) => ({
          id: ids.get(draft.key) ?? "",
          competition_id: competition.id,
          season_id: competition.season_id,
          home_team_id: draft.homeTeamId,
          away_team_id: draft.awayTeamId,
          scheduled_at: new Date(start + (draft.roundOrder - 1) * spacing * DAY).toISOString(),
          status: "scheduled",
          stage: draft.stage,
          round_order: draft.roundOrder,
          match_number: draft.matchNumber,
          next_match_id: draft.nextKey ? (ids.get(draft.nextKey) ?? null) : null,
          next_slot: draft.nextSlot,
        }));
        void run(async () => repository.createMany("matches", payloads), `Cuadro generado: ${payloads.length} partidos.`);
      }
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No se pudo generar el calendario.");
    }
  }

  const generable = competition && (competition.type === "league" ? order.length >= 2 : competition.type === "cup" ? isCupSize(order.length) : false);
  return (
    <AdminGate>
      <div className="admin-toolbar">
        <Link to="/admin">← Consola</Link>
        <span>Liga, Copa y Supercopa</span>
      </div>
      <header className="page-header">
        <p className="eyebrow">Administración</p>
        <h1>Formatos de competición</h1>
        <p>
          Genera fixtures y cuadros, registra resultados y campeones. Los empates eliminatorios y de
          la cima de la liga los define el administrador según la asociación.
        </p>
      </header>
      <Window title="Competición" status={competition ? `${competition.type} · ${enrolled.length} equipos inscritos · ${matches.length} partidos` : undefined}>
        <div className="form-grid">
          <label htmlFor="control-competition">
            Competición
            <select id="control-competition" value={competitionId} onChange={(event) => { setCompetitionId(event.currentTarget.value); setMessage(null); }}>
              <option value="">Seleccionar…</option>
              {snapshot.competitions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.type}
                </option>
              ))}
            </select>
          </label>
        </div>
        {competition && (
          <p>
            <StatusBadge status={competition.status} />{" "}
            {competition.champion_team_id ? `Campeón: ${teamName(snapshot, competition.champion_team_id)}` : "Sin campeón registrado"}
            {competition.type === "league" && ` · ${competition.legs === 2 ? "ida y vuelta" : "una vuelta"}`}
          </p>
        )}
        {message && <p className="form-message" role="status">{message}</p>}
      </Window>
      {competition && competition.type !== "supercup" && (
        <Window title="Inscripción y calendario" status={hasFixture ? "Fixture creado: inscripciones cerradas" : "Sin partidos"}>
          <p>
            Equipos inscritos: {order.map((id) => teamName(snapshot, id)).join(", ") || "ninguno"}.{" "}
            <Link to="/admin/competition-teams">Gestionar inscripciones</Link>
          </p>
          {!hasFixture && (
            <div className="form-grid">
              <label htmlFor="control-start">
                {competition.type === "league" ? "Fecha y hora de la jornada 1" : "Fecha y hora de la primera ronda"}
                <input id="control-start" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.currentTarget.value)} />
              </label>
              <label htmlFor="control-spacing">
                Días entre {competition.type === "league" ? "jornadas" : "rondas"}
                <input id="control-spacing" type="number" min={1} value={spacing} onChange={(event) => setSpacing(Math.max(1, Number(event.currentTarget.value)))} />
              </label>
              {!generable && (
                <p className="form-message error">
                  {competition.type === "league" ? "Inscribe al menos 2 equipos." : "La copa requiere exactamente 4, 8 o 16 equipos inscritos."}
                </p>
              )}
              <div className="dialog-actions">
                <button type="button" className="button primary" disabled={!generable || !startsAt || busy} onClick={generate}>
                  {competition.type === "league" ? "Generar fixture" : "Generar cuadro"}
                </button>
              </div>
            </div>
          )}
        </Window>
      )}
      {competition?.type === "league" && (
        <Window title="Cierre de la liga">
          <LeagueClosing competition={competition} snapshot={snapshot} run={run} busy={busy} />
        </Window>
      )}
      {competition?.type === "supercup" && (
        <Window title="Supercopa" status={competition.champion_team_id ? `Campeón: ${teamName(snapshot, competition.champion_team_id)}` : undefined}>
          <SupercupForm competition={competition} snapshot={snapshot} run={run} busy={busy} />
        </Window>
      )}
      {competition && (
        <Window title="Partidos y resultados" status={`${matches.length} partidos`}>
          {matches.length ? (
            <div className="score-list">
              {matches.map((match) => (
                <MatchAdminRow key={`${match.id}-${match.updated_at}`} match={match} competition={competition} snapshot={snapshot} run={run} busy={busy} />
              ))}
            </div>
          ) : (
            <Empty>Aún no hay partidos.</Empty>
          )}
        </Window>
      )}
    </AdminGate>
  );
}
