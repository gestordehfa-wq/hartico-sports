import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useTennis } from "../../app/tennis-context";
import {
  awardTypes,
  editionStatuses,
  entryStatuses,
  handednessValues,
  matchStatuses,
  playerStatuses,
  rankingReaches,
  rounds,
  scoringFormats,
  seasonStatuses,
  surfaces,
  tournamentStatuses,
  type MutationPayload,
  type TennisSnapshot,
  type TennisTable,
} from "../../domain/model";
import { generateDraw } from "../../domain/rules";
import { EmptyState, WindowPanel } from "../shared/components";

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
  step?: number;
  valueType?: "number";
  /** Con valor vacío no se envía la columna (conserva el default de la base de datos). */
  omitEmpty?: boolean;
  options?: (snapshot: TennisSnapshot) => readonly Option[];
}>;
type Row = Readonly<Record<string, string | number | null>> & Readonly<{ id: string }>;
type ResourceConfig = Readonly<{
  title: string;
  table: TennisTable;
  fields: readonly Field[];
  columns: readonly string[];
  rows(snapshot: TennisSnapshot): readonly Row[];
}>;
const fixed = (items: readonly string[]) => () => items.map((value) => ({ value, label: value }));
const named = (items: readonly { id: string; name: string }[]) =>
  items.map(({ id, name }) => ({ value: id, label: name }));
const categoryOptions = (snapshot: TennisSnapshot) =>
  [...snapshot.categories]
    .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code))
    .map(({ code, name }) => ({ value: code, label: `${name} (${code})` }));
const players = (snapshot: TennisSnapshot) =>
  snapshot.players.map(({ id, display_name }) => ({ value: id, label: display_name }));
export const editions = (snapshot: TennisSnapshot) =>
  snapshot.editions.map((item) => ({
    value: item.id,
    label:
      item.name ??
      `${snapshot.tournaments.find(({ id }) => id === item.tournament_id)?.name ?? "Torneo"} · ${snapshot.seasons.find(({ id }) => id === item.season_id)?.name ?? "Temporada"}`,
  }));
