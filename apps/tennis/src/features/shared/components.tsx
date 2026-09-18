import { EmptyState, LoadingPanel, StatusBadge, WindowPanel } from "@hartico/ui";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Match, MatchSet, Player, TennisSnapshot } from "../../domain/model";

export { EmptyState, LoadingPanel, StatusBadge, WindowPanel };
export function PageHeader({
  eyebrow,
  title,
  copy,
}: Readonly<{ eyebrow: string; title: string; copy: string }>) {
  return (
    <header className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </header>
  );
}
export const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("es-CL", {
        dateStyle: "medium",
        ...(value.includes("T") ? { timeStyle: "short" as const } : {}),
        timeZone: "UTC",
      }).format(new Date(value.includes("T") ? value : `${value}T00:00:00Z`))
    : "Sin programar";
export const playerFor = (snapshot: TennisSnapshot, id: string | null): Player | undefined =>
  snapshot.players.find((player) => player.id === id);
export function PlayerName({
  player,
  fallback = "Por definir",
}: Readonly<{ player: Player | undefined; fallback?: string }>) {
  return player ? (
    <Link to={`/players/${player.id}`}>{player.display_name}</Link>
  ) : (
    <span className="muted">{fallback}</span>
  );
}
export function PlayerMark({ player }: Readonly<{ player: Player | undefined }>) {
  return player?.avatar_url ? (
    <span className="player-avatar">
      <img src={player.avatar_url} alt="" />
    </span>
  ) : (
    <span className="player-avatar" aria-hidden="true">
      {player?.country_code ?? "—"}
    </span>
  );
}
export function SetScore({
  match,
  sets,
  snapshot,
}: Readonly<{ match: Match; sets: readonly MatchSet[]; snapshot: TennisSnapshot }>) {
  const ordered = [...sets].sort((a, b) => a.set_number - b.set_number);
  const row = (player: Player | undefined, side: 1 | 2) => (
    <div className={`score-row ${match.winner_id === player?.id ? "winner" : ""}`}>
      <PlayerName player={player} />
      {ordered.map((set) => (
        <strong key={set.id}>{side === 1 ? set.player1_score : set.player2_score}</strong>
      ))}
    </div>
  );
  return (
    <div className="set-score">
      {row(playerFor(snapshot, match.player1_id), 1)}
      {row(playerFor(snapshot, match.player2_id), 2)}
    </div>
  );
}
export function MetricStrip({
  items,
}: Readonly<{ items: readonly Readonly<{ label: string; value: ReactNode }>[] }>) {
  return (
    <div className="metric-strip">
      {items.map(({ label, value }) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </article>
      ))}
    </div>
  );
}
