import { Link, useParams } from "react-router-dom";
import { useRacing } from "../../app/racing-context";
import type { Circuit, GrandPrixEvent, RacingSnapshot } from "../../domain/model";
import { activeSeason, currentEntries, nextGrandPrix, orderedCalendar } from "../../domain/rules";

const formatDate = (value: string) => new Intl.DateTimeFormat("es-CL", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
const Country = ({ name, code }: Readonly<{ name: string; code: string }>) => <span className="country"><span aria-hidden="true">{code}</span>{name}</span>;
const PageHeader = ({ eyebrow, title, copy }: Readonly<{ eyebrow: string; title: string; copy: string }>) => <header className="page-header"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{copy}</p></header>;
const Empty = ({ children }: Readonly<{ children: string }>) => <div className="empty-state"><h2>Aún no hay información publicada</h2><p>{children}</p></div>;
const Loader = () => <div className="loading" role="status">Cargando campeonato…</div>;
const circuitFor = (snapshot: RacingSnapshot, event: GrandPrixEvent): Circuit | undefined => snapshot.circuits.find(({ id }) => id === event.circuit_id);

function GrandPrixCard({ event, circuit, featured = false }: Readonly<{ event: GrandPrixEvent; circuit: Circuit | undefined; featured?: boolean }>) {
  return <article className={featured ? "gp-card featured" : "gp-card"}><div className="round">Ronda <strong>{String(event.round_number).padStart(2, "0")}</strong></div><div><span className={`status ${event.status}`}>{event.status}</span><h3>{event.name}</h3><p>{circuit?.name ?? "Circuito pendiente"} · {circuit?.country ?? "País pendiente"} · {event.race_laps ?? circuit?.default_laps ?? "—"} vueltas</p></div><time dateTime={event.scheduled_date}>{formatDate(event.scheduled_date)}</time></article>;
}

export function HomePage() {
  const { snapshot, loading } = useRacing(); if (loading) return <Loader />;
  const season = activeSeason(snapshot.seasons);
  const events = season ? orderedCalendar(snapshot.grandPrix.filter((event) => event.season_id === season.id)) : [];
  const upcoming = nextGrandPrix(events); const entries = season ? currentEntries(snapshot, season.id) : [];
  const teamCount = new Set(entries.map(({ team_id }) => team_id)).size;
  return <><section className="home-hero"><div><p className="eyebrow">Campeonato independiente</p><h1>Competición con<br /><em>historia propia.</em></h1><p>Temporadas, pilotos, escuderías y circuitos en una plataforma técnica y transparente.</p><Link className="button primary" to="/season">Explorar campeonato</Link></div><div className="hero-panel"><span className="label">Temporada activa</span><strong>{season?.name ?? "Sin publicar"}</strong><dl><div><dt>Pilotos</dt><dd>{entries.length}</dd></div><div><dt>Escuderías</dt><dd>{teamCount}</dd></div><div><dt>Rondas</dt><dd>{events.length}</dd></div></dl></div></section>
    <section className="feature-section"><div className="section-heading"><div><p className="eyebrow">En pista</p><h2>Próximo Gran Premio</h2></div><Link to="/calendar">Calendario completo →</Link></div>{upcoming ? <GrandPrixCard event={upcoming} circuit={circuitFor(snapshot, upcoming)} featured /> : <Empty>El próximo evento aparecerá cuando el calendario activo tenga una fecha programada.</Empty>}</section>
    <section className="feature-section"><div className="section-heading"><div><p className="eyebrow">Próximas fechas</p><h2>Calendario</h2></div></div>{events.length ? <div className="calendar-strip">{events.filter((event) => event.status !== "completed").slice(0, 3).map((event) => <GrandPrixCard key={event.id} event={event} circuit={circuitFor(snapshot, event)} />)}</div> : <Empty>No hay rondas publicadas para una temporada activa.</Empty>}</section></>;
}

export function SeasonPage() {
  const { snapshot, loading } = useRacing(); if (loading) return <Loader />; const season = activeSeason(snapshot.seasons);
  return <><PageHeader eyebrow="Campeonato" title={season?.name ?? "Temporada"} copy="La estructura oficial del campeonato actualmente publicado." />{!season ? <Empty>No existe una temporada activa.</Empty> : <div className="detail-grid"><article className="info-card"><span className="label">Estado</span><strong>{season.status}</strong></article><article className="info-card"><span className="label">Inicio</span><strong>{formatDate(season.start_date)}</strong></article><article className="info-card"><span className="label">Final</span><strong>{formatDate(season.end_date)}</strong></article></div>}</>;
}

export function DriversPage() {
  const { snapshot, loading } = useRacing(); if (loading) return <Loader />; const season = activeSeason(snapshot.seasons); const entries = season ? currentEntries(snapshot, season.id) : [];
  return <><PageHeader eyebrow="Campeonato" title="Pilotos" copy="Los protagonistas inscritos en la temporada activa." />{!snapshot.drivers.length ? <Empty>No hay pilotos publicados.</Empty> : <div className="card-grid">{snapshot.drivers.map((driver) => { const entry = entries.find((item) => item.driver_id === driver.id); const team = snapshot.teams.find((item) => item.id === entry?.team_id); return <Link className="person-card" to={`/drivers/${driver.id}`} key={driver.id}><div className="number">{entry?.racing_number ?? driver.racing_number ?? "—"}</div><div><h2>{driver.display_name}</h2><Country name={driver.nationality} code={driver.country_code} /><p>{team?.name ?? "Sin escudería activa"}</p></div></Link>; })}</div>}</>;
}

export function DriverDetailPage() {
  const { id } = useParams(); const { snapshot } = useRacing(); const driver = snapshot.drivers.find((item) => item.id === id); if (!driver) return <Empty>El piloto no existe o no está publicado.</Empty>; const participations = snapshot.entries.filter((item) => item.driver_id === driver.id);
  return <><PageHeader eyebrow={`Piloto · ${driver.racing_number ?? "sin número"}`} title={driver.display_name} copy={driver.real_name ?? "Perfil deportivo"} /><div className="detail-grid"><article className="info-card"><span className="label">Nacionalidad</span><strong>{driver.nationality}</strong><small>{driver.country_code}</small></article><article className="info-card"><span className="label">Estado</span><strong>{driver.status}</strong></article></div><section className="feature-section"><h2>Participaciones</h2>{participations.length ? <div className="list-stack">{participations.map((entry) => <article key={entry.id}><strong>{snapshot.seasons.find(({ id: seasonId }) => seasonId === entry.season_id)?.name}</strong><span>{snapshot.teams.find(({ id: teamId }) => teamId === entry.team_id)?.name} · {entry.role}</span></article>)}</div> : <Empty>No hay participaciones públicas para este piloto.</Empty>}</section></>;
}

export function TeamsPage() {
  const { snapshot, loading } = useRacing(); if (loading) return <Loader />; const season = activeSeason(snapshot.seasons); const entries = season ? currentEntries(snapshot, season.id) : [];
  return <><PageHeader eyebrow="Campeonato" title="Escuderías" copy="Equipos inscritos y su alineación para la temporada activa." />{!snapshot.teams.length ? <Empty>No hay escuderías publicadas.</Empty> : <div className="card-grid">{snapshot.teams.map((team) => <Link className="team-card" style={{ borderTopColor: team.primary_color ?? "#e8ff47" }} to={`/teams/${team.id}`} key={team.id}><span className="team-code">{team.code}</span><h2>{team.name}</h2><Country name={team.country} code={team.country_code} /><p>{entries.filter((entry) => entry.team_id === team.id).map((entry) => snapshot.drivers.find((driver) => driver.id === entry.driver_id)?.display_name).filter(Boolean).join(" · ") || "Sin pilotos activos"}</p></Link>)}</div>}</>;
}

export function TeamDetailPage() {
  const { id } = useParams(); const { snapshot } = useRacing(); const team = snapshot.teams.find((item) => item.id === id); if (!team) return <Empty>La escudería no existe o no está publicada.</Empty>; const entries = snapshot.entries.filter((entry) => entry.team_id === team.id);
  return <><PageHeader eyebrow={`Escudería · ${team.code}`} title={team.name} copy={`${team.short_name} · ${team.country}`} /><section className="feature-section"><h2>Pilotos por temporada</h2>{entries.length ? <div className="list-stack">{entries.map((entry) => <article key={entry.id}><strong>{snapshot.drivers.find((driver) => driver.id === entry.driver_id)?.display_name}</strong><span>{snapshot.seasons.find((season) => season.id === entry.season_id)?.name} · {entry.role}</span></article>)}</div> : <Empty>No hay participaciones públicas.</Empty>}</section></>;
}

export function CircuitsPage() {
  const { snapshot, loading } = useRacing(); if (loading) return <Loader />;
  return <><PageHeader eyebrow="Sedes" title="Circuitos" copy="Trazados que forman parte de la historia del campeonato." />{!snapshot.circuits.length ? <Empty>No hay circuitos publicados.</Empty> : <div className="card-grid">{snapshot.circuits.map((circuit) => <Link className="circuit-card" to={`/circuits/${circuit.id}`} key={circuit.id}><span className="team-code">{circuit.country_code}</span><h2>{circuit.name}</h2><p>{[circuit.city, circuit.country].filter(Boolean).join(", ")}</p><dl><div><dt>Longitud</dt><dd>{circuit.length_km ? `${circuit.length_km} km` : "—"}</dd></div><div><dt>Vueltas base</dt><dd>{circuit.default_laps}</dd></div></dl></Link>)}</div>}</>;
}

export function CircuitDetailPage() {
  const { id } = useParams(); const { snapshot } = useRacing(); const circuit = snapshot.circuits.find((item) => item.id === id); if (!circuit) return <Empty>El circuito no existe o no está publicado.</Empty>; const events = orderedCalendar(snapshot.grandPrix.filter((event) => event.circuit_id === circuit.id));
  return <><PageHeader eyebrow={circuit.country_code} title={circuit.name} copy={[circuit.city, circuit.country].filter(Boolean).join(", ")} /><div className="detail-grid"><article className="info-card"><span className="label">Longitud</span><strong>{circuit.length_km ? `${circuit.length_km} km` : "No informada"}</strong></article><article className="info-card"><span className="label">Vueltas base</span><strong>{circuit.default_laps}</strong></article></div><section className="feature-section"><h2>Grandes Premios</h2>{events.length ? <div className="calendar-strip">{events.map((event) => <GrandPrixCard key={event.id} event={event} circuit={circuit} />)}</div> : <Empty>Este circuito aún no tiene Grandes Premios publicados.</Empty>}</section></>;
}

export function CalendarPage() {
  const { snapshot, loading } = useRacing(); if (loading) return <Loader />; const season = activeSeason(snapshot.seasons); const events = orderedCalendar(snapshot.grandPrix.filter((event) => event.season_id === season?.id));
  return <><PageHeader eyebrow={season?.name ?? "Campeonato"} title="Calendario" copy="Rondas oficiales ordenadas de la temporada activa." />{!events.length ? <Empty>No hay Grandes Premios publicados.</Empty> : <div className="calendar-list">{events.map((event) => <GrandPrixCard key={event.id} event={event} circuit={circuitFor(snapshot, event)} />)}</div>}</>;
}
