import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { DataGrid, EmptyState, LoadingPanel, StatusBadge, WindowPanel } from "@hartico/ui";
import { useRacing } from "../../app/racing-context";
import type { AttemptStatus, RacingSnapshot } from "../../domain/model";
import {
  buildGrid, classifiedResults, driverStandings, formatLapTime, isConfirmed, pitCompliance,
  pitComplianceLabels, raceLapsFor, teamStandings,
} from "../../domain/results";
import { activeSeason, orderedCalendar } from "../../domain/rules";

const Header = ({ eyebrow, title, copy }: Readonly<{ eyebrow: string; title: string; copy: string }>) => <header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header>;
const driverName = (snapshot: RacingSnapshot, id: string) => snapshot.drivers.find((driver) => driver.id === id)?.display_name ?? "—";
const teamName = (snapshot: RacingSnapshot, id: string) => snapshot.teams.find((team) => team.id === id)?.name ?? "—";
const attemptLabel = (status: AttemptStatus, ms: number | null) => (status === "valid" ? formatLapTime(ms) : status === "invalid" ? "Inválido" : "Sin registro");

const flowSteps = ["Gran Premio", "Clasificación", "Parrilla", "Carrera", "Resultados", "Campeonato"] as const;

export function GrandPrixDetailPage() {
  const { id } = useParams();
  const { snapshot, loading } = useRacing();
  if (loading) return <LoadingPanel>Cargando Gran Premio…</LoadingPanel>;
  const event = snapshot.grandPrix.find((item) => item.id === id);
  if (!event) return <EmptyState title="Gran Premio no disponible">El evento no existe o no está publicado.</EmptyState>;
  const circuit = snapshot.circuits.find((item) => item.id === event.circuit_id);
  const confirmed = isConfirmed(snapshot, event.id);
  const qualifying = snapshot.qualifying.filter((item) => item.grand_prix_id === event.id);
  const grid = buildGrid(qualifying);
  const attempts = new Map(qualifying.map((item) => [item.driver_id, item]));
  const results = classifiedResults(snapshot.raceResults.filter((item) => item.grand_prix_id === event.id));
  const laps = raceLapsFor(event, circuit?.default_laps ?? 0);
  const reached = [true, qualifying.length > 0, qualifying.length > 0, confirmed, confirmed, confirmed];

  return <>
    <Header eyebrow={`Ronda ${event.round_number} · ${circuit?.name ?? "Circuito"}`} title={event.name} copy={`${laps || "—"} vueltas · una parada obligatoria a pits · ${confirmed ? "resultados confirmados" : "resultados pendientes de confirmación"}`} />
    <ol className="flow-steps" aria-label="Flujo del Gran Premio">{flowSteps.map((step, index) => <li key={step} className={reached[index] ? "done" : undefined}>{step}</li>)}</ol>
    <WindowPanel title="Clasificación y parrilla" status={`${grid.length} pilotos · mejor tiempo de dos intentos`} className="data-window">
      <DataGrid rows={grid} rowKey={(slot) => slot.driver_id} empty="La clasificación aún no ha sido publicada." columns={[
        { key: "pos", label: "Parrilla", render: (slot) => slot.position },
        { key: "driver", label: "Piloto", render: (slot) => driverName(snapshot, slot.driver_id) },
        { key: "team", label: "Escudería", render: (slot) => teamName(snapshot, slot.team_id) },
        { key: "a1", label: "Intento 1", render: (slot) => { const row = attempts.get(slot.driver_id); return row ? attemptLabel(row.attempt_1_status, row.attempt_1_ms) : "—"; } },
        { key: "a2", label: "Intento 2", render: (slot) => { const row = attempts.get(slot.driver_id); return row ? attemptLabel(row.attempt_2_status, row.attempt_2_ms) : "—"; } },
        { key: "best", label: "Mejor", render: (slot) => <strong>{formatLapTime(slot.best_time_ms)}</strong> },
      ]} />
    </WindowPanel>
    <WindowPanel title="Resultados de carrera" status={confirmed ? "Confirmados" : "Pendientes"} className="data-window">
      {!confirmed ? <EmptyState title="Resultados pendientes">Se publican cuando la administración los confirma.</EmptyState> : <DataGrid rows={results} rowKey={(result) => result.id} columns={[
        { key: "pos", label: "Pos", render: (result) => result.final_position ?? result.status.toUpperCase() },
        { key: "driver", label: "Piloto", render: (result) => driverName(snapshot, result.driver_id) },
        { key: "team", label: "Escudería", render: (result) => teamName(snapshot, result.team_id) },
        { key: "grid", label: "Salida", render: (result) => result.grid_position ?? "—" },
        { key: "laps", label: "Vueltas", render: (result) => `${result.laps_completed}/${laps}` },
        { key: "time", label: "Tiempo", render: (result) => formatLapTime(result.total_time_ms) },
        { key: "pit", label: "Parada en pits", render: (result) => { const compliance = pitCompliance(result); return <span title={result.pit_resolution_note ?? undefined}>{compliance === "completed" ? `Vuelta ${result.pit_stop_lap}` : pitComplianceLabels[compliance]}</span>; } },
        { key: "points", label: "Puntos", render: (result) => <strong>{result.points ?? 0}</strong> },
      ]} />}
    </WindowPanel>
    <p><Link to="/championship">Ver campeonato →</Link></p>
  </>;
}

