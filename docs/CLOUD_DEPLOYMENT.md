# Cloud deployment v0.1

Esta guía conecta el monorepo a tres infraestructuras completamente aisladas.
No requiere Docker, WSL ni PostgreSQL local y no autoriza el uso de HFA.

## Estado y fronteras

| Producto | Supabase esperado | Vercel esperado | Root Directory | Desarrollo |
|---|---|---|---|---|
| Racing | `hartico-racing` | `hartico-racing` | `apps/racing` | `http://localhost:5173` |
| Football Lite | `hartico-football` | `hartico-football` | `apps/football-lite` | `http://localhost:5174` |
| Tennis | `hartico-tennis` | `hartico-tennis` | `apps/tennis` | `http://localhost:5175` |

Los nombres anteriores son nombres de proyecto, no Project IDs. Nunca se debe
adivinar ni guardar un Project ID en Git. El enlace de la CLI queda en la
carpeta ignorada `supabase/.temp/` de cada aplicación.

Comprobación realizada al iniciar esta fase: la cuenta Supabase autenticada solo
contenía `HFA`. No se vinculó ni modificó. Antes de seguir con Cloud, crear los
tres proyectos de esta tabla desde Supabase Dashboard.

## Crear los tres proyectos Supabase

Repetir estos pasos tres veces, una por producto:

1. En Supabase Dashboard, seleccionar **New project**.
2. Usar exactamente el nombre de la tabla y una región apropiada para los
   usuarios previstos.
3. Generar una contraseña de base distinta y guardarla en un gestor de
   contraseñas. No ponerla en el repositorio, `.env.local`, Vercel ni una
   variable `VITE_*`.
4. Esperar a que el proyecto figure como `ACTIVE_HEALTHY`.
5. En **Project Settings → API**, anotar de forma privada Project URL,
   publishable key y Project ref. No copiar `service_role` ni secret keys.
6. Confirmar que el proyecto seleccionado no es HFA ni otro deporte.

Después, comprobar los nombres sin exponer claves:

```powershell
npx supabase projects list
```

## Revisión SQL previa

Las migraciones están numeradas, son exclusivas de cada app y se aplican en
orden lexicográfico:

- Racing: `001_core_identity.sql` a `007_audit.sql`.
- Football Lite: `001_identity_seasons.sql` a `005_audit.sql`.
- Tennis: `001_identity_catalogs.sql` a `004_audit.sql`.

La revisión v0.1 confirma RLS en cada tabla expuesta, escritura administrativa
protegida por `app_private.is_admin`, funciones privilegiadas con
`search_path` fijado, grants limitados y auditoría append-only. No hay
referencias entre deportes ni a HFA.

No ejecutar `db reset --linked`: destruye los datos del proyecto remoto. No
usar `--include-seed`; los smoke tests deben crear solo los datos mínimos desde
la UI y los tests pgTAP usan transacciones que terminan en rollback.

## Vincular y aplicar migraciones

Ejecutar un bloque, verificar el destino mostrado por la CLI y solo entonces
continuar con el siguiente. Sustituir cada marcador por el Project ref real.

### Racing

```powershell
npm run supabase:racing:link -- --project-ref <RACING_PROJECT_REF>
npx supabase projects list --workdir apps/racing
npm run supabase:racing:push:dry-run
npm run supabase:racing:push
npm run supabase:racing:test:cloud
```

### Football Lite

```powershell
npm run supabase:football:link -- --project-ref <FOOTBALL_PROJECT_REF>
npx supabase projects list --workdir apps/football-lite
npm run supabase:football:push:dry-run
npm run supabase:football:push
npm run supabase:football:test:cloud
```

### Tennis

```powershell
npm run supabase:tennis:link -- --project-ref <TENNIS_PROJECT_REF>
npx supabase projects list --workdir apps/tennis
npm run supabase:tennis:push:dry-run
npm run supabase:tennis:push
npm run supabase:tennis:test:cloud
```

Cada `dry-run` debe listar únicamente migraciones de la app correspondiente.
Detenerse si aparece un nombre, tabla o Project ref de otro producto. Los tests
Cloud deben ejecutarse inmediatamente después de migrar y antes de crear datos
reales, porque verifican constraints, anon/authenticated/admin, rechazo de
escritura, anti-autopromoción y auditoría.

