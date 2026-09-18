# Tennis v0.1 — modelo de datos

## Frontera

Tennis vive en el schema `tennis` del proyecto compartido. No referencia tablas
de Racing o Football Lite y no define entidades deportivas universales.

## Relaciones

```text
seasons ──< tournament_editions >── tournaments
                    │
                    ├──< tournament_entries >── players
                    ├──< matches ──< match_sets
                    │       └── next_match_id ──> matches
                    └──< awards >── players

tournament_point_rules: category + round_won -> points
```

- `tournaments` es la identidad histórica; `tournament_editions` es su realización dentro de una temporada.
- La superficie y categoría son vocabularios pequeños con `check constraints`, no catálogos prematuros.
- `tournament_entries` impide repetir jugador o seed en una edición. Un trigger limita la seed al tamaño del cuadro.
- `matches` normaliza el cuadro. `round_order`, `match_number`, `next_match_id` y `next_slot` representan avance sin JSON.
- `match_sets` registra únicamente el score final por set.
- `awards` es manual y pequeño; ranking, H2H, estadísticas y palmarés se derivan.

## Integridad del cuadro

Los tamaños v0.1 son 4, 8 y 16. La RPC `generate_tournament_draw` exige exactamente ese número de inscripciones activas, ubica seeds de forma determinista, genera todas las rondas y enlaza cada partido con un slot del siguiente. Solo opera sobre ediciones `draft` o `registration` sin partidos existentes.

`confirm_match_result` bloquea el partido, valida dos jugadores distintos, sets consecutivos, scores no empatados y mayoría coherente con `best_of`. Walkover y retiro requieren ganador explícito. Después marca ganador/perdedor y ocupa el slot siguiente solo si está libre o ya contiene al mismo ganador. La final asigna `champion`; no completa automáticamente la edición.

## Publicación y RLS

- `anon`: temporadas publicadas, jugadores activos/retirados, torneos activos/archivados, ediciones activas/completadas y sus datos relacionados.
- `authenticated`: lectura completa, incluidos borradores.
- `admin`: CRUD mediante membresía protegida y RPC sensibles.

No existe política cliente para crear membresías ni escribir auditoría. `audit_events` registra actor, action, entity, entity_id, before/after y timestamp mediante triggers propietarios.

## Ranking

`tournament_point_rules` usa `(category, round)` única. La ronda significa la última ronda ganada: ganar `final` equivale a campeón; ganar `semifinal` y perder la final equivale a finalista; ganar `quarterfinal` y perder semifinal equivale a semifinalista. Así no se persiste una “posición final” redundante.

Defaults de desarrollo:

| Categoría | Campeón (`final`) | Finalista (`semifinal`) | Semifinalista (`quarterfinal`) |
|---|---:|---:|---:|
| Major | 1000 | 600 | 360 |
| Masters | 500 | 300 | 180 |
| Standard | 250 | 150 | 90 |
| Finals | 750 | 450 | 270 |
| Custom | 0 | 0 | 0 |

Son configurables por admin y no representan puntos ATP/WTA.
