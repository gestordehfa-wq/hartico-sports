# Modelo de datos — Football Lite v0.1

Este modelo pertenece solo a `apps/football-lite`. No reutiliza tablas de Racing,
Tennis o HFA y se despliega en un proyecto Supabase independiente.

## Relaciones

```text
seasons ──< competitions ──< matches ──< match_events
    │              │              └────< match_player_appearances
    │              │
    ├──< season_player_rosters >── teams
    │               │
    │             players
    │
    └──< awards >── competition / player / team (opcionales según premio)
```

## Tablas

### `seasons`

`id`, `name`, `slug`, `status`, `start_date`, `end_date`, timestamps. Estados:
`draft`, `active`, `completed`, `archived`. Un índice parcial admite una sola
temporada `active`.

### `competitions`

Pertenece a una temporada. Tipos `league`, `cup`, `supercup`; estados `draft`,
`active`, `completed`, `archived`. La pareja `(id, season_id)` permite que
`matches` garantice por FK que competición y temporada coinciden.

### `teams` y `players`

Catálogos separados. Equipo conserva identidad deportiva; jugador conserva
posición `POR`, `DEF`, `MED` o `ATK`. No hay arrays de jugadores en equipos ni
ratings, OVR, economía o cartas.

### `season_player_rosters`

Relación histórica jugador/equipo/temporada con fechas opcionales, rol y estado.
Permite representar altas, bajas, cesiones y futuros cambios sin implementar un
motor de transferencias.

### `matches`

Relaciona competición, temporada, local y visita. La base impide un equipo contra
sí mismo, marcadores negativos y un estado `finished` sin ambos marcadores.

### `match_events`

Eventos `goal`, `assist`, `yellow_card`, `red_card` y `own_goal`. `player_id` es
el protagonista y `related_player_id` permite asociar el asistente a un gol. Para
compatibilidad operativa también se acepta un evento `assist`; la proyección usa
una unión para no duplicar el mismo asistente/partido/minuto.

### `match_player_appearances`

Una fila jugador/partido, con equipo y flag `starter`. Existe solo para derivar
partidos jugados correctamente; no almacena minutos, ratings ni táctica.

### `awards`

Premios `champion`, `top_scorer`, `top_assister`, `best_player` por temporada y
opcionalmente competición. Requiere al menos un destinatario jugador o equipo.
La adjudicación es manual en v0.1.

### `role_memberships` y `audit_events`

Infraestructura local de autorización y trazabilidad. Solo existe el rol `admin`.
Auditoría registra actor, entidad, entity id, operación, before/after, timestamp y
transacción; los clientes no pueden escribirla.

## Datos derivados

- `league_standings`: PJ, PG, PE, PP, GF, GC, DG y PTS desde `finished`.
- `player_statistics`: apariciones, goles, asistencias, amarillas y rojas.
- `team_statistics`: partidos, GF y GC.

El desempate v0.1 es PTS → DG → GF → nombre en frontend. Formatos de copa,
criterios head-to-head y reglamentos versionados quedan para una fase posterior.

## RLS

Cada tabla habilita RLS en su migración de creación:

| Actor | Lectura | Escritura |
|---|---|---|
| anon | información publicada | ninguna |
| authenticated | todas las filas deportivas | ninguna |
| admin | todas las filas deportivas | CRUD deportivo |

`role_memberships` no ofrece escritura a clientes, incluido admin, para impedir
autopromoción. `audit_events` solo se lee como admin y solo triggers propietarios
insertan registros.

## White-label

La marca no se mezcla con el modelo deportivo. `src/config/association.ts` carga
una configuración única por despliegue desde variables `VITE_ASSOCIATION_*`,
colores y etiqueta de temporada. Esta v0.1 usa despliegues dedicados, no una
tabla multi-tenant ni un selector de asociación enviado por el cliente.