## Variables por aplicación

Las variables tienen prefijo de producto para impedir que una app consuma por
accidente la configuración genérica de otra:

```text
Racing
VITE_RACING_SUPABASE_URL=
VITE_RACING_SUPABASE_PUBLISHABLE_KEY=

Football Lite
VITE_FOOTBALL_SUPABASE_URL=
VITE_FOOTBALL_SUPABASE_PUBLISHABLE_KEY=

Tennis
VITE_TENNIS_SUPABASE_URL=
VITE_TENNIS_SUPABASE_PUBLISHABLE_KEY=
```

Para desarrollo, copiar solo la plantilla de la app usada:

```powershell
Copy-Item apps/racing/.env.example apps/racing/.env.local
Copy-Item apps/football-lite/.env.example apps/football-lite/.env.local
Copy-Item apps/tennis/.env.example apps/tennis/.env.local
```

`.env.local` está ignorado. La publishable key es la credencial pública prevista
para un cliente con RLS; aun así, no se debe mezclar entre productos. Nunca usar
`service_role`, secret keys, contraseña PostgreSQL o database URL en frontend.

## Primer administrador

En cada proyecto:

1. Abrir **Authentication → Users → Add user**.
2. Crear el usuario con email y contraseña. Si se usa el mismo email en los tres
   proyectos, siguen siendo tres identidades independientes.
3. Copiar el UUID del usuario del proyecto actual.
4. Abrir **SQL Editor** en ese mismo proyecto y ejecutar, sustituyendo el UUID:

```sql
begin;

insert into public.role_memberships (user_id, role)
values ('<AUTH_USER_UUID>', 'admin')
on conflict (user_id) do update set role = excluded.role;

select user_id, role, created_at
from public.role_memberships
where user_id = '<AUTH_USER_UUID>';

commit;
```

La operación se hace con el rol propietario desde Dashboard. No existe grant ni
flujo frontend para insertar membresías, por lo que el cliente no puede
autoasignarse `admin`. Crear además un segundo usuario Auth sin membresía para
la prueba negativa.

## GitHub

Se usa un único repositorio `hartico-sports`, rama principal `main`. Antes de
crear el remoto o hacer push:

```powershell
git status --short --branch
git ls-files | Select-String -Pattern '(^|/|\\)\.env($|\.)'
git grep -n -I -E 'eyJ[A-Za-z0-9_-]{20,}|sb_secret_|postgres(ql)?://'
git remote -v
```

El primer comando de búsqueda de `.env` debe mostrar solo los tres
`.env.example`; el escaneo de tokens/URLs no debe devolver credenciales. Las
menciones documentales a `service_role` son prohibiciones, no secretos.

Crear en GitHub un repositorio vacío llamado `hartico-sports`, sin README,
licencia ni `.gitignore` generados por GitHub. Cuando se conozca la URL real:

```powershell
git remote add origin <GITHUB_REPOSITORY_URL>
git remote -v
git branch --show-current
```

La rama debe ser `main`. El push requiere autorización expresa y credenciales
del usuario:

```powershell
git push -u origin main
```

## Vercel

Importar el mismo repositorio GitHub tres veces y crear tres proyectos. En cada
uno seleccionar el Root Directory de la tabla inicial. Como las apps consumen
`packages/*`, confirmar que **Include source files outside of the Root Directory
in the Build Step** está habilitado.

Cada root incluye su propio `vercel.json` con:

- framework Vite;
- instalación `cd ../.. && npm ci`;
- build `npm run build`;
- output `dist`;
- rewrite SPA `/(.*) → /index.html`.

Configurar en **Settings → Environment Variables** solo el par de variables del
producto actual, para Production y Preview cuando corresponda. No añadir las
variables de los otros dos deportes y nunca añadir credenciales privilegiadas.

Después de guardar variables, redeployar. Probar una ruta profunda directamente
y con recarga; el rewrite debe servir `index.html` y React Router debe resolver
la ruta, sin 404 de Vercel.

## Auth URLs

En **Authentication → URL Configuration** de cada Supabase:

