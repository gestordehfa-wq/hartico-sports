import { type FormEvent, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useRacing } from "../../app/racing-context";
import {
  circuitStatuses, driverStatuses, entryRoles, entryStatuses, grandPrixStatuses,
  seasonStatuses, teamStatuses, type MutationPayload, type RacingSnapshot, type RacingTable,
} from "../../domain/model";

type FieldType = "text" | "number" | "date" | "url" | "color" | "select";
type Option = Readonly<{ value: string; label: string }>;
type Field = Readonly<{ name: string; label: string; type: FieldType; required?: boolean; nullable?: boolean; min?: number; max?: number; step?: number; options?: (snapshot: RacingSnapshot) => readonly Option[] }>;
type Row = Readonly<Record<string, string | number | null>> & Readonly<{ id: string }>;
type ResourceConfig = Readonly<{ title: string; table: RacingTable; fields: readonly Field[]; columns: readonly string[]; rows(snapshot: RacingSnapshot): readonly Row[] }>;

const fixedOptions = (items: readonly string[]) => () => items.map((value) => ({ value, label: value }));
const entityOptions = (items: readonly { id: string; name: string }[]) => items.map(({ id, name }) => ({ value: id, label: name }));
const driverOptions = (snapshot: RacingSnapshot) => snapshot.drivers.map(({ id, display_name }) => ({ value: id, label: display_name }));
const cleanRow = (value: object): Row => {
  const result: Record<string, string | number | null> = {};
  for (const [key, item] of Object.entries(value)) if (typeof item === "string" || typeof item === "number" || item === null) result[key] = item;
  if (typeof result.id !== "string") throw new Error("Fila administrativa sin identificador.");
  return result as Row;
};

const resources: Readonly<Record<string, ResourceConfig>> = {
  seasons: { title: "Temporadas", table: "seasons", columns: ["name", "slug", "year", "status", "start_date", "end_date"], fields: [
    { name: "name", label: "Nombre", type: "text", required: true }, { name: "slug", label: "Slug", type: "text", required: true },
    { name: "year", label: "Año de referencia", type: "number", nullable: true, min: 1900, max: 2200 }, { name: "status", label: "Estado", type: "select", required: true, options: fixedOptions(seasonStatuses) },
    { name: "start_date", label: "Fecha inicial", type: "date", required: true }, { name: "end_date", label: "Fecha final", type: "date", required: true },
  ], rows: (s) => s.seasons.map(cleanRow) },
  drivers: { title: "Pilotos", table: "drivers", columns: ["display_name", "nationality", "country_code", "racing_number", "status"], fields: [
    { name: "display_name", label: "Nombre visible", type: "text", required: true }, { name: "real_name", label: "Nombre real", type: "text", nullable: true },
    { name: "nationality", label: "Nacionalidad", type: "text", required: true }, { name: "country_code", label: "Código país", type: "text", required: true },
    { name: "racing_number", label: "Número", type: "number", nullable: true, min: 0, max: 999 }, { name: "avatar_url", label: "URL avatar", type: "url", nullable: true },
    { name: "date_of_birth", label: "Nacimiento", type: "date", nullable: true }, { name: "status", label: "Estado", type: "select", required: true, options: fixedOptions(driverStatuses) },
  ], rows: (s) => s.drivers.map(cleanRow) },
  teams: { title: "Escuderías", table: "teams", columns: ["name", "short_name", "code", "country", "status"], fields: [
    { name: "name", label: "Nombre", type: "text", required: true }, { name: "short_name", label: "Nombre corto", type: "text", required: true },
    { name: "code", label: "Código", type: "text", required: true }, { name: "country", label: "País", type: "text", required: true }, { name: "country_code", label: "Código país", type: "text", required: true },
    { name: "logo_url", label: "URL logo", type: "url", nullable: true }, { name: "primary_color", label: "Color primario", type: "color", nullable: true },
    { name: "secondary_color", label: "Color secundario", type: "color", nullable: true }, { name: "status", label: "Estado", type: "select", required: true, options: fixedOptions(teamStatuses) },
  ], rows: (s) => s.teams.map(cleanRow) },
  entries: { title: "Participaciones", table: "season_driver_entries", columns: ["season_id", "driver_id", "team_id", "racing_number", "role", "status"], fields: [
    { name: "season_id", label: "Temporada", type: "select", required: true, options: (s) => entityOptions(s.seasons) }, { name: "driver_id", label: "Piloto", type: "select", required: true, options: driverOptions },
    { name: "team_id", label: "Escudería", type: "select", required: true, options: (s) => entityOptions(s.teams) }, { name: "racing_number", label: "Número", type: "number", nullable: true, min: 0, max: 999 },
    { name: "role", label: "Rol", type: "select", required: true, options: fixedOptions(entryRoles) }, { name: "status", label: "Estado", type: "select", required: true, options: fixedOptions(entryStatuses) },
    { name: "start_date", label: "Desde", type: "date", nullable: true }, { name: "end_date", label: "Hasta", type: "date", nullable: true },
  ], rows: (s) => s.entries.map(cleanRow) },
  circuits: { title: "Circuitos", table: "circuits", columns: ["name", "country", "city", "length_km", "default_laps", "status"], fields: [
    { name: "name", label: "Nombre", type: "text", required: true }, { name: "slug", label: "Slug", type: "text", required: true }, { name: "short_name", label: "Nombre corto", type: "text", nullable: true },
    { name: "country", label: "País", type: "text", required: true }, { name: "country_code", label: "Código país", type: "text", required: true }, { name: "city", label: "Ciudad / ubicación", type: "text", nullable: true },
    { name: "image_url", label: "URL mapa", type: "url", nullable: true }, { name: "length_km", label: "Longitud (km)", type: "number", nullable: true, min: 0.1, step: 0.001 },
    { name: "default_laps", label: "Vueltas por defecto", type: "number", required: true, min: 4, max: 8 }, { name: "status", label: "Estado", type: "select", required: true, options: fixedOptions(circuitStatuses) },
  ], rows: (s) => s.circuits.map(cleanRow) },
  "grand-prix": { title: "Grandes Premios", table: "grand_prix_events", columns: ["round_number", "name", "season_id", "circuit_id", "scheduled_date", "race_laps", "status"], fields: [
    { name: "season_id", label: "Temporada", type: "select", required: true, options: (s) => entityOptions(s.seasons) }, { name: "circuit_id", label: "Circuito", type: "select", required: true, options: (s) => entityOptions(s.circuits) },
    { name: "name", label: "Nombre", type: "text", required: true }, { name: "slug", label: "Slug", type: "text", required: true }, { name: "round_number", label: "Ronda", type: "number", required: true, min: 1 },
    { name: "scheduled_date", label: "Fecha", type: "date", required: true }, { name: "race_laps", label: "Vueltas (override)", type: "number", nullable: true, min: 4, max: 8 },
    { name: "status", label: "Estado", type: "select", required: true, options: fixedOptions(grandPrixStatuses) },
  ], rows: (s) => s.grandPrix.map(cleanRow) },
};

