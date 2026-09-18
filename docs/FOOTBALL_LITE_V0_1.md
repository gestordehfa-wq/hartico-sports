# Football Lite v0.1

Estado: implementación local completa; conexión a Supabase Cloud pendiente de
un proyecto objetivo aprobado.

## Producto

Football Lite es una aplicación independiente de gestión de fútbol. Cubre el
flujo temporada → competición → plantilla → partido → resultado/eventos →
clasificación/estadísticas, con lectura pública y administración protegida. No
es una migración ni una versión reducida del código de HFA.

La referencia `C:\hfa` se inspeccionó solo en lectura para reconocer su lenguaje
Classic Windows Enterprise. No se copiaron código, SQL, secretos, assets ni
branding y HFA no fue modificado.

## Alcance v0.1

- temporadas con una sola activa;
- ligas, copas y supercopas simples;
- equipos, jugadores y plantillas efectivas por fechas;
- partidos, resultados, apariciones y eventos básicos;
- clasificación 3-1-0 calculada desde partidos finalizados;
- estadísticas básicas de jugadores y equipos;
- awards manuales e historial de temporadas;
- rutas públicas y consola CRUD;
- Supabase Auth, RLS por rol y auditoría before/after;
- configuración white-label centralizada.

Quedan explícitamente fuera HFA Club, cartas, packs, créditos, apuestas,
predicciones, CMS, social, árbitros complejos, transferencias avanzadas, ratings,
OVR, TOTW/TOTY y coleccionables.

## Ejecución sin backend

```powershell
npm install
npm run dev:football-lite
```

Sin variables de Supabase, la aplicación abre en modo sin conexión, conserva
todas las rutas públicas y muestra estados vacíos honestos. No usa datos falsos
hardcodeados. El CRUD se presenta como preparado y se habilita al conectar el
backend.

## Conexión Cloud

1. Seleccionar el único proyecto Supabase `hartico-sports`; nunca HFA.
2. Exponer `football` en Data API junto con `racing` y `tennis`.
3. Aplicar únicamente el historial raíz `supabase/migrations` mediante el flujo
   único documentado; nunca migrar esta app por separado.
4. Crear el usuario en el Auth compartido.
5. Insertar su UUID en `football.role_memberships` mediante una operación administrativa
   controlada; el cliente no puede crear membresías.
6. Copiar `.env.example` a `.env.local` y completar la URL/key compartida.
7. Configurar las variables de marca del holo.

No se almacena `service_role` en el frontend. Ninguna variable `VITE_*` contiene
secretos.

## Seguridad

Anon lee únicamente temporadas/competiciones publicadas y sus datos deportivos.
Authenticated puede leer, pero no escribir. Solo una cuenta authenticated con
`role_memberships.role = 'admin'` pasa las políticas de mutación. La UI comprueba
el rol para orientar la navegación y RLS lo vuelve a comprobar en cada escritura.

El cliente no tiene política de insert/update/delete sobre membresías ni
auditoría, por lo que no puede autopromoverse ni falsificar historial. Los
triggers registran actor, entidad, id, operación, before, after y timestamp.

## Proyecciones

El frontend contiene reglas puras testeadas para operar con el snapshot. La base
incluye vistas equivalentes `league_standings`, `player_statistics` y
`team_statistics`. Ninguna tabla de clasificación se edita manualmente.

Las apariciones son una relación mínima separada porque “partidos jugados” no se
puede inferir de goles o tarjetas. No representa táctica, rating ni rendimiento
avanzado.

## Validación

Los gates del monorepo son `npm run typecheck`, `npm run lint`, `npm run test` y
`npm run build`. Los tests SQL quedan preparados para un entorno Supabase/pgTAP;
no se exige Docker o PostgreSQL local para cerrar el frontend.

## Próxima fase

La siguiente fase recomendada es **Tennis v0.1**, comenzando por su glosario y
reglas propias. Racing v0.2 permanece pospuesta.
