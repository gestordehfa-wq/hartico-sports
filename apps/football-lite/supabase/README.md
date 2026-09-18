# SQL de Football Lite

Esta carpeta contiene las fuentes de migración y tests propiedad de Football
Lite. Todos los objetos deportivos viven en `football`; Auth permanece en
`auth`.

No enlazar ni publicar esta carpeta de forma independiente. Después de cambiar
una fuente, registrar una migración nueva cuando corresponda y ejecutar desde
la raíz:

```powershell
npm run supabase:assemble
npm run supabase:check
```

Solo `supabase/` en la raíz representa el historial remoto de `hartico-sports`.
