# Límites de dominio

Este documento enumera capacidad y lenguaje, no propone todavía todas las tablas.
Los identificadores entre dominios no son intercambiables aunque ambos sean UUID.

## Sports core

Capacidades compartibles, siempre opcionales y sin regla deportiva:

- identidad, sesión, perfil y pertenencia;
- roles/capacidades y guards;
- configuración y branding del producto;
- primitives de temporada/calendario cuando el dominio las adopte;
- archivos/media;
- auditoría y trazabilidad;
- UI, formatos, validación y errores;
- infraestructura de PostgreSQL/Supabase.

No contiene `match`, `participant`, `result`, `standing` ni `award` universales.
Awards puede compartir UI o auditoría, pero cada dominio define elegibilidad,
destinatario y cálculo.

## Racing

Agregados conceptuales:

- temporada y reglamento de puntos versionado;
- piloto y escudería con participación histórica;
- circuito y edición de Gran Premio;
- clasificación concreta con exactamente dos intentos por piloto y mejor tiempo derivado;
- parrilla derivada de los mejores tiempos;
- carrera corta de 4 a 8 vueltas y una parada obligatoria por piloto;
- resultado clasificado con estados propios;
- vueltas, vuelta rápida y penalización;
- standings de pilotos y constructores como proyección reproducible;
- récord, museo, palmarés y awards.

Estados de resultado como DNS, DNF y DSQ pertenecen a Racing. La posición de
clasificación, posición de salida y resultado final son conceptos distintos.
Racing no modela prácticas, sprint, Q1/Q2/Q3 ni una abstracción universal de
sesiones: el flujo canónico es Gran Premio → clasificación → carrera.

## Football Lite

Agregados conceptuales:

- asociación/tenant y su branding;
- temporada y competición;
- equipo, jugador y membresía de plantilla efectiva por fechas/temporada;
- partido de fútbol y resultado;
- incidencias de gol, asistencia y tarjeta;
- tabla/clasificación como proyección por reglas de competición;
- estadísticas, historial y awards.

Se excluyen inicialmente HFA Club, cartas, monedas, apuestas/predicciones, Biblia,
rating/value engines y CMS complejo.

## Tennis

Agregados conceptuales:

- temporada y jugador;
- torneo, edición, categoría y superficie;
- cuadro, entrada, seed, ronda y slot;
- partido de tenis con formato versionado;
- sets y resultado, incluyendo retiro/walkover cuando se modele;
- ranking y puntos con reglas/versiones;
- estadísticas y head-to-head derivados;
- récords, historial, palmarés y awards.

Un set no es un periodo genérico y un cuadro no es una llave de fútbol.

## Integración entre capas

Para tarjetas públicas o búsqueda global, cada app puede producir un read model
local como `{ id, title, subtitle, occurredAt, status }`. Ese DTO de presentación
no se convierte en autoridad persistente ni fuerza relaciones entre dominios.

## Preguntas pospuestas conscientemente

- reglamentos exactos y retroactividad de puntos de Racing;
- formatos de competición y desempates de Football Lite;
- formatos de sets, dobles y fuentes de ranking de Tennis;
- taxonomía transversal definitiva de awards;
- SSO e identidad de una persona que participa en varios productos.

Resolver estas preguntas antes del primer caso real produciría abstracciones
especulativas.
