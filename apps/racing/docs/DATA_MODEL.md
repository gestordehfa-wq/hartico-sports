# Modelo de datos — Racing v0.1

```text
auth.users ──1 profiles
     │
     └──0..1 role_memberships (admin)

seasons 1──* season_driver_entries *──1 drivers
                         │
                         └────────────*──1 teams

seasons 1──* grand_prix_events *──1 circuits
```

## Catálogos

`seasons` mantiene el período y estado del campeonato. Las fechas no tienen que
coincidir con el año calendario; `year` es solo una referencia opcional.

`drivers` contiene identidad deportiva pública y número habitual, nunca
estadísticas derivadas ni equipo actual. `teams` contiene identidad visual y
estado de la escudería.

`circuits` es reutilizable entre temporadas. `default_laps` expresa la modalidad
de carrera corta y solo admite 4–8 vueltas.

## Historial de participación

`season_driver_entries` significa que un piloto representa a una escudería en
una temporada durante un intervalo. El número puede sobrescribir el habitual y
los roles `primary`, `reserve` y `substitute` cubren el vocabulario mínimo. Los
intervalos abiertos usan fechas nulas y no pueden solaparse para un mismo
piloto/temporada. Así se permiten sustituciones y cambios de escudería sin
sobrescribir historia.

## Calendario

`grand_prix_events` identifica una ronda por temporada y circuito. No contiene
sesiones. `race_laps` solo existe como override opcional del valor del circuito;
`grand_prix_calendar.effective_race_laps` resuelve el número definitivo.

## Identidad, autorización y auditoría

`profiles` extiende `auth.users` sin exponer PII. `role_memberships` mantiene el
único rol privilegiado de v0.1. `audit_events` es append-only desde el punto de
vista del cliente y recibe el estado anterior/posterior mediante triggers.

## Extensión prevista, no implementada

v0.2 añadirá conceptos concretos: `qualifying_attempts` (intento 1 o 2 y
`time_ms`), una proyección de mejor tiempo/parrilla, carrera, pit stop único por
piloto y resultado. No se creará una entidad universal `sessions`.
