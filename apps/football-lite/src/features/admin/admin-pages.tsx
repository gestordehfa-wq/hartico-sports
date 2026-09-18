import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useFootball } from "../../app/football-context";
import {
  awardTypes,
  competitionStatuses,
  competitionTypes,
  entityStatuses,
  eventTypes,
  matchStatuses,
  playerPositions,
  rosterRoles,
  rosterStatuses,
  seasonStatuses,
  type FootballSnapshot,
  type FootballTable,
  type MutationPayload,
} from "../../domain/model";

type FieldType = "text" | "number" | "date" | "datetime-local" | "url" | "select";
type Option = Readonly<{ value: string; label: string }>;
type Field = Readonly<{
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  nullable?: boolean;
  min?: number;
  max?: number;
  valueType?: "number" | "boolean";
  options?: (snapshot: FootballSnapshot) => readonly Option[];
}>;
type Cell = string | number | boolean | null;
type Row = Readonly<Record<string, Cell>> & Readonly<{ id: string }>;
type ResourceConfig = Readonly<{
  title: string;
  table: FootballTable;
  columns: readonly string[];
  fields: readonly Field[];
  rows(snapshot: FootballSnapshot): readonly Row[];
}>;

const fixed = (items: readonly string[]) => () =>
  items.map((value) => ({ value, label: value.replaceAll("_", " ") }));
const named = (items: readonly { id: string; name: string }[]) =>
  items.map(({ id, name }) => ({ value: id, label: name }));
const players = (snapshot: FootballSnapshot) =>
  snapshot.players.map(({ id, display_name }) => ({ value: id, label: display_name }));
const matches = (snapshot: FootballSnapshot) =>
  snapshot.matches.map((match) => ({
    value: match.id,
    label: `${snapshot.teams.find((team) => team.id === match.home_team_id)?.short_name ?? "Local"} vs ${snapshot.teams.find((team) => team.id === match.away_team_id)?.short_name ?? "Visita"} · ${match.scheduled_at.slice(0, 10)}`,
  }));
function cleanRow(value: object): Row {
  const result: Record<string, Cell> = {};
  for (const [key, item] of Object.entries(value))
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean" ||
      item === null
    )
      result[key] = item;
  if (typeof result.id !== "string") throw new Error("Fila administrativa sin identificador.");
  return result as Row;
}

