# Estrategia Supabase

## Decisión: aislamiento por producto, con multitenancy acotado

Se recomienda una combinación razonable de las opciones A y C:

- un proyecto Supabase independiente por aplicación **y por entorno**;
- ninguna tabla deportiva compartida entre Racing, Football Lite y Tennis;
- Football Lite puede alojar varias asociaciones en su propio proyecto cuando
  exista aislamiento RLS completo por `association_id`;
- asociaciones con requisitos especiales pueden desplegar la misma app en un
  proyecto dedicado.

Ejemplo futuro:

```text
Racing:       racing-dev / racing-staging / racing-prod
Football:     football-dev / football-staging / football-prod
Tennis:       tennis-dev / tennis-staging / tennis-prod
Enterprise:   football-cliente-x-prod (opcional)
```

Esta decisión evita que una migración, política incorrecta, agotamiento de cuota
o incidente de Racing afecte Football Lite o Tennis. También permite backups,
restores, regiones y releases independientes.

## Por qué no un solo Supabase

Un proyecto compartido abarata el arranque, pero crea:

- un radio de impacto común;
- roles, políticas y migraciones coordinadas entre dominios no relacionados;
- backups/restores indivisibles por producto;
- riesgo de referencias accidentales entre esquemas;
- límites de recursos y ventanas de mantenimiento compartidos;
- una futura separación más cara cuando ya existan datos.

Los pocos beneficios de SSO y panel único no compensan ese acoplamiento en esta
fase. Si más adelante se necesita identidad común, se diseñará como servicio de
identidad explícito; no se usará una base deportiva común como atajo.

## Seguridad base

1. RLS habilitado desde la migración que crea cada tabla expuesta.
2. Deny-by-default: sin política no hay acceso.
3. Vistas públicas separan campos públicos de PII y metadatos operativos.
4. JWT identifica al usuario; pertenencia, rol y asociación se resuelven en
   tablas protegidas o claims administrados por servidor.
5. El frontend no recibe `service_role` ni secretos.
6. Mutaciones multiobjeto o sensibles usan RPC/Edge Functions estrechas.
7. Toda función privilegiada valida actor, fija `search_path` y registra auditoría.
8. Storage usa buckets y paths por producto/tenant, con MIME y tamaño validados.
9. Las pruebas de RLS incluyen intentos cruzados entre asociaciones.

## Modelo común mínimo por proyecto

El concepto común puede incluir, reimplementado en cada proyecto mediante sus
propias migraciones:

- `profiles`: extensión mínima de `auth.users`, sin PII pública;
- `roles`/`memberships` o capacidades equivalentes según el producto;
- `audit_events`: registro append-only de acciones privilegiadas;
- `app_settings`: configuración operativa no secreta;
- buckets y políticas de assets.

No se crea un esquema SQL común remoto. Una migración ya liberada debe seguir
siendo autocontenida aunque se origine desde una plantilla revisada.

## Football Lite white-label

Todas las filas tenant-scoped llevan `association_id NOT NULL`, incluido el
camino completo hasta eventos y estadísticas. No se acepta aislamiento solo en
la tabla padre. Índices y constraints incluyen el tenant cuando sea necesario
para impedir referencias cruzadas.

Las políticas comparan contra una membresía confiable del usuario. Para datos
públicos, una vista o RPC recibe un slug público y devuelve exclusivamente
campos publicados. Las pruebas mínimas crean asociación A y B y demuestran que
admin A no puede leer, escribir ni inferir objetos privados de B.

## Backups y operación

- Política de backup y prueba de restore por proyecto/entorno.
- Migraciones pasan primero por base local y staging.
- Producción no recibe `db push` improvisado: se revisa el plan y se conserva la
  migración exacta aplicada.
- Cambios destructivos usan patrón expand/migrate/contract y backups verificados.
- Un ledger o la historia de migraciones del CLI identifica el estado real.

## Lo que no se hace en esta fase

- crear o vincular proyectos remotos;
- copiar SQL de HFA;
- definir todavía el esquema exhaustivo de los tres deportes;
- configurar Auth providers, dominios, Storage o secretos de producción;
- prometer SSO entre aplicaciones.
