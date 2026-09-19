# Football Lite v0.2

Migración incremental: `apps/football-lite/supabase/migrations/006_competition_formats.sql`.
Se conservan las estadísticas, eventos, apariciones y premios de v0.1. No se añaden cartas, economía, CMS ni funciones de HFA.

## Liga

- `competition_teams` registra la inscripción (con `seed` opcional); solo ligas y copas la admiten y se cierra al existir partidos. Si una competición tiene inscripciones, sus partidos solo aceptan equipos inscritos; sin inscripciones se conserva el criterio v0.1.
- `competitions.legs`: 1 = una vuelta, 2 = ida y vuelta. `generateLeagueFixture` (método del círculo) crea las jornadas: cada pareja se enfrenta una vez (o dos con localía invertida), nadie juega dos veces por jornada y con número impar uno descansa. El admin la genera desde «Formatos de competición»; se inserta en una sola sentencia (atómica).
- Clasificación derivada (`competitionStandings`): PJ, PG, PE, PP, GF, GC, DG, PTS con 3-1-0; orden PTS, DG, GF, nombre.
- `close_league`: exige todos los partidos finalizados/cancelados y registra campeón + premio `champion`. Si hay empate en PTS, DG y GF en la cima **no elige al azar ni por nombre**: exige que el administrador indique al campeón y la regla de la asociación.

## Copa

- Cuadros de 4, 8 y 16 equipos inscritos (`generateCupBracket`, cabezas de serie separadas hasta la final). Los partidos usan `stage`, `round_order`, `match_number`, `next_match_id` y `next_slot`. Para las rondas sin rival, `matches.home_team_id/away_team_id` dejaron de ser NOT NULL (único cambio que relaja v0.1; `finished` sigue exigiendo ambos equipos).
- `advance_knockout_winner` (transaccional): decide por marcador y propaga al ganador a su slot. Un **empate eliminatorio nunca se resuelve solo**: requiere `p_tiebreak_winner_id` entre los dos equipos y `p_tiebreak_note` con el mecanismo reglamentario, que queda registrado en `matches.tiebreak_note`. No hay penales simulados ni sorteos.
- El ganador de la final registra campeón y premio.

## Supercopa

- `generate_supercup` enfrenta al campeón de una Liga con el de una Copa (`competitions.source_league_id/source_cup_id` conservan el origen). Si un mismo equipo ganó ambas, **falla hasta que el administrador elige el rival**; nunca lo elige solo. Resultado, ganador y campeón usan `advance_knockout_winner`; el historial son las Supercopas completadas.

## Inmutabilidad

Un partido con ganador registrado, o de una competición con campeón, no puede cambiar resultado, equipos ni ganador ni borrarse (ni por el admin; trigger `protect_decided_matches`). Los partidos de liga siguen editables hasta cerrar la liga. Sin escritura pública: `anon` y usuarios normales no escriben nada.

## Interfaz

Público: detalle de competición con campeón, clasificación, calendario por jornada, cuadro, Supercopa, goleadores, asistentes y premios; Estadísticas filtra por temporada y competición; Historial lista campeones.
Admin: recursos `Inscripción de equipos` y `Competiciones` (vueltas) y la consola `Formatos de competición` (fixture/cuadro, resultados, avance de ganador, cierre de liga, Supercopa).

## Pendiente

- Estadísticas de equipos y jugadores por competición usan los eventos existentes; no hay tabla de goleadores por competición separada.
- Sin sorteo de cabezas de serie: el orden es por `seed` y luego id.
- Tests SQL nuevos (`010_football_v02_formats.sql`) escritos pero no ejecutados en este entorno (sin Docker/PostgreSQL local).
