# SETUP IA — Reconstrucción del proyecto desde cero

Este paquete contiene **toda la lógica y especificación** necesaria para que una IA (o un equipo) reconstruya **Kaibil Football — League Manager** de cero, sin ver el código fuente original.

## Cómo usar esta carpeta

Dale a la IA **esta carpeta completa** (todos los `.md` + `reference/schema.prisma`) y pídele:

1. Leer `01-arquitectura-y-setup.md` para entender stack, estructura y puesta en marcha.
2. Leer `02-modelo-de-datos.md` + `reference/schema.prisma` para crear la base de datos.
3. Leer `03-logica-de-negocio.md` para implementar el motor de torneo (jornadas, liguilla, tabla, stats).
4. Leer `04-api-endpoints.md` y `05-flujos-y-seguridad.md` para construir la API REST y el auth.
5. Leer `06-frontend-logica.md` para el frontend (rutas, estado, validaciones, props de componentes).
6. Leer `07-seed-datos.md` para generar datos de prueba deterministas.

## Reglas importantes para la IA

- **NO se incluye el diseño (CSS/SCSS).** La IA debe **crear su propio sistema de diseño** (colores, tipografía, espaciado, componentes visuales). Aquí solo está la **lógica** y las **props** de cada componente, para que el diseño sea libre.
- Todo lo que está en este paquete es **especificación**; donde se dice "EXACTO" hay que replicarlo al pie de la letra (algoritmos, constraints, códigos de error, fórmulas de fechas).

## Índice de archivos

| Archivo | Contenido |
|---------|-----------|
| `01-arquitectura-y-setup.md` | Stack, estructura, instalación, variables de entorno, scripts |
| `02-modelo-de-datos.md` | Enums, modelos y convenciones (Prisma) |
| `03-logica-de-negocio.md` | **Motor de torneo**: round-robin, liguilla, fechas, tabla, stats, reglas de dominio |
| `04-api-endpoints.md` | Inventario completo de endpoints + envelope + códigos de error |
| `05-flujos-y-seguridad.md` | Auth, refresh tokens, invitaciones, middlewares |
| `06-frontend-logica.md` | Rutas, cliente HTTP, validaciones, hooks, props de componentes |
| `07-seed-datos.md` | Especificación del seed determinista |
| `reference/schema.prisma` | **Esquema Prisma completo** (copia exacta del original) |

> Resumen ejecutivo del producto: plataforma para administrar ligas de fútbol amateur — registro de usuarios (jugadores, árbitros, DT, asistentes), ligas con múltiples formatos (1v1 … 11v11) y modalidades de campeón (tabla o liguilla), equipos, plantillas, calendario de jornadas, captura de marcadores/eventos, tabla de posiciones, estadísticas, llave de liguilla y premios.
