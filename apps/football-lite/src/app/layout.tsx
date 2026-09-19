import { isRouteErrorResponse, NavLink, Outlet, useRouteError } from "react-router-dom";
import { association, associationTheme } from "../config/association";
import { useFootball } from "./football-context";

const navigation = [
  ["/", "Inicio"],
  ["/competitions", "Competiciones"],
  ["/teams", "Equipos"],
  ["/players", "Jugadores"],
  ["/matches", "Partidos"],
  ["/standings", "Clasificación"],
  ["/stats", "Estadísticas"],
  ["/history", "Historial"],
] as const;

export function AppLayout() {
  const { configured, error, session } = useFootball();
  return (
    <div className="football-app" style={associationTheme}>
      <header className="site-header">
        <NavLink to="/" className="brand" aria-label={`${association.name}, inicio`}>
          {association.logoUrl ? (
            <img className="brand-logo" src={association.logoUrl} alt="" />
          ) : (
            <span className="brand-mark" aria-hidden="true">
              {association.acronym}
            </span>
          )}
          <span>
            <strong>{association.name}</strong>
            <small>{association.holoName}</small>
          </span>
        </NavLink>
        <nav aria-label="Navegación principal" className="main-nav">
          {navigation.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink className="admin-link" to={session ? "/admin" : "/login"}>
          {session ? "Administrar" : "Acceso admin"}
        </NavLink>
      </header>
      {!configured && (
        <div className="system-banner" role="status">
          Modo sin conexión: configura <code>.env.local</code> cuando exista un proyecto Supabase
          Cloud.
        </div>
      )}
      {error && (
        <div className="system-banner error" role="alert">
          {error}
        </div>
      )}
      <main className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span>{association.name}</span>
        <span>{association.holoName} · Football Lite v0.2</span>
      </footer>
    </div>
  );
}

export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "La página no pudo cargarse.";
  return (
    <main className="site-main">
      <section className="empty-state">
        <p className="eyebrow">Error</p>
        <h1>{message}</h1>
        <NavLink className="button" to="/">
          Volver al inicio
        </NavLink>
      </section>
    </main>
  );
}
