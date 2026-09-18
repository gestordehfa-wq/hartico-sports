# AGENTS.md

Estas instrucciones aplican a todo el repositorio.

## Propósito y límites

- Hartico Sports crea productos deportivos independientes; no convertirlo en un
  monolito multideporte.
- HFA es un repositorio externo y estable. Tratar `C:\hfa` como solo lectura y
  no copiar código, SQL, secretos, assets ni branding sin una decisión explícita.
- No conectar, desplegar ni modificar Supabase/Vercel remoto salvo petición
  expresa y revisión del entorno objetivo.
- No hacer push automáticamente.

## Dependencias

- `apps/*` puede importar desde `packages/*`.
- `packages/*` nunca importa desde `apps/*`.
- Una app nunca importa desde otra app.
- Ningún paquete común contiene entidades o reglas de Racing, Football o Tennis.
- Antes de extraer una abstracción, demostrar dos consumidores con la misma
  semántica o documentar por qué es inequívocamente transversal.

## Datos y seguridad

- Cada app posee su carpeta `supabase/`, migraciones y tests SQL.
- Toda tabla expuesta habilita RLS en su migración de creación.
- Autorización en servidor; esconder UI no es control de acceso.
- No usar `service_role` ni secretos en variables `VITE_*`.
- Funciones privilegiadas validan actor, fijan `search_path`, limitan grants y
  auditan operaciones sensibles.
- No editar migraciones aplicadas; crear una nueva migración.
- No inventar una entidad universal de evento/partido/participante deportivo.

## Código

- TypeScript estricto; evitar `any` y casts para silenciar contratos.
- Reglas deportivas puras, separadas de React y Supabase.
- Componentes accesibles: HTML semántico, teclado, focus y labels.
- Estado remoto detrás de repositorios/hooks de feature, no llamadas Supabase
  dispersas en componentes.
- Añadir dependencias solo si reducen complejidad demostrable.

## Validación

Antes de entregar cambios de código:

```bash
npm run typecheck
npm run build
```

Cuando existan tests del área modificada, ejecutarlos también. Los cambios RLS
requieren tests positivos, negativos y de aislamiento cruzado.

## Git

- Commits locales pequeños con mensajes convencionales y alcance coherente.
- No reescribir ni descartar trabajo ajeno.
- Mantener fuera de Git `.env*`, excepto plantillas `.env.example` sin secretos.