function cleanRow(value: object): Row {
  const result: Record<string, string | number | null> = {};
  for (const [key, item] of Object.entries(value))
    if (typeof item === "string" || typeof item === "number" || item === null) result[key] = item;
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
      { name: "start_date", label: "Inicio", type: "date", required: true },
      { name: "end_date", label: "Final", type: "date", required: true },
    ],
    rows: (snapshot) => snapshot.seasons.map(cleanRow),
  },
  players: {
    title: "Jugadores",
    table: "players",
    columns: ["display_name", "nationality", "country_code", "handedness", "status"],
    fields: [
      { name: "display_name", label: "Nombre visible", type: "text", required: true },
      { name: "real_name", label: "Nombre real", type: "text", nullable: true },
      { name: "nationality", label: "Nacionalidad", type: "text", required: true },
      { name: "country_code", label: "Código país", type: "text", required: true },
      { name: "avatar_url", label: "URL avatar", type: "url", nullable: true },
      {
        name: "handedness",
        label: "Mano",
        type: "select",
        nullable: true,
        options: fixed(handednessValues),
      },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(playerStatuses),
      },
    ],
    rows: (snapshot) => snapshot.players.map(cleanRow),
  },
  tournaments: {
    title: "Torneos",
    table: "tournaments",
    columns: ["name", "short_name", "category", "default_surface", "status"],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "short_name", label: "Nombre corto", type: "text", required: true },
      { name: "logo_url", label: "URL logo", type: "url", nullable: true },
      {
        name: "default_surface",
        label: "Superficie base",
        type: "select",
        required: true,
        options: fixed(surfaces),
      },
      {
        name: "category",
        label: "Categoría",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(tournamentStatuses),
      },
    ],
    rows: (snapshot) => snapshot.tournaments.map(cleanRow),
  },
  editions: {
    title: "Ediciones",
    table: "tournament_editions",
    columns: [
      "name",
      "tournament_id",
      "season_id",
      "surface",
      "status",
      "draw_size",
      "scoring_format",
      "games_best_of",
      "best_of",
    ],
    fields: [
      {
        name: "tournament_id",
        label: "Torneo",
        type: "select",
        required: true,
        options: (snapshot) => named(snapshot.tournaments),
      },
      {
        name: "season_id",
        label: "Temporada",
        type: "select",
        required: true,
        options: (snapshot) => named(snapshot.seasons),
      },
      { name: "name", label: "Nombre opcional", type: "text", nullable: true },
      {
        name: "surface",
        label: "Superficie",
        type: "select",
        required: true,
        options: fixed(surfaces),
      },
      { name: "start_date", label: "Inicio", type: "date", required: true },
      { name: "end_date", label: "Final", type: "date", required: true },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(editionStatuses),
      },
      {
        name: "draw_size",
        label: "Tamaño",
        type: "select",
        required: true,
        valueType: "number",
        options: fixed(["4", "8", "16"]),
      },
      {
        name: "scoring_format",
        label: "Formato de marcador",
        type: "select",
        required: true,
        options: fixed(scoringFormats),
      },
      {
        name: "games_best_of",
        label: "Mejor de (juegos, 5 o 7; solo formato games)",
        type: "select",
        nullable: true,
        valueType: "number",
        options: fixed(["5", "7"]),
      },
      {
        name: "best_of",
        label: "Mejor de (sets, legado v0.1; solo formato sets)",
        type: "select",
        omitEmpty: true,
        valueType: "number",
        options: fixed(["1", "3", "5"]),
      },
    ],
    rows: (snapshot) => snapshot.editions.map(cleanRow),
  },
  entries: {
    title: "Inscripciones y seeds",
    table: "tournament_entries",
    columns: ["tournament_edition_id", "player_id", "seed", "entry_status"],
    fields: [
      {
        name: "tournament_edition_id",
        label: "Edición",
        type: "select",
        required: true,
        options: editions,
      },
      { name: "player_id", label: "Jugador", type: "select", required: true, options: players },
      {
        name: "seed",
        label: "Seed",
        type: "number",
        nullable: true,
        min: 1,
        max: 128,
        valueType: "number",
      },
      {
        name: "entry_status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(entryStatuses),
      },
    ],
    rows: (snapshot) => snapshot.entries.map(cleanRow),
  },
  matches: {
    title: "Partidos",
    table: "matches",
    columns: [
      "tournament_edition_id",
      "round",
      "match_number",
      "player1_id",
      "player2_id",
      "status",
      "winner_id",
      "scoring_format",
      "player1_games",
      "player2_games",
      "player1_points",
      "player2_points",
    ],
    fields: [
      {
        name: "tournament_edition_id",
        label: "Edición",
        type: "select",
        required: true,
        options: editions,
      },
      { name: "round", label: "Ronda", type: "select", required: true, options: fixed(rounds) },
      {
        name: "round_order",
        label: "Orden ronda",
        type: "number",
        required: true,
        min: 1,
        valueType: "number",
      },
      {
        name: "match_number",
        label: "Número",
        type: "number",
        required: true,
        min: 1,
        valueType: "number",
      },
      { name: "player1_id", label: "Jugador 1", type: "select", nullable: true, options: players },
      { name: "player2_id", label: "Jugador 2", type: "select", nullable: true, options: players },
      { name: "scheduled_at", label: "Programado", type: "datetime-local", nullable: true },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: fixed(matchStatuses),
      },
      { name: "winner_id", label: "Ganador", type: "select", nullable: true, options: players },
      {
        name: "next_match_id",
        label: "Siguiente partido",
        type: "select",
        nullable: true,
        options: (snapshot) =>
          snapshot.matches.map(({ id, round, match_number }) => ({
            value: id,
            label: `${round} #${match_number}`,
          })),
      },
      {
        name: "next_slot",
        label: "Slot siguiente",
        type: "select",
        nullable: true,
        valueType: "number",
        options: fixed(["1", "2"]),
      },
      {
        name: "best_of",
        label: "Mejor de",
        type: "select",
        required: true,
        valueType: "number",
        options: fixed(["1", "3", "5"]),
      },
    ],
    rows: (snapshot) => snapshot.matches.map(cleanRow),
  },
  sets: {
    title: "Sets y resultados",
    table: "match_sets",
    columns: ["match_id", "set_number", "player1_score", "player2_score"],
    fields: [
      {
        name: "match_id",
        label: "Partido",
        type: "select",
        required: true,
        options: (snapshot) =>
          snapshot.matches.map(({ id, round, match_number }) => ({
            value: id,
            label: `${round} #${match_number}`,
          })),
      },
      {
        name: "set_number",
        label: "Set",
        type: "number",
        required: true,
        min: 1,
        max: 5,
        valueType: "number",
      },
      {
        name: "player1_score",
        label: "Score J1",
        type: "number",
        required: true,
        min: 0,
        valueType: "number",
      },
      {
        name: "player2_score",
        label: "Score J2",
        type: "number",
        required: true,
        min: 0,
        valueType: "number",
      },
    ],
    rows: (snapshot) => snapshot.sets.map(cleanRow),
  },
  awards: {
    title: "Awards",
    table: "awards",
    columns: ["season_id", "tournament_edition_id", "player_id", "award_type", "title"],
    fields: [
      {
        name: "season_id",
        label: "Temporada",
        type: "select",
        required: true,
        options: (snapshot) => named(snapshot.seasons),
      },
      {
        name: "tournament_edition_id",
        label: "Edición",
        type: "select",
        nullable: true,
        options: editions,
      },
      { name: "player_id", label: "Jugador", type: "select", required: true, options: players },
      {
        name: "award_type",
        label: "Tipo",
        type: "select",
        required: true,
        options: fixed(awardTypes),
      },
      { name: "title", label: "Título", type: "text", required: true },
      { name: "description", label: "Descripción", type: "text", nullable: true },
    ],
    rows: (snapshot) => snapshot.awards.map(cleanRow),
  },
  categories: {
    title: "Categorías de torneo",
    table: "tournament_categories",
    columns: ["code", "name", "sort_order"],
    fields: [
      { name: "code", label: "Código (minúsculas, guion bajo)", type: "text", required: true },
      { name: "name", label: "Nombre", type: "text", required: true },
      {
        name: "sort_order",
        label: "Orden",
        type: "number",
        required: true,
        min: 0,
        valueType: "number",
      },
    ],
    rows: (snapshot) => snapshot.categories.map(cleanRow),
  },
  "ranking-rules": {
    title: "Puntos de ranking",
    table: "ranking_point_rules",
    columns: ["category", "reached", "points"],
    fields: [
      {
        name: "category",
        label: "Categoría",
        type: "select",
        required: true,
        options: categoryOptions,
      },
      {
        name: "reached",
        label: "Ronda alcanzada",
        type: "select",
        required: true,
        options: fixed(rankingReaches),
      },
      {
        name: "points",
        label: "Puntos",
        type: "number",
        required: true,
        min: 0,
        valueType: "number",
      },
    ],
    rows: (snapshot) => snapshot.rankingRules.map(cleanRow),
  },
};
const adminLinks = [
  ...Object.entries(resources).map(([path, config]) => ({ path, title: config.title })),
  { path: "draw", title: "Generar cuadro" },
  { path: "scoring", title: "Marcador en juegos" },
];