const resources: Readonly<Record<string, ResourceConfig>> = {
  seasons: {
    title: "Temporadas",
    table: "seasons",
    columns: ["name", "slug", "status", "start_date", "end_date"],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "slug", label: "Slug", type: "text", required: true },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(seasonStatuses),
      },
      { name: "start_date", label: "Fecha inicial", type: "date", required: true },
      { name: "end_date", label: "Fecha final", type: "date", required: true },
    ],
    rows: (s) => s.seasons.map(cleanRow),
  },
  competitions: {
    title: "Competiciones",
    table: "competitions",
    columns: ["name", "short_name", "season_id", "type", "status"],
    fields: [
      {
        name: "season_id",
        label: "Temporada",
        type: "select",
        required: true,
        options: (s) => named(s.seasons),
      },
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "short_name", label: "Nombre corto", type: "text", required: true },
      {
        name: "type",
        label: "Tipo",
        type: "select",
        required: true,
        options: fixed(competitionTypes),
      },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(competitionStatuses),
      },
      { name: "logo_url", label: "URL logo", type: "url", nullable: true },
    ],
    rows: (s) => s.competitions.map(cleanRow),
  },
  teams: {
    title: "Equipos",
    table: "teams",
    columns: ["name", "short_name", "code", "country", "status"],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "short_name", label: "Nombre corto", type: "text", required: true },
      { name: "code", label: "Código", type: "text", required: true },
      { name: "country", label: "País", type: "text", required: true },
      { name: "country_code", label: "Código país", type: "text", required: true },
      { name: "logo_url", label: "URL logo", type: "url", nullable: true },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(entityStatuses),
      },
    ],
    rows: (s) => s.teams.map(cleanRow),
  },
  players: {
    title: "Jugadores",
    table: "players",
    columns: ["display_name", "nationality", "country_code", "position", "status"],
    fields: [
      { name: "display_name", label: "Nombre visible", type: "text", required: true },
      { name: "real_name", label: "Nombre real", type: "text", nullable: true },
      { name: "nationality", label: "Nacionalidad", type: "text", required: true },
      { name: "country_code", label: "Código país", type: "text", required: true },
      {
        name: "position",
        label: "Posición",
        type: "select",
        required: true,
        options: fixed(playerPositions),
      },
      { name: "avatar_url", label: "URL avatar", type: "url", nullable: true },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(entityStatuses),
      },
    ],
    rows: (s) => s.players.map(cleanRow),
  },
  rosters: {
    title: "Plantillas",
    table: "season_player_rosters",
    columns: ["season_id", "player_id", "team_id", "role", "status", "start_date", "end_date"],
    fields: [
      {
        name: "season_id",
        label: "Temporada",
        type: "select",
        required: true,
        options: (s) => named(s.seasons),
      },
      { name: "player_id", label: "Jugador", type: "select", required: true, options: players },
      {
        name: "team_id",
        label: "Equipo",
        type: "select",
        required: true,
        options: (s) => named(s.teams),
      },
      { name: "start_date", label: "Desde", type: "date", nullable: true },
      { name: "end_date", label: "Hasta", type: "date", nullable: true },
      { name: "role", label: "Rol", type: "select", required: true, options: fixed(rosterRoles) },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(rosterStatuses),
      },
    ],
    rows: (s) => s.rosters.map(cleanRow),
  },
  matches: {
    title: "Partidos",
    table: "matches",
    columns: [
      "competition_id",
      "matchday",
      "home_team_id",
      "away_team_id",
      "scheduled_at",
      "status",
      "home_score",
      "away_score",
    ],
    fields: [
      {
        name: "competition_id",
        label: "Competición",
        type: "select",
        required: true,
        options: (s) => named(s.competitions),
      },
      {
        name: "season_id",
        label: "Temporada",
        type: "select",
        required: true,
        options: (s) => named(s.seasons),
      },
      {
        name: "home_team_id",
        label: "Local",
        type: "select",
        required: true,
        options: (s) => named(s.teams),
      },
      {
        name: "away_team_id",
        label: "Visita",
        type: "select",
        required: true,
        options: (s) => named(s.teams),
      },
      {
        name: "matchday",
        label: "Jornada",
        type: "number",
        nullable: true,
        min: 1,
        valueType: "number",
      },
      { name: "scheduled_at", label: "Fecha y hora", type: "datetime-local", required: true },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(matchStatuses),
      },
      {
        name: "home_score",
        label: "Goles local",
        type: "number",
        nullable: true,
        min: 0,
        valueType: "number",
      },
      {
        name: "away_score",
        label: "Goles visita",
        type: "number",
        nullable: true,
        min: 0,
        valueType: "number",
      },
      { name: "referee_name", label: "Árbitro", type: "text", nullable: true },
    ],
    rows: (s) => s.matches.map(cleanRow),
  },
  events: {
    title: "Eventos",
    table: "match_events",
    columns: ["match_id", "event_type", "player_id", "team_id", "minute", "related_player_id"],
    fields: [
      { name: "match_id", label: "Partido", type: "select", required: true, options: matches },
      { name: "player_id", label: "Jugador", type: "select", required: true, options: players },
      {
        name: "team_id",
        label: "Equipo",
        type: "select",
        required: true,
        options: (s) => named(s.teams),
      },
      {
        name: "event_type",
        label: "Tipo",
        type: "select",
        required: true,
        options: fixed(eventTypes),
      },
      {
        name: "minute",
        label: "Minuto",
        type: "number",
        nullable: true,
        min: 0,
        max: 130,
        valueType: "number",
      },
      {
        name: "related_player_id",
        label: "Jugador relacionado",
        type: "select",
        nullable: true,
        options: players,
      },
    ],
    rows: (s) => s.events.map(cleanRow),
  },
  appearances: {
    title: "Apariciones",
    table: "match_player_appearances",
    columns: ["match_id", "player_id", "team_id", "starter"],
    fields: [
      { name: "match_id", label: "Partido", type: "select", required: true, options: matches },
      { name: "player_id", label: "Jugador", type: "select", required: true, options: players },
      {
        name: "team_id",
        label: "Equipo",
        type: "select",
        required: true,
        options: (s) => named(s.teams),
      },
      {
        name: "starter",
        label: "Titular",
        type: "select",
        required: true,
        valueType: "boolean",
        options: () => [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      },
    ],
    rows: (s) => s.appearances.map(cleanRow),
  },
  awards: {
    title: "Premios",
    table: "awards",
    columns: ["season_id", "competition_id", "award_type", "title", "player_id", "team_id"],
    fields: [
      {
        name: "season_id",
        label: "Temporada",
        type: "select",
        required: true,
        options: (s) => named(s.seasons),
      },
      {
        name: "competition_id",
        label: "Competición",
        type: "select",
        nullable: true,
        options: (s) => named(s.competitions),
      },
      {
        name: "award_type",
        label: "Tipo",
        type: "select",
        required: true,
        options: fixed(awardTypes),
      },
      { name: "player_id", label: "Jugador", type: "select", nullable: true, options: players },
      {
        name: "team_id",
        label: "Equipo",
        type: "select",
        nullable: true,
        options: (s) => named(s.teams),
      },
      { name: "title", label: "Título", type: "text", required: true },
      { name: "description", label: "Descripción", type: "text", nullable: true },
    ],
    rows: (s) => s.awards.map(cleanRow),
  },
};

