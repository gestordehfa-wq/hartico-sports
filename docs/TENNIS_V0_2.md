# Tennis v0.2

Migración incremental: `apps/tennis/supabase/migrations/005_games_scoring_ranking.sql`.
Se conservan torneos, ediciones, cuadros de 4/8/16, inscripciones, seeds, H2H, historial, estadísticas y palmarés de v0.1.

## Formato de partido por juegos

Regla propia de Hartico Tennis (no son reglas oficiales ATP):

- Mejor de **5** juegos (gana quien llega a 3) o de **7** (llega a 4), configurable por edición (`tournament_editions.games_best_of`).
- Dentro del juego los puntos avanzan **0 → 15 → 30 → 40 → 45 → juego**. No hay deuce ni ventajas: quien puntúa estando en 45 gana el juego.
- `matches` guarda `player{1,2}_games` y `player{1,2}_points`. Un trigger copia `scoring_format`/`games_best_of` de la edición al crear cada partido (incluido el sorteo transaccional existente, que no se modificó).
- RPC administrativas: `record_match_point` (punto a un jugador), `set_match_score` (marcador manual o **resultado directo** con `confirm_result = true`) y `confirm_match_result` (reemplazada con una rama para juegos).
- El ganador avanza con el mismo flujo transaccional de v0.1. Al confirmar la final: campeón registrado y edición `completed`.
- Un partido `finished` en formato de juegos no se puede editar ni borrar (ni siquiera por el admin). Los partidos `walkover`/`retired` siguen el flujo v0.1.

### Compatibilidad con `best_of` (sets)

- `scoring_format` vale `sets` por defecto: toda edición y partido existente conserva su modelo. `best_of`, `match_sets` y `confirm_match_result` por sets funcionan igual y **no se reinterpretan**.
- `best_of` solo aplica al formato `sets`; en ediciones de juegos queda en su valor por defecto y se ignora. Constraints impiden mezclar marcador de juegos en partidos de sets y viceversa; `match_sets` rechaza partidos de juegos.
- El formato de una edición no se puede cambiar cuando ya existe su cuadro.
- H2H/estadísticas siguen contando sets; los partidos por juegos cuentan como partidos, victorias y títulos pero no suman sets.

## Ranking (últimas 52 semanas)

- `tournament_categories`: catálogo configurable (sembrado con major, masters, finals, standard, custom). `tournaments.category` pasó de un CHECK fijo a una FK; una categoría inexistente ahora falla con `23503` (el test SQL histórico de «categoría limitada» se actualizó a ese código).
- `ranking_point_rules(category, reached, points)`: puntos por ronda alcanzada (`champion`, `final`, `semifinal`, `quarterfinal`, `round_of_16`). La migración copia los valores vigentes de `tournament_point_rules` conservando la semántica de v0.1; esa tabla legada se mantiene pero la UI ya no la usa.
- `rollingRanking`: suma los puntos de ediciones `completed` con `end_date` en los 364 días previos a la fecha de corte. Desempate determinista: puntos, títulos, finales, nombre e id. `seasonRanking` conserva el ranking por temporada sin ventana.
- Actualización: el ranking se deriva de partidos confirmados, así que cambia al confirmar la final (edición `completed`).
- Evolución: `rankingWithMovement` compara con el ranking a la fecha del torneo anterior y `rankingHistory` da posición y puntos tras cada edición del jugador. Solo se muestran cuando hay al menos dos fechas de cierre.

## Interfaz

Público: Ranking (general, evolución, puntos por categoría, temporada), Cuadros y Partidos muestran juegos; el detalle del partido muestra juegos y puntos en directo.
Admin: `Categorías de torneo`, `Puntos de ranking`, ediciones con formato/juegos, y `Marcador en juegos` (puntos, corrección y resultado directo). «Generar cuadro» ahora activa la edición para publicar el cuadro.

## Pendiente

- El ranking es derivado con las reglas vigentes: cambiar puntos recalcula también posiciones históricas (no hay snapshots congelados).
- Estadísticas de juegos ganados/perdidos por jugador y H2H por juegos.
- Tests SQL nuevos (`009_tennis_v02_games_ranking.sql`) escritos pero no ejecutados en este entorno (sin Docker/PostgreSQL local).
