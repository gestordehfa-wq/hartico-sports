import { OtherSports } from "@hartico/ui";
import { isRouteErrorResponse, NavLink, Outlet, useRouteError } from "react-router-dom";
import { useRacing } from "./racing-context";

const navigation = [
  ["/", "Inicio"], ["/season", "Temporada"], ["/drivers", "Pilotos"],
  ["/teams", "Escuderías"], ["/calendar", "Calendario"], ["/championship", "Campeonato"], ["/circuits", "Circuitos"],
] as const;

export function AppLayout() {
  const { configured, error, session } = useRacing();
  return <div className="racing-app">
    <OtherSports current="racing" />
    <header className="site-header">
      <NavLink to="/" className="brand" aria-label="Hartico Racing, inicio"><span className="brand-mark" aria-hidden="true">HR</span><span>Hartico <strong>Racing</strong></span></NavLink>
      <nav aria-label="Navegación principal" className="main-nav">{navigation.map(([to, label]) => <NavLink key={to} to={to} end={to === "/"}>{label}</NavLink>)}</nav>
      <NavLink className="admin-link" to={session ? "/admin" : "/login"}>{session ? "Administrar" : "Acceso admin"}</NavLink>
    </header>
    {!configured && <div className="system-banner" role="status">Backend local no configurado. Consulta <code>.env.example</code> para conectarlo.</div>}
    {error && <div className="system-banner error" role="alert">{error}</div>}
    <main className="site-main"><Outlet /></main>
    <footer className="site-footer"><span>Hartico Racing</span><span>Campeonato independiente · v0.2</span></footer>
  </div>;
}

export function ErrorPage() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : "La página no pudo cargarse.";
  return <main className="site-main"><section className="empty-state"><p className="eyebrow">Error</p><h1>{message}</h1><NavLink className="button" to="/">Volver al inicio</NavLink></section></main>;
}