- **Site URL**: URL estable de producción del Vercel de ese producto.
- **Redirect URLs**: la URL estable con `/**` y el localhost correspondiente
  con `/**`.
- Si se habilitan previews, añadir únicamente el patrón Vercel de la cuenta y
  producto, por ejemplo `https://*-<team-slug>.vercel.app/**`; evitar patrones
  más amplios de lo necesario.

Valores locales:

```text
Racing:       http://localhost:5173/**
Football:     http://localhost:5174/**
Tennis:       http://localhost:5175/**
```

El login v0.1 usa email/contraseña. Site URL y redirects también dejan preparado
el retorno correcto para confirmaciones o recuperación de contraseña futuras.

## RLS y auditoría

La matriz que debe quedar probada en cada proyecto es:

| Actor | Lectura publicada | Lectura borradores | CRUD deportivo | Membresías | Auditoría |
|---|---:|---:|---:|---:|---:|
| `anon` | Sí | No | No | No | No |
| `authenticated` normal | Sí | Sí | No | No | No |
| `authenticated` admin | Sí | Sí | Sí | Solo lectura permitida por política | Solo lectura |

Los tests pgTAP realizan la prueba negativa en PostgreSQL, no solo en la UI. En
la validación manual, iniciar sesión con el usuario normal y confirmar que no
entra a admin; después ejecutar el intento de escritura del test RLS de la app y
comprobar SQLSTATE `42501`.

Tras una mutación real del admin, revisar en Table Editor o SQL Editor:

```sql
select actor_id, action, entity, entity_id, before_data, after_data, occurred_at
from public.audit_events
order by occurred_at desc
limit 20;
```

Football Lite llama a la columna `operation`, no `action`:

```sql
select actor_id, operation, entity, entity_id, before_data, after_data, occurred_at
from public.audit_events
order by occurred_at desc
limit 20;
```

Debe coincidir `actor_id` con el usuario Auth, y update debe contener `before` y
`after`. Ningún actor cliente, incluido admin, debe poder insertar, editar o
borrar `audit_events` manualmente.

## Smoke tests de producción

Usar pocos datos identificados como smoke y borrarlos mediante el CRUD si ya no
son útiles. Recargar después de cada bloque para demostrar persistencia.

### Racing

- Público: `/`, `/season`, `/drivers`, `/teams`, `/circuits`, `/calendar` y un
  detalle de piloto, equipo y circuito.
- Admin: login; crear temporada, piloto, escudería, participación, circuito y
  Grand Prix; editar al menos un registro; recargar y volver a consultar.
- Seguridad: usuario normal no escribe; una mutación admin aparece en auditoría.

### Football Lite

- Público: `/`, competitions, teams, players, matches, standings, stats e
  history, incluidos detalles disponibles.
- Admin: temporada, competición, dos equipos, jugadores, plantillas, partido,
  eventos, aparición y award.
- Confirmar resultado, tabla 3-1-0, estadísticas derivadas y persistencia.
- Seguridad: usuario normal no escribe; una mutación admin aparece en auditoría.

### Tennis

- Público: `/`, tournaments, players, matches, ranking, draw, H2H e history,
  incluidos detalles disponibles.
- Admin: temporada → jugadores → torneo → edición → inscripciones → seeds →
  generar cuadro → resultados → ranking.
- Confirmar avance del ganador y persistencia tras recarga.
- Seguridad: usuario normal no escribe; una mutación admin aparece en auditoría.

En desktop revisar el flujo completo. En mobile basta confirmar navegación,
formularios, tablas y diálogos utilizables, sin rediseñar Classic Windows
Enterprise UI.

## Quality gates

Antes del primer push y de cada deploy importante:

```powershell
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
```

No continuar con deploy si falla algún comando.

## Flujo de actualización

Código:

```text
editar código → tests → commit → push → Vercel deploy → smoke test
```

Base de datos:

```text
crear nueva migración en la app propietaria
→ revisar orden, RLS, funciones, grants y auditoría
→ link y dry-run contra el proyecto correcto
→ aplicar con db push
→ ejecutar tests Cloud
→ push del código/frontend
```

No editar una migración ya aplicada. No copiar migraciones entre deportes. No
depender de Docker para este flujo.
