# Racing / Formula v0.1

Estado de implementación: vertical slice local completo; validación PostgreSQL
pendiente cuando esté disponible Supabase CLI.

## Resultado

Racing v0.1 permite consultar y administrar temporadas, pilotos, escuderías,
participaciones históricas, circuitos y Grandes Premios. Es un dominio propio,
con repositorio Supabase dentro de `apps/racing`, RLS deny-by-default y auditoría
de mutaciones. No usa datos, assets ni código de HFA.

## Decisiones de dominio

- `seasons.status` usa `draft`, `active`, `completed` y `archived`. Solo
  `active` y `completed` son públicos; un índice parcial permite una sola activa.
- Piloto y escudería no se acoplan: `season_driver_entries` conserva períodos,
  rol, estado y número. Una exclusión temporal impide asignaciones solapadas del
  mismo piloto en una temporada, pero permite cambios de equipo sucesivos.
- `grand_prix_events` es una ronda de una temporada en un circuito. Ronda y slug
  son únicos dentro de la temporada.
- `circuits.default_laps` es obligatorio y está restringido a 4–8.
  `grand_prix_events.race_laps` permite un override también restringido a 4–8;
  la vista `grand_prix_calendar` calcula el valor efectivo.
- El contenido local es ficticio y administrable; no hay integración con APIs,
  marcas ni datasets oficiales.

La propuesta previa `draft/published/archived` se sustituyó por el vocabulario
operativo aprobado. La publicación se deriva del estado (`active` o
`completed`), evitando mantener dos estados potencialmente contradictorios.

## Competición canónica futura

Hartico Racing no reproduce un fin de semana de Fórmula 1 y no tendrá prácticas,
sprint, Q1/Q2/Q3 ni una tabla `sessions`:

```text
Gran Premio
  → Clasificación: intento 1 + intento 2
  → Mejor tiempo válido numérico
  → Parrilla
  → Carrera de 4–8 vueltas
  → Una parada obligatoria a pits por piloto
  → Resultado
```

Los intentos futuros se persistirán normalizados con número limitado a 1 o 2 y
tiempo entero en milisegundos; el mejor tiempo será derivado, no editable. El
pit stop se registrará con vuelta y no como un simple booleano. Ninguna de esas
tablas se anticipa en v0.1.

## Seguridad

Supabase Auth gestiona la sesión. `role_memberships` acepta únicamente `admin`.
La función `app_private.is_admin` es `security definer`, fija `search_path`, no
se expone a anon y solo consulta membresías. `current_user_is_admin` ofrece al
frontend una comprobación mínima, mientras cada escritura se vuelve a autorizar
mediante RLS.

Anon y authenticated leen solo filas publicables. Solo un authenticated con
membresía admin puede insertar, actualizar o eliminar. `audit_events` no concede
escritura a clientes: triggers propietarios registran actor, operación, entidad,
id, before/after, timestamp y transacción.

## Interfaz

El lenguaje visual es Classic Windows Enterprise UI: workspace claro, navegación
compacta, paneles rectangulares con title bar, status bars, formularios densos y
tablas con scroll controlado. Se inspeccionó `C:\hfa` solo como referencia visual
(la ruta solicitada `D:\hfa` no existía); no se copiaron CSS, DOM ni assets.

Rutas públicas: `/`, `/season`, `/drivers`, `/drivers/:id`, `/teams`,
`/teams/:id`, `/circuits`, `/circuits/:id` y `/calendar`.

Rutas administrativas: `/login`, `/admin` y `/admin/:resource` para los seis
catálogos. React Router está justificado por navegación/detalles/CRUD. Estado
React local y un repositorio son suficientes; no se añadió store ni query cache.

## Estado local

No se crea ni vincula proyecto remoto. El frontend requiere:

```powershell
Copy-Item apps/racing/.env.example apps/racing/.env.local
npm run supabase:racing:start
npm run supabase:racing:reset
npm run supabase:racing:test
npm run dev:racing
```

La CLI está fijada como dependencia de desarrollo del workspace para evitar una
instalación global. Requiere Docker Desktop o Podman en ejecución. Para crear el
primer admin, registrar el usuario mediante Auth local y ejecutar como propietario
de base:

```sql
insert into public.role_memberships (user_id, role)
values ('<auth.users.id>', 'admin');
```

Nunca se utiliza `service_role` en el navegador.