export function AdminGate({ children }: Readonly<{ children: ReactNode }>) {
  const { configured, session, isAdmin, adminChecked } = useTennis();
  if (!configured)
    return (
      <WindowPanel title="Administración preparada">
        <p>
          Conecta un proyecto Supabase Cloud mediante <code>.env.local</code> para habilitar el
          CRUD. La superficie pública sigue disponible.
        </p>
      </WindowPanel>
    );
  if (!session) return <Navigate to="/login" replace />;
  if (!adminChecked) return <div className="loading">Verificando permisos…</div>;
  if (!isAdmin)
    return (
      <WindowPanel title="Acceso denegado">
        <p>La cuenta está autenticada, pero no tiene rol admin.</p>
      </WindowPanel>
    );
  return children;
}
export function LoginPage() {
  const { configured, session, signIn } = useTennis();
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
  const { snapshot, signOut } = useTennis();
  return (
    <AdminGate>
      <header className="page-header">
        <p className="eyebrow">Consola</p>
        <h1>Administración Tennis</h1>
        <p>Catálogos, cuadro y resultados protegidos por RLS.</p>
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
            <span>
              {path === "draw"
                ? "Preview y confirmación"
                : path === "scoring"
                  ? "Puntos, juegos y resultado directo"
                  : `${resources[path]?.rows(snapshot).length ?? 0} registros`}
            </span>
          </Link>
        ))}
      </div>
    </AdminGate>
  );
}
function payloadFrom(form: HTMLFormElement, fields: readonly Field[]): MutationPayload {
  const data = new FormData(form);
  const payload: Record<string, string | number | null> = {};
  for (const field of fields) {
    const raw = String(data.get(field.name) ?? "").trim();
    if (!raw && field.omitEmpty) continue;
    if (!raw && field.nullable) payload[field.name] = null;
    else if (field.valueType === "number" || field.type === "number")
      payload[field.name] = Number(raw);
    else if (field.type === "datetime-local")
      payload[field.name] = raw ? new Date(raw).toISOString() : null;
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
  const { snapshot, repository, refresh } = useTennis();
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
  async function confirmResult(id: string) {
    if (!repository) return;
    setBusy(true);
    try {
      await repository.confirmResult(id);
      await refresh();
      setMessage("Resultado confirmado y ganador propagado.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No fue posible confirmar.");
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
        <p>Crear, editar y eliminar con validación de base de datos.</p>
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
                  step={field.step}
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
                    {resource === "matches" && (
                      <button
                        type="button"
                        onClick={() => void confirmResult(row.id)}
                        disabled={busy}
                      >
                        Confirmar resultado
                      </button>
                    )}
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

export function AdminDrawPage() {
  const { snapshot, repository, refresh } = useTennis();
  const [editionId, setEditionId] = useState(snapshot.editions[0]?.id ?? "");
  const [previewed, setPreviewed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const edition = snapshot.editions.find(({ id }) => id === editionId);
  const activeEntries = snapshot.entries.filter(
    (entry) =>
      entry.tournament_edition_id === editionId &&
      ["registered", "active"].includes(entry.entry_status),
  );
  const existing = snapshot.matches.filter(
    ({ tournament_edition_id }) => tournament_edition_id === editionId,
  );
  let preview: ReturnType<typeof generateDraw> = [];
  let validation: string | null = null;
  if (edition)
    try {
      preview = generateDraw(activeEntries, edition.draw_size);
    } catch (cause) {
      validation = cause instanceof Error ? cause.message : "Cuadro inválido.";
    }
  async function confirm() {
    if (!repository || !edition || validation || existing.length) return;
    try {
      await repository.generateDraw(edition.id);
      // El cuadro es público solo con la edición activa (RLS de lectura pública).
      if (edition.status !== "active")
        await repository.update("tournament_editions", edition.id, { status: "active" });
      await refresh();
      setMessage("Cuadro generado y edición activada.");
      setPreviewed(false);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "No fue posible generar el cuadro.");
    }
  }
  return (
    <AdminGate>
      <div className="admin-toolbar">
        <Link to="/admin">← Consola</Link>
        <span>Herramienta transaccional</span>
      </div>
      <header className="page-header">
        <p className="eyebrow">Administración</p>
        <h1>Generar cuadro</h1>
        <p>
          Valida seeds y participantes, muestra un preview y crea todas las rondas al confirmar.
        </p>
      </header>
      <WindowPanel title="Configuración">
        <div className="toolbar">
          <label htmlFor="admin-edition">Edición</label>
          <select
            id="admin-edition"
            value={editionId}
            onChange={(event) => {
              setEditionId(event.currentTarget.value);
              setPreviewed(false);
            }}
          >
            <option value="">Seleccionar…</option>
            {editions(snapshot).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button"
            disabled={!edition || Boolean(validation)}
            onClick={() => setPreviewed(true)}
          >
            Previsualizar
          </button>
        </div>
        {edition && (
          <div className="metric-strip">
            <article>
              <span>Tamaño</span>
              <strong>{edition.draw_size}</strong>
            </article>
            <article>
              <span>Inscritos</span>
              <strong>{activeEntries.length}</strong>
            </article>
            <article>
              <span>Seeds</span>
              <strong>{activeEntries.filter(({ seed }) => seed !== null).length}</strong>
            </article>
          </div>
        )}
        {validation && (
          <p className="form-message error" role="alert">
            {validation}
          </p>
        )}
        {existing.length > 0 && (
          <p className="form-message error" role="alert">
            La edición ya tiene {existing.length} partidos. No se sobrescribirá.
          </p>
        )}
      </WindowPanel>
      {previewed && !validation && (
        <WindowPanel title="Preview del cuadro" status={`${preview.length} partidos`}>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ronda</th>
                  <th>Partido</th>
                  <th>Jugador 1</th>
                  <th>Jugador 2</th>
                  <th>Destino</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((match) => (
                  <tr key={match.key}>
                    <td>{match.round}</td>
                    <td>{match.matchNumber}</td>
                    <td>
                      {snapshot.players.find(({ id }) => id === match.player1Id)?.display_name ??
                        "Por definir"}
                    </td>
                    <td>
                      {snapshot.players.find(({ id }) => id === match.player2Id)?.display_name ??
                        "Por definir"}
                    </td>
                    <td>{match.nextMatchKey ?? "Campeón"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="dialog-actions">
            <button
              type="button"
              className="button primary"
              disabled={existing.length > 0}
              onClick={() => void confirm()}
            >
              Confirmar generación
            </button>
          </div>
        </WindowPanel>
      )}
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
      {!edition && <EmptyState>Selecciona una edición.</EmptyState>}
    </AdminGate>
  );
}
