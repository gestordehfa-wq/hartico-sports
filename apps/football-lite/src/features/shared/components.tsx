import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  EmptyState as SharedEmptyState,
  LoadingPanel,
  StatusBadge as SharedStatusBadge,
  WindowPanel,
} from "@hartico/ui";
import type { Match, MatchStatus, Team } from "../../domain/model";

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
export function Empty({ children }: Readonly<{ children: ReactNode }>) {
  return <SharedEmptyState>{children}</SharedEmptyState>;
}
export function Loader() {
  return <LoadingPanel>Cargando información…</LoadingPanel>;
}
export function StatusBadge({ status }: Readonly<{ status: string }>) {
  return <SharedStatusBadge status={status} />;
}
export function Window({
  title,
  children,
  status,
}: Readonly<{ title: string; children: ReactNode; status?: string | undefined }>) {
  return (
    <WindowPanel title={title} status={status}>
      {children}
    </WindowPanel>
  );
}
export function TeamMark({ team }: Readonly<{ team: Team | undefined }>) {
  if (!team) return <span className="team-mark">?</span>;
  return team.logo_url ? (
    <span className="team-mark">
      <img src={team.logo_url} alt="" />
    </span>
  ) : (
    <span className="team-mark" aria-hidden="true">
      {team.code}
    </span>
  );
}
export function TeamName({ team }: Readonly<{ team: Team | undefined }>) {
  return team ? (
    <Link to={`/teams/${team.id}`}>{team.name}</Link>
  ) : (
    <span>Equipo no disponible</span>
  );
}
export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
export function score(match: Match): string {
  return match.home_score === null || match.away_score === null
    ? "vs"
    : `${match.home_score} — ${match.away_score}`;
}
export function matchStatusLabel(status: MatchStatus): string {
  return {
    scheduled: "Programado",
    live: "En juego",
    finished: "Finalizado",
    postponed: "Postergado",
    cancelled: "Cancelado",
  }[status];
}
export function MatchRow({
  match,
  home,
  away,
}: Readonly<{ match: Match; home: Team | undefined; away: Team | undefined }>) {
  return (
    <Link className="match-row" to={`/matches/${match.id}`}>
      <time dateTime={match.scheduled_at}>{formatDate(match.scheduled_at)}</time>
      <span className="match-team">
        <TeamMark team={home} />
        {home?.short_name ?? "—"}
      </span>
      <strong>{score(match)}</strong>
      <span className="match-team away">
        {away?.short_name ?? "—"}
        <TeamMark team={away} />
      </span>
      <StatusBadge status={match.status} />
    </Link>
  );
}
