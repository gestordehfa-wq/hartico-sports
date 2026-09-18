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
