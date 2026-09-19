# Racing v0.2

Flujo: Gran Premio → Clasificación → Parrilla → Carrera → Resultados → Campeonato.
Migración incremental: `apps/racing/supabase/migrations/008_qualifying_race_results.sql`.

## Modelo

| Tabla | Propósito |
| --- | --- |
| `qualifying_results` | Un registro por piloto y GP con exactamente dos intentos (`valid`/`invalid`/`not_recorded`) en milisegundos. `best_time_ms` es una columna generada con el menor intento válido. |
| `race_results` | Estado `finished`/`dnf`/`dns`/`dsq`, posición final (solo `finished`), vueltas, tiempo, parada en pits (vuelta y cumplimiento) y `team_id` representado en ese GP. |
| `points_scale` | Puntos por posición y temporada, configurables por el administrador. |
| `grand_prix_result_confirmations` | Una fila = GP confirmado. Solo la escribe `confirm_grand_prix_results` / `reopen_grand_prix_results`. |
| `result_history` | Historial append-only de confirmaciones y reaperturas con snapshot JSON y razón. |

No existen prácticas, sprint, Q1/Q2/Q3 ni tablas de sesión.

## Reglas

- **Parrilla**: se deriva (`buildGrid`) por mejor tiempo válido; desempate por segundo tiempo válido y luego `driver_id`. Sin tiempo válido, al final. El admin puede copiarla a `race_results.grid_position`.
- **Vueltas**: 4–8, `grand_prix_events.race_laps` o `circuits.default_laps`. Un trigger impide vueltas o parada por encima de ese valor.
- **Pit obligatorio**: todo piloto `finished` debe cumplirlo. Si no, el sistema **solo lo identifica** y bloquea la confirmación hasta que exista `pit_resolution_note` (resolución administrativa según el reglamento de la asociación). No se aplica ninguna sanción automática.
- **Equipo histórico**: `team_id` se guarda en clasificación y carrera y debe corresponder a una participación del piloto en la temporada. Una transferencia posterior no altera resultados pasados; la clasificación de escuderías suma por `team_id` del resultado.
- **Confirmación**: exige posiciones finales únicas y consecutivas, resolución de pits y congela `points` desde `points_scale`. Cambiar la escala después no reescribe resultados confirmados.
- **Inmutabilidad**: con GP confirmado, triggers rechazan INSERT/UPDATE/DELETE de clasificación y carrera incluso para el admin. Reabrir exige razón (≥10 caracteres), queda en `result_history` y limpia los puntos. `anon` y usuarios normales no escriben nada.
- **Visibilidad**: la clasificación es pública con la temporada; los resultados de carrera solo tras la confirmación.
- **Campeonato** (`driverStandings`/`teamStandings`): solo GP confirmados. Desempate: puntos, más victorias, más segundos puestos… y finalmente nombre.

## Interfaz

Público: `/grand-prix/:id` (clasificación, parrilla, carrera, pits) y `/championship` (pilotos, escuderías, resultados por GP, escala de puntos). Admin: recursos `Clasificación`, `Resultados de carrera`, `Escala de puntos` y la consola `Control de carrera` (`/admin/race-control`) para revisar pendientes, aplicar parrilla, confirmar y reabrir.

## Pendiente

- Los tiempos se introducen en milisegundos en el formulario administrativo; la tabla los muestra también como `m:ss.mmm`.
- No hay carga masiva ni plantilla inicial de puntos: el admin crea las filas de `points_scale`.
- Tests SQL nuevos (`008_racing_v02_results.sql`) escritos pero no ejecutados en este entorno (sin Docker/PostgreSQL local); ejecutar `npm run supabase:test:cloud` tras aplicar la migración.