const adminLinks = Object.entries(resources).map(([path, config]) => ({ path, title: config.title }));

function AdminGate({ children }: Readonly<{ children: React.ReactNode }>) {
  const { configured, session, isAdmin, adminChecked } = useRacing();
  if (!configured) return <section className="window"><header className="title-bar">Administración no disponible</header><div className="window-body"><p>Configura Supabase local con <code>.env.example</code>.</p></div></section>;
  if (!session) return <Navigate to="/login" replace />;
  if (!adminChecked) return <div className="loading">Verificando permisos…</div>;
  if (!isAdmin) return <section className="window"><header className="title-bar">Acceso denegado</header><div className="window-body"><p>La sesión es válida, pero no posee membresía administrativa.</p></div></section>;
  return children;
}

export function LoginPage() {
  const { configured, session, signIn } = useRacing(); const navigate = useNavigate(); const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  if (session) return <Navigate to="/admin" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); const data = new FormData(event.currentTarget); const error = await signIn(String(data.get("email") ?? ""), String(data.get("password") ?? "")); setBusy(false); if (error) setMessage(error); else navigate("/admin"); }
  return <section className="window login-window"><header className="title-bar">Autenticación administrativa</header><form className="window-body form-grid" onSubmit={submit}><p>Usa una cuenta registrada en Supabase Auth con membresía <strong>admin</strong>.</p><label htmlFor="admin-email">Correo<input id="admin-email" name="email" type="email" autoComplete="username" required disabled={!configured} /></label><label htmlFor="admin-password">Contraseña<input id="admin-password" name="password" type="password" autoComplete="current-password" required disabled={!configured} /></label>{message && <p className="form-message error" role="alert">{message}</p>}<div className="dialog-actions"><button type="submit" className="button primary" disabled={busy || !configured}>{busy ? "Conectando…" : "Iniciar sesión"}</button></div></form></section>;
}

