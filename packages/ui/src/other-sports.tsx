import { type SportId, sportSites } from "@hartico/shared";

/**
 * Barra "Otros deportes" común a Racing, Football y Tennis. Cada sitio conserva su
 * branding, navegación y administración; esta barra solo enlaza los sitios (sin SSO ni
 * transferencia de sesión). El deporte actual se marca con `aria-current`.
 */
export function OtherSports({ current }: Readonly<{ current: SportId }>) {
  return (
    <nav className="other-sports" aria-label="Otros deportes">
      <span className="other-sports-label">Otros deportes</span>
      <ul>
        {sportSites.map((site) => (
          <li key={site.id} className={site.id === current ? "current" : undefined}>
            {site.id === current ? (
              <span aria-current="page">
                {site.label}
                <small>actual</small>
              </span>
            ) : (
              <a href={site.href}>{site.label}</a>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
