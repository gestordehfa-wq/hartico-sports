# Shared UI

`@hartico/ui` contiene únicamente primitivas agnósticas al deporte.

## Classic Windows Enterprise

`classic-tokens.css` centraliza tipografía base, alturas de controles/title bars, spacing, radios, superficies, bordes y colores semánticos. Cada app conserva sus variables de marca (`accent`, `accent-soft`, logos y nombres) y puede ajustar el workspace sin cambiar la semántica común.

Primitivas extraídas después de observar equivalencia real en Racing y Football Lite:

- `WindowPanel`: title bar, body y status bar opcional;
- `StatusBadge`: estado semántico con etiqueta opcional;
- `EmptyState` y `LoadingPanel`: feedback accesible;
- `DataGrid`: tabla densa genérica con render por columna.

No se comparten rutas, menús, modelos, tarjetas de participantes, standings, cuadros ni reglas deportivas.

## Otros deportes (v0.2)

`OtherSports` (`@hartico/ui`) es la barra de navegación entre Racing, Football y Tennis. Es una tira Classic Windows Enterprise sobre el encabezado de cada app con los tres deportes; el actual se muestra resaltado con `aria-current="page"` y los demás son enlaces normales (misma pestaña, funcionan en escritorio y móvil, sin JavaScript).

- Los destinos viven en `sportSites` (`@hartico/shared`): `https://racing.hfa.bar`, `https://football.hfa.bar`, `https://tennis.hfa.bar`. Es un directorio de enlaces; no contiene reglas ni entidades deportivas.
- Estilos: `@hartico/ui/sports-nav.css` (importado desde el CSS de cada app junto a `classic-tokens.css`); usa los tokens comunes y el `--accent` de cada app.
- No hay SSO ni transferencia de sesión, y no enlaza a HFA. Cada app conserva su branding, navegación y administración.
