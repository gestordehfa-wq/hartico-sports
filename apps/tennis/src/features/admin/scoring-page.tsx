import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTennis } from "../../app/tennis-context";
import type { MatchScoreInput } from "../../data/repository";
import {
  formatGameScore,
  gamesToWin,
  gamesWinner,
  validateDirectResult,
  validateGamesScore,
} from "../../domain/games";
import {
  type GamePoints,
  gamePointValues,
  type Match,
  type TennisSnapshot,
  roundLabels,
} from "../../domain/model";
import { EmptyState, PlayerName, StatusBadge, WindowPanel, playerFor } from "../shared/components";
import { AdminGate, editions } from "./admin-pages";

type Actions = Readonly<{
  busy: boolean;
  onPoint(matchId: string, scorer: 1 | 2): void;
  onSave(matchId: string, score: MatchScoreInput, confirm: boolean): void;
  onConfirm(matchId: string): void;
}>;

function readScore(form: HTMLFormElement): MatchScoreInput {
  const data = new FormData(form);
  return {
    games1: Number(data.get("games1")),
    games2: Number(data.get("games2")),
    points1: Number(data.get("points1")),
    points2: Number(data.get("points2")),
  };
}

function MatchScoreCard({
  match,
  snapshot,
  actions,
}: Readonly<{ match: Match; snapshot: TennisSnapshot; actions: Actions }>) {
  const [error, setError] = useState<string | null>(null);
  const bestOf = match.games_best_of;
  if (bestOf === null) return null;
  const player1 = playerFor(snapshot, match.player1_id);
  const player2 = playerFor(snapshot, match.player2_id);
  const score = {
    games1: match.player1_games,
    games2: match.player2_games,
    points1: match.player1_points,
    points2: match.player2_points,
  };
  const decided = gamesWinner(score, bestOf) !== null;
  const locked = match.status === "finished" || match.status === "cancelled";
  const ready = Boolean(player1 && player2) && !locked;

  function submit(form: HTMLFormElement | null, confirm: boolean) {
    if (!bestOf || !form) return;
    const input = readScore(form);
    const problem = confirm
      ? validateDirectResult(input.games1, input.games2, bestOf)
      : validateGamesScore(input, bestOf);
    setError(problem);
    if (!problem) actions.onSave(match.id, confirm ? { ...input, points1: 0, points2: 0 } : input, confirm);
  }

  return (
    <article className="score-card" aria-label={`${roundLabels[match.round]} ${match.match_number}`}>
      <header>
        <strong>
          {roundLabels[match.round]} · #{match.match_number}
        </strong>
        <StatusBadge status={match.status} />
        <span className="score-live">{formatGameScore(score)}</span>
      </header>
      <p>
        <PlayerName player={player1} /> <span className="muted">vs</span>{" "}
        <PlayerName player={player2} />
      </p>
      <div className="dialog-actions">
        <button
          type="button"
          className="button"
          disabled={!ready || decided || actions.busy}
          onClick={() => actions.onPoint(match.id, 1)}
        >
          Punto {player1?.display_name ?? "J1"}
        </button>
        <button
          type="button"
          className="button"
          disabled={!ready || decided || actions.busy}
          onClick={() => actions.onPoint(match.id, 2)}
        >
          Punto {player2?.display_name ?? "J2"}
        </button>
        <button
          type="button"
          className="button primary"
          disabled={!ready || !decided || actions.busy}
          onClick={() => actions.onConfirm(match.id)}
        >
          Confirmar resultado
        </button>
      </div>
      {!locked && (
        <form
          key={`${match.id}-${match.updated_at}`}
          className="form-grid score-form"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            submit(event.currentTarget, false);
          }}
        >
          <label htmlFor={`g1-${match.id}`}>
            Juegos J1 (0–{gamesToWin(bestOf)})
            <input id={`g1-${match.id}`} name="games1" type="number" min={0} max={gamesToWin(bestOf)} defaultValue={match.player1_games} required />
          </label>
          <label htmlFor={`g2-${match.id}`}>
            Juegos J2 (0–{gamesToWin(bestOf)})
            <input id={`g2-${match.id}`} name="games2" type="number" min={0} max={gamesToWin(bestOf)} defaultValue={match.player2_games} required />
          </label>
          {[1, 2].map((slot) => (
            <label htmlFor={`p${slot}-${match.id}`} key={slot}>
              Puntos J{slot}
              <select id={`p${slot}-${match.id}`} name={`points${slot}`} defaultValue={slot === 1 ? match.player1_points : match.player2_points}>
                {gamePointValues.map((value: GamePoints) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <div className="dialog-actions">
            <button type="submit" className="button" disabled={!ready || actions.busy}>
              Guardar marcador
            </button>
            <button
              type="button"
              className="button primary"
              disabled={!ready || actions.busy}
              onClick={(event) => submit(event.currentTarget.form, true)}
            >
              Resultado directo y confirmar
            </button>
          </div>
          {error && (
            <p className="form-message error" role="alert">
              {error}
            </p>
          )}
        </form>
      )}
    </article>
  );
}

// Marcador en vivo y resultado directo para ediciones con formato de juegos.
export function AdminScoringPage() {
  const { snapshot, repository, refresh } = useTennis();
  const [editionId, setEditionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const edition = snapshot.editions.find(({ id }) => id === editionId);
  const matches = snapshot.matches
    .filter(({ tournament_edition_id }) => tournament_edition_id === editionId)
    .sort((a, b) => a.round_order - b.round_order || a.match_number - b.match_number);

  async function run(action: () => Promise<void>, done: string) {
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
  }
  const actions: Actions = {
    busy,
    onPoint: (matchId, scorer) =>
      void run(async () => repository?.recordPoint(matchId, scorer), "Punto registrado."),
    onSave: (matchId, score, confirm) =>
      void run(
        async () => repository?.setScore(matchId, score, confirm),
        confirm ? "Resultado confirmado y ganador propagado." : "Marcador guardado.",
      ),
    onConfirm: (matchId) =>
      void run(async () => repository?.confirmResult(matchId), "Resultado confirmado y ganador propagado."),
  };

  return (
    <AdminGate>
      <div className="admin-toolbar">
        <Link to="/admin">← Consola</Link>
        <span>Regla propia: 0 → 15 → 30 → 40 → 45 → juego, sin deuce</span>
      </div>
      <header className="page-header">
        <p className="eyebrow">Administración</p>
        <h1>Marcador en juegos</h1>
        <p>
          Registra puntos, corrige el marcador o carga un resultado directo. Confirmar propaga al
          ganador en el cuadro.
        </p>
      </header>
      <WindowPanel title="Edición">
        <div className="toolbar">
          <label htmlFor="scoring-edition">Edición</label>
          <select
            id="scoring-edition"
            value={editionId}
            onChange={(event) => {
              setEditionId(event.currentTarget.value);
              setMessage(null);
            }}
          >
            <option value="">Seleccionar…</option>
            {editions(snapshot).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {edition && (
          <p>
            Estado <StatusBadge status={edition.status} /> · formato{" "}
            {edition.scoring_format === "games"
              ? `mejor de ${edition.games_best_of} juegos (gana quien llega a ${gamesToWin(edition.games_best_of ?? 5)})`
              : `sets, mejor de ${edition.best_of} (v0.1)`}
          </p>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </WindowPanel>
      {edition?.scoring_format === "sets" && (
        <EmptyState title="Edición con formato de sets">
          Esta edición conserva el modelo v0.1: registra sets en «Sets y resultados» y confirma desde
          «Partidos».
        </EmptyState>
      )}
      {edition?.scoring_format === "games" &&
        (matches.length ? (
          <div className="score-list">
            {matches.map((match) => (
              <MatchScoreCard key={match.id} match={match} snapshot={snapshot} actions={actions} />
            ))}
          </div>
        ) : (
          <EmptyState>La edición aún no tiene cuadro. Genéralo desde «Generar cuadro».</EmptyState>
        ))}
    </AdminGate>
  );
}