export function AdminHome() {
  const { snapshot, signOut } = useRacing();
  return <AdminGate><header className="page-header"><p className="eyebrow">Consola</p><h1>Administración Racing</h1><p>Catálogos y calendario protegidos por autorización en base de datos.</p></header><div className="admin-toolbar"><span>Sesión administrativa activa</span><button type="button" className="button" onClick={() => void signOut()}>Cerrar sesión</button></div><div className="admin-grid">{adminLinks.map(({ path, title }) => <Link className="admin-module" to={`/admin/${path}`} key={path}><strong>{title}</strong><span>{resources[path]?.rows(snapshot).length ?? 0} registros</span></Link>)}</div></AdminGate>;
}

function payloadFrom(form: HTMLFormElement, fields: readonly Field[]): MutationPayload {
  const data = new FormData(form); const payload: Record<string, string | number | null> = {};
  for (const field of fields) { const raw = String(data.get(field.name) ?? "").trim(); if (!raw && field.nullable) payload[field.name] = null; else if (field.type === "number") payload[field.name] = Number(raw); else payload[field.name] = raw; }
  return payload;
}

export function AdminResourcePage() {
  const { resource } = useParams(); const config = resource ? resources[resource] : undefined; const { snapshot, repository, refresh } = useRacing();
  const rows = useMemo(() => config?.rows(snapshot) ?? [], [config, snapshot]); const [editing, setEditing] = useState<Row | null>(null); const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  if (!config) return <Navigate to="/admin" replace />;
  const selectedConfig = config;
  async function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!repository) return; setBusy(true); setMessage(null); try { const payload = payloadFrom(event.currentTarget, selectedConfig.fields); if (editing) await repository.update(selectedConfig.table, editing.id, payload); else await repository.create(selectedConfig.table, payload); await refresh(); setEditing(null); event.currentTarget.reset(); setMessage("Cambios guardados correctamente."); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No fue posible guardar."); } finally { setBusy(false); } }
  async function remove() { if (!repository || !pendingDelete) return; setBusy(true); try { await repository.remove(selectedConfig.table, pendingDelete.id); await refresh(); setPendingDelete(null); setEditing(null); setMessage("Registro eliminado."); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "No fue posible eliminar."); } finally { setBusy(false); } }
  return <AdminGate><div className="admin-toolbar"><Link to="/admin">← Consola</Link><span>{rows.length} registros</span></div><header className="page-header"><p className="eyebrow">Administración</p><h1>{config.title}</h1><p>Crear, editar y eliminar registros. Las relaciones protegidas pueden impedir eliminaciones.</p></header>
    <section className="window"><header className="title-bar">{editing ? `Editar ${editing.id}` : "Nuevo registro"}</header><form key={editing?.id ?? "new"} className="window-body form-grid" onSubmit={save}>{config.fields.map((field) => <label htmlFor={`field-${field.name}`} key={field.name}>{field.label}{field.type === "select" ? <select id={`field-${field.name}`} name={field.name} required={field.required} defaultValue={String(editing?.[field.name] ?? "")}><option value="">Seleccionar…</option>{field.options?.(snapshot).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select> : <input id={`field-${field.name}`} name={field.name} type={field.type} required={field.required} min={field.min} max={field.max} step={field.step} defaultValue={String(editing?.[field.name] ?? "")} />}</label>)}<div className="dialog-actions">{editing && <button type="button" className="button" onClick={() => setEditing(null)}>Cancelar</button>}<button type="submit" className="button primary" disabled={busy}>{busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}</button></div>{message && <p className="form-message" role="status">{message}</p>}</form></section>
    <section className="window data-window"><header className="title-bar">Listado de {config.title.toLowerCase()}</header><div className="table-scroll"><table><thead><tr>{config.columns.map((column) => <th key={column}>{column.replaceAll("_", " ")}</th>)}<th>Acciones</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}>{config.columns.map((column) => <td key={column}>{String(row[column] ?? "—")}</td>)}<td className="row-actions"><button type="button" onClick={() => setEditing(row)}>Editar</button><button type="button" className="danger" onClick={() => setPendingDelete(row)}>Eliminar</button></td></tr>)}</tbody></table>{!rows.length && <div className="table-empty">No hay registros.</div>}</div><footer className="status-bar">{rows.length} elementos</footer></section>
    {pendingDelete && <div className="dialog-backdrop"><div className="window confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title"><header className="title-bar" id="confirm-title">Confirmar eliminación</header><div className="window-body"><p>¿Eliminar el registro <code>{pendingDelete.id}</code>? Esta acción puede ser rechazada si existen referencias históricas.</p><div className="dialog-actions"><button type="button" className="button" onClick={() => setPendingDelete(null)}>Cancelar</button><button type="button" className="button danger" disabled={busy} onClick={() => void remove()}>Eliminar</button></div></div></div></div>}
  </AdminGate>;
}