const adminLinks = Object.entries(resources).map(([path, config]) => ({
  path,
  title: config.title,
}));
function AdminGate({ children }: Readonly<{ children: ReactNode }>) {
  const { configured, session, isAdmin, adminChecked } = useFootball();
  if (!configured)
    return (
      <section className="window">
        <header className="title-bar">Administración preparada</header>
        <div className="window-body">
          <p>
            Conecta un proyecto Supabase Cloud mediante <code>.env.local</code> para habilitar el
            CRUD. El frontend público sigue disponible sin backend.
          </p>
        </div>
      </section>
    );
  if (!session) return <Navigate to="/login" replace />;
  if (!adminChecked) return <div className="loading">Verificando permisos…</div>;
  if (!isAdmin)
    return (
      <section className="window">
        <header className="title-bar">Acceso denegado</header>
        <div className="window-body">
          <p>La cuenta está autenticada, pero no tiene rol admin.</p>
        </div>
      </section>
    );
  return children;
}

export function LoginPage() {
  const { configured, session, signIn } = useFootball();
  const navigate = useNavigate();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (session) return <Navigate to="/admin" replace />;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const error = await signIn(String(data.get("email") ?? ""), String(data.get("password") ?? ""));
    setBusy(false);
    if (error) setMessage(error);
    else navigate("/admin");
  }
  return (
    <section className="window login-window">
      <header className="title-bar">Autenticación administrativa</header>
      <form className="window-body form-grid" onSubmit={submit}>
        <p>
          Usa Supabase Auth con una membresía <strong>admin</strong>.
        </p>
        <label htmlFor="admin-email">
          Correo
          <input
            id="admin-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            disabled={!configured}
          />
        </label>
        <label htmlFor="admin-password">
          Contraseña
          <input
            id="admin-password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            disabled={!configured}
          />
        </label>
        {message && (
          <p className="form-message error" role="alert">
            {message}
          </p>
        )}
        <div className="dialog-actions">
          <button type="submit" className="button primary" disabled={busy || !configured}>
            {busy ? "Conectando…" : "Iniciar sesión"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function AdminHome() {
  const { snapshot, signOut } = useFootball();
  return (
    <AdminGate>
      <header className="page-header">
        <p className="eyebrow">Consola</p>
        <h1>Administración Football Lite</h1>
        <p>Catálogos, competencia y registro de resultados protegidos por RLS.</p>
      </header>
      <div className="admin-toolbar">
        <span>Sesión administrativa activa</span>
        <button type="button" className="button" onClick={() => void signOut()}>
          Cerrar sesión
        </button>
      </div>
      <div className="admin-grid">
        {adminLinks.map(({ path, title }) => (
          <Link className="admin-module" to={`/admin/${path}`} key={path}>
            <strong>{title}</strong>
            <span>{resources[path]?.rows(snapshot).length ?? 0} registros</span>
          </Link>
        ))}
      </div>
    </AdminGate>
  );
}

function payloadFrom(form: HTMLFormElement, fields: readonly Field[]): MutationPayload {
  const data = new FormData(form);
  const payload: Record<string, string | number | boolean | null> = {};
  for (const field of fields) {
    const raw = String(data.get(field.name) ?? "").trim();
    if (!raw && field.nullable) payload[field.name] = null;
    else if (field.valueType === "number" || field.type === "number")
      payload[field.name] = Number(raw);
    else if (field.valueType === "boolean") payload[field.name] = raw === "true";
    else if (field.type === "datetime-local") payload[field.name] = new Date(raw).toISOString();
    else payload[field.name] = raw;
  }
  return payload;
}

function defaultValue(field: Field, row: Row | null): string {
  const value = row?.[field.name];
  if (value === null || value === undefined) return "";
  const text = String(value);
  return field.type === "datetime-local" ? text.slice(0, 16) : text;
}

export function AdminResourcePage() {
  const { resource } = useParams();
  const config = resource ? resources[resource] : undefined;
  const { snapshot, repository, refresh } = useFootball();
  const rows = useMemo(() => config?.rows(snapshot) ?? [], [config, snapshot]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  if (!config) return <Navigate to="/admin" replace />;
  const selected = config;
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!repository) return;
    setBusy(true);
    setMessage(null);
    try {
      const payload = payloadFrom(event.currentTarget, selected.fields);
      if (editing) await repository.update(selected.table, editing.id, payload);
      else await repository.create(selected.table, payload);
      await refresh();
      setEditing(null);
      event.currentTarget.reset();
      setMessage("Cambios guardados correctamente.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No fue posible guardar.");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!repository || !pendingDelete) return;
    setBusy(true);
    try {
      await repository.remove(selected.table, pendingDelete.id);
      await refresh();
      setPendingDelete(null);
      setEditing(null);
      setMessage("Registro eliminado.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No fue posible eliminar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AdminGate>
      <div className="admin-toolbar">
        <Link to="/admin">← Consola</Link>
        <span>{rows.length} registros</span>
      </div>
      <header className="page-header">
        <p className="eyebrow">Administración</p>
        <h1>{config.title}</h1>
        <p>Crear, editar y eliminar. Las referencias históricas pueden impedir eliminaciones.</p>
      </header>
      <section className="window">
        <header className="title-bar">{editing ? `Editar ${editing.id}` : "Nuevo registro"}</header>
        <form key={editing?.id ?? "new"} className="window-body form-grid" onSubmit={save}>
          {config.fields.map((field) => (
            <label htmlFor={`field-${field.name}`} key={field.name}>
              {field.label}
              {field.type === "select" ? (
                <select
                  id={`field-${field.name}`}
                  name={field.name}
                  required={field.required}
                  defaultValue={defaultValue(field, editing)}
                >
                  <option value="">Seleccionar…</option>
                  {field.options?.(snapshot).map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`field-${field.name}`}
                  name={field.name}
                  type={field.type}
                  required={field.required}
                  min={field.min}
                  max={field.max}
                  defaultValue={defaultValue(field, editing)}
                />
              )}
            </label>
          ))}
          <div className="dialog-actions">
            {editing && (
              <button type="button" className="button" onClick={() => setEditing(null)}>
                Cancelar
              </button>
            )}
            <button type="submit" className="button primary" disabled={busy}>
              {busy ? "Guardando…" : editing ? "Guardar cambios" : "Crear"}
            </button>
          </div>
          {message && (
            <p className="form-message" role="status">
              {message}
            </p>
          )}
        </form>
      </section>
      <section className="window data-window">
        <header className="title-bar">Listado de {config.title.toLowerCase()}</header>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {config.columns.map((column) => (
                  <th scope="col" key={column}>
                    {column.replaceAll("_", " ")}
                  </th>
                ))}
                <th scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  {config.columns.map((column) => (
                    <td key={column}>{String(row[column] ?? "—")}</td>
                  ))}
                  <td className="row-actions">
                    <button type="button" onClick={() => setEditing(row)}>
                      Editar
                    </button>
                    <button type="button" className="danger" onClick={() => setPendingDelete(row)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <div className="table-empty">No hay registros.</div>}
        </div>
        <footer className="status-bar">{rows.length} elementos</footer>
      </section>
      {pendingDelete && (
        <div className="dialog-backdrop">
          <div
            className="window confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <header className="title-bar" id="confirm-title">
              Confirmar eliminación
            </header>
            <div className="window-body">
              <p>
                ¿Eliminar <code>{pendingDelete.id}</code>? La base puede rechazarlo si conserva
                historia relacionada.
              </p>
              <div className="dialog-actions">
                <button type="button" className="button" onClick={() => setPendingDelete(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="button danger"
                  disabled={busy}
                  onClick={() => void remove()}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminGate>
  );
}
