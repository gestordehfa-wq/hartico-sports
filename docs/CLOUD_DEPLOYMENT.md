# Cloud deployment

Estado: repositorio preparado; ningún cambio Cloud ejecutado.

## Topología aprobada

| Producto | Supabase | Schema | Vercel | Root Directory |
|---|---|---|---|---|
| Racing | `hartico-sports` | `racing` | `hartico-racing` | `apps/racing` |
| Football Lite | `hartico-sports` | `football` | `hartico-football` | `apps/football-lite` |
| Tennis | `hartico-sports` | `tennis` | `hartico-tennis` | `apps/tennis` |

Solo existe una configuración CLI en `supabase/config.toml`. No usar las
carpetas `apps/*/supabase` como workdir remoto.

## Preparación local

```powershell
npm run supabase:assemble
npm run supabase:check
npm run typecheck
npm run lint
npm run test
npm run build
```

El ensamblador produce un historial global: primero Racing, después Football y
Tennis, con timestamps únicos. El orden entre dominios no crea dependencias;
solo evita colisiones en el ledger del proyecto.

## Configuración manual requerida en Dashboard

Antes de cualquier migración:

1. Abrir el proyecto exacto `hartico-sports` y obtener su Project ref real.
2. En **Project Settings → API → Data API → Exposed schemas**, configurar
   exactamente `racing`, `football` y `tennis` como schemas deportivos.
3. No añadir `public`, `auth` o `extensions` para resolver errores de acceso.
4. Confirmar que se usará la Project URL y publishable/anon key del mismo
   proyecto en las tres aplicaciones.
5. En Auth URL Configuration, elegir una Site URL estable y añadir redirects
   explícitos para los tres productos y sus localhost. No usar un wildcard más
   amplio que los dominios propios.

La migración concede `USAGE`, permisos explícitos sobre tablas/vistas/RPC y
defaults restrictivos. Exponer un schema en Dashboard no sustituye RLS.

## Único enlace y única migración remota

No ejecutar todavía estos comandos. Cuando el Project ref haya sido revisado y
exista autorización expresa:

```powershell
npm run supabase:link -- --project-ref <HARTICO_SPORTS_PROJECT_REF>
npx supabase migration list --linked --workdir .
npm run supabase:push:dry-run
npm run supabase:push
npm run supabase:test:cloud
```

Verificar primero que el historial remoto sea compatible. Si contiene versiones
inesperadas, detenerse: no usar `migration repair`, no marcar versiones como
aplicadas y no empujar hasta revisar el estado real. El dry-run debe listar solo
los 16 archivos versionados en `supabase/migrations`. No ejecutar
`db reset --linked`, no incluir seeds y no hacer pushes separados por deporte.

## Primeros administradores

Auth es compartido. Crear cada usuario una sola vez y, desde SQL Editor con el
rol propietario, conceder únicamente las membresías necesarias:

```sql
begin;

insert into racing.role_memberships (user_id, role)
values ('<AUTH_USER_UUID>', 'admin')
on conflict (user_id) do update set role = excluded.role;

-- Repetir solo cuando corresponda:
-- insert into football.role_memberships (user_id, role) values (...) ...;
-- insert into tennis.role_memberships (user_id, role) values (...) ...;

commit;
```

No existe grant frontend para autoasignar membresías. Verificar con un usuario
normal y con admins exclusivos de cada producto.

## Variables Vercel

Los valores de URL/key serán iguales, pero cada proyecto recibe solo su par:

```text
hartico-racing
VITE_RACING_SUPABASE_URL
VITE_RACING_SUPABASE_ANON_KEY

hartico-football
VITE_FOOTBALL_SUPABASE_URL
VITE_FOOTBALL_SUPABASE_ANON_KEY

hartico-tennis
VITE_TENNIS_SUPABASE_URL
VITE_TENNIS_SUPABASE_ANON_KEY
```

No configurar `service_role`, secret key, contraseña PostgreSQL ni JWT secret.
El schema no es una variable: está fijado por producto en el cliente.

## Verificación posterior a una futura migración

- Ejecutar los siete tests SQL raíz, incluido `007_product_isolation.sql`.
- Confirmar lectura pública de contenido publicado en los tres schemas.
- Confirmar que un usuario autenticado normal no escribe en ninguno.
- Confirmar que cada admin escribe solo en su producto.
- Revisar `racing.audit_events`, `football.audit_events` y
  `tennis.audit_events`; no mezclar ni permitir escritura directa.
- Ejecutar smoke tests de las tres apps antes de configurar dominios.

## GitHub y Vercel

El repositorio remoto será único: `hartico-sports`. No hacer push sin
autorización. Importarlo tres veces en Vercel, habilitar acceso a fuentes fuera
del Root Directory para los workspaces y no configurar todavía los dominios
`racing.hfa.bar`, `football.hfa.bar` y `tennis.hfa.bar`.
