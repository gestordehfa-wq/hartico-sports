# Supabase de Football Lite

Esta carpeta pertenece exclusivamente a Football Lite. Las migraciones están
preparadas para aplicarse a un proyecto Supabase Cloud dedicado; no requieren
PostgreSQL local, Docker ni WSL para desarrollar o compilar el frontend.

No hay proyecto remoto vinculado desde el repositorio. Cuando exista un destino
aprobado, revisar el project ref y ejecutar manualmente las migraciones con la
CLI o el SQL editor. Nunca usar el proyecto de HFA.

Orden:

1. `001_identity_seasons.sql`
2. `002_competition_people.sql`
3. `003_matches_events.sql`
4. `004_awards_projections.sql`
5. `005_audit.sql`

Los tests SQL de `tests/` son opcionales hasta disponer de un entorno PostgreSQL
compatible con Supabase y pgTAP. La ausencia de ese entorno no bloquea el build.