export function ChampionshipPage() {
  const { snapshot, loading } = useRacing();
  const [chosen, setChosen] = useState("");
  if (loading) return <LoadingPanel>Cargando campeonato…</LoadingPanel>;
  const fallback = activeSeason(snapshot.seasons) ?? snapshot.seasons[0];
  const season = snapshot.seasons.find(({ id }) => id === chosen) ?? fallback;
  if (!season) return <EmptyState title="Sin temporada publicada">El campeonato aparecerá cuando exista una temporada activa o completada.</EmptyState>;
  const drivers = driverStandings(snapshot, season.id);
  const teams = teamStandings(snapshot, season.id);
  const races = orderedCalendar(snapshot.grandPrix.filter((event) => event.season_id === season.id));
  const scale = snapshot.pointsScale.filter((entry) => entry.season_id === season.id).sort((left, right) => left.race_position - right.race_position);
  const winnerOf = (eventId: string) => snapshot.raceResults.find((result) => result.grand_prix_id === eventId && result.final_position === 1);

  return <>
    <Header eyebrow={season.name} title="Campeonato" copy="Clasificaciones calculadas solo con resultados confirmados. Cada carrera conserva la escudería representada en ese Gran Premio." />
    {snapshot.seasons.length > 1 && <div className="admin-toolbar"><label htmlFor="season-picker">Temporada <select id="season-picker" value={season.id} onChange={(event) => setChosen(event.target.value)}>{snapshot.seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>}
    <WindowPanel title="Pilotos" status={`${drivers.length} pilotos`} className="data-window">
      <DataGrid rows={drivers} rowKey={(row) => row.id} empty="Aún no hay resultados confirmados." columns={[
        { key: "pos", label: "Pos", render: (row) => drivers.indexOf(row) + 1 },
        { key: "driver", label: "Piloto", render: (row) => <Link to={`/drivers/${row.id}`}>{row.name}</Link> },
        { key: "teams", label: "Escudería(s)", render: (row) => row.teamIds.map((teamId) => teamName(snapshot, teamId)).join(" / ") },
        { key: "wins", label: "Victorias", render: (row) => row.wins }, { key: "podiums", label: "Podios", render: (row) => row.podiums },
        { key: "races", label: "Carreras", render: (row) => row.races }, { key: "points", label: "Puntos", render: (row) => <strong>{row.points}</strong> },
      ]} />
    </WindowPanel>
    <WindowPanel title="Escuderías" status={`${teams.length} escuderías`} className="data-window">
      <DataGrid rows={teams} rowKey={(row) => row.id} empty="Aún no hay resultados confirmados." columns={[
        { key: "pos", label: "Pos", render: (row) => teams.indexOf(row) + 1 },
        { key: "team", label: "Escudería", render: (row) => <Link to={`/teams/${row.id}`}>{row.name}</Link> },
        { key: "wins", label: "Victorias", render: (row) => row.wins }, { key: "podiums", label: "Podios", render: (row) => row.podiums },
        { key: "points", label: "Puntos", render: (row) => <strong>{row.points}</strong> },
      ]} />
    </WindowPanel>
    <WindowPanel title="Resultados por Gran Premio" status={`${races.length} rondas`} className="data-window">
      <DataGrid rows={races} rowKey={(event) => event.id} empty="No hay Grandes Premios publicados." columns={[
        { key: "round", label: "Ronda", render: (event) => event.round_number },
        { key: "gp", label: "Gran Premio", render: (event) => <Link to={`/grand-prix/${event.id}`}>{event.name}</Link> },
        { key: "status", label: "Estado", render: (event) => <StatusBadge status={isConfirmed(snapshot, event.id) ? "completed" : event.status} label={isConfirmed(snapshot, event.id) ? "confirmado" : event.status} /> },
        { key: "winner", label: "Ganador", render: (event) => { const winner = winnerOf(event.id); return winner ? `${driverName(snapshot, winner.driver_id)} · ${teamName(snapshot, winner.team_id)}` : "—"; } },
      ]} />
    </WindowPanel>
    <WindowPanel title="Puntos por posición" status="Configurables por temporada" className="data-window">
      <DataGrid rows={scale} rowKey={(entry) => entry.id} empty="La administración aún no configuró la escala de puntos." columns={[
        { key: "position", label: "Posición", render: (entry) => entry.race_position }, { key: "points", label: "Puntos", render: (entry) => entry.points },
      ]} />
    </WindowPanel>
  </>;
}
