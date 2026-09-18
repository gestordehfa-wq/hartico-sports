# Roadmap

El roadmap usa gates, no fechas artificiales. Cada fase termina con una decisión
verificable antes de ampliar alcance.

## Fundación — completada en este bootstrap

- auditoría read-only de HFA;
- límites entre core y dominios;
- elección de stack y workspaces;
- estrategia Supabase con aislamiento por producto;
- shells compilables de Racing, Football Lite y Tennis;
- paquetes comunes mínimos sin backend remoto;
- documentación operativa y repositorio Git local.

Gate: `npm run typecheck` y `npm run build` pasan; repositorio limpio.

## Racing / Formula v0.1 — siguiente, no iniciada

Objetivo: primer vertical slice público y administrable con temporada, pilotos,
escuderías, circuitos y Grandes Premios, sin clasificación avanzada ni telemetría.

Entregables propuestos:

1. glosario y reglas de alcance aprobadas;
2. modelo relacional mínimo y threat model;
3. Supabase local, migraciones, RLS y seed ficticio;
4. listado/detalle público de calendario y participantes;
5. autenticación admin y CRUD mínimo mediante operaciones auditadas;
6. tests de dominio, repositorio y políticas;
7. build y runbook local.

Gate: ver [RACING_V0_1.md](RACING_V0_1.md).

## Racing v0.2 — Qualifying & Race

- exactamente dos intentos de clasificación por piloto;
- mejor tiempo válido calculado y parrilla derivada;
- carrera corta de 4 a 8 vueltas;
- una parada obligatoria a pits, registrada con su vuelta;
- resultados y estados `finished`, `dnf`, `dns` y `dsq`;
- validaciones deportivas específicas, sin tabla genérica de sesiones.

El flujo canónico es Gran Premio → clasificación → parrilla → carrera. Racing no
incorporará prácticas, sprint ni Q1/Q2/Q3. Puntos y standings quedan para un
incremento posterior, junto con penalizaciones, estadísticas, récords, museo y
awards.

Cada incremento debe cerrar un flujo completo antes de abrir el siguiente.

## Football Lite discovery

Comienza después de validar los límites comunes con Racing. Primero define:

- modelo de asociación y política white-label;
- decisión de multitenancy frente a despliegue dedicado;
- temporada, competición, equipo, jugador y plantilla mínima;
- partido/incidencias sin importar ratings ni módulos HFA;
- matriz RLS tenant-scoped y pruebas de aislamiento.

Solo entonces se evaluará extraer administración compartida.

## Tennis discovery

Comienza con glosario y reglas: singles/doubles, formatos de sets, retiros,
walkovers, cuadros y ranking. Su modelo no deriva de Football Lite.

## Capacidades transversales futuras

Se incorporan cuando un producto las necesita y un segundo confirma la semántica:

- upload de imágenes;
- data table avanzada;
- modal/form framework;
- auditoría UI;
- configuración white-label;
- observabilidad y error reporting;
- CI selectivo/caché de tareas;
- SSO, solo si surge un caso de negocio concreto.

## Fuera de alcance hasta nueva decisión

- migrar o refactorizar HFA;
- base de datos deportiva compartida;
- data warehouse global;
- app móvil nativa;
- CMS, apuestas, monedas o cartas;
- deploys y recursos remotos de producción.
