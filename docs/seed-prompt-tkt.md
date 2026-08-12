# Seed prompt — Canchas las TKT (caso real)

> **Uso**: este documento es la especificación completa del seed para
> poblar la base de datos de Kaibil Football con el caso real
> **Canchas las TKT** (4 canchas de fut7 sintéticas, 15 ligas
> simultáneas, 6 árbitros de planta). Úsalo como prompt para que un
> LLM genere `backend/prisma/seed.ts`, o como spec para escribirlo
> tú mismo.

---

## 1. Contexto del negocio

**Canchas las TKT** es un complejo de fútbol amateur en México con 4 canchas de fut7 sintéticas. El dueño administra **~15 ligas simultáneas** (cada una con 16 equipos) más todos los servicios alrededor: árbitros, anotadores, mantenimiento.

**Horarios de operación** (todos los partidos son en las 4 canchas):

| Día | Bloques | Ligas | Equipos por liga | Partidos/día por liga |
|---|---|---|--:|--:|
| Lunes | 7–8pm, 9–10pm | 2 | 16 | 8 (4 canchas × 2 slots) |
| Martes | 7–8pm, 9–10pm | 2 | 16 | 8 |
| Miércoles | 7–8pm, 9–10pm | 2 | 16 | 8 |
| Jueves | 7–8pm, 9–10pm | 2 | 16 | 8 |
| Viernes | 6–7pm, 7–8pm, 8–9pm, 9–10pm, 10–11pm | 3 | 16 | 8 |
| Sábado | 8am–12pm, 6–7pm, 7–8pm, 8–9pm, 9–10pm | 3 | 16 | 8 (4 canchas × 2 slots por bloque) |
| Domingo | 8am–12pm | 1–2 | 16 | 8 |

**Total ligas simultáneas**: 15 (2+2+2+2+3+3+1). En Sábado o Domingo de alto tráfico, puede haber hasta 4 ligas en paralelo.

**El round-robin por liga**:
- 16 equipos → 120 partidos únicos (ida) o 240 (ida y vuelta).
- A 8 partidos por día (4 canchas × 2 slots), la temporada dura **15 días** en una sola vuelta, **30 días** en ida y vuelta.
- Cada jornada semanal de 8 partidos cubre 1/15 de la primera vuelta.

**Reglas operativas del dueño**:
- Los equipos **rotaban canchas, horarios y rivales** cada jornada (no hay cancha local asignada por partido).
- Los 6 árbitros son **de planta** (asalariados), no freelancers. Cubren TODOS los partidos. Algunos árbitros tienen asignaciones fijas (siempre la misma cancha) y otros rotan.
- Las ligas se reactivan cada 3–4 meses (nueva temporada). La actual va por la jornada 4.
- El sistema es **multi-day por liga**: una liga SOLO juega un día específico de la semana. (Esto es importante: no hay ligas que crucen días.)
- **Mix de formatos**: el dueño alterna entre **ida** (15 jornadas, partidos únicos) y **ida y vuelta** (30 jornadas, home/away doble). Las ligas más competitivas y de adultos van a doble vuelta; las juveniles y recreativas van a una sola vuelta. Detalle abajo.
- **Liguilla al final**: TODAS las ligas terminan con un playoff/liguilla de los **8 mejores equipos**, con esta estructura:
  - **Cuartos de final** (4 partidos): 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
  - **Semifinales** (2 partidos): ganadores de QF
  - **Final** (1 partido): ganadores de SF
  - **Tercer lugar** (1 partido): perdedores de SF
  - Total: 8 partidos de playoff por liga, todos `SCHEDULED` (la temporada actual aún no llega a esa fase).

---

## 2. Volumen objetivo

| Entidad | Volumen | Notas |
|---|--:|---|
| **Dueño (admin)** | 1 | "Canchas las TKT", contacto +52 55 0000 0001 |
| **Canchas (fields)** | 4 | Todas sintéticas, 7v7, 60×40m, capacidad 14 jugadores |
| **Árbitros (referees)** | 6 | De planta; cubren todos los partidos |
| **Directores técnicos (DTs)** | 15 | 1 por equipo en cada liga (un DT puede serlo en varias ligas) |
| **Auxiliares** | 30 | 2 por equipo en promedio (1 con DT + 1 de apoyo) |
| **Jugadores (PLAYER)** | ~3360 | 14 por equipo × 16 equipos × 15 ligas |
| **Total usuarios** | **~3412** | |
| **Ligas (leagues)** | 15 | 2 por Lun-Jue, 3 Vie, 3 Sáb, 1-2 Dom |
| **Equipos (teams)** | 240 | 16 por liga × 15 ligas |
| **Membresías** | ~3600 | 1 DT + 2 aux + 14 jugadores por equipo |
| **Matchdays** | 4 por liga | La actual va por la 4ª jornada |
| **Partidos RR** | ~480 | 4 jornadas × 8 partidos × 15 ligas (ida y vuelta tienen el mismo número de partidos hasta jornada 4) |
| **Partidos liguilla** | **120** | 8 por liga × 15 ligas (todos `SCHEDULED` aún, agendados para después del round-robin) |
| **Partidos totales** | **~600** | RR + liguilla |
| **Eventos (goals, cards, MVP)** | ~1500 | ~3 por partido COMPLETED |
| **Awards** | 4 | 1 por liga finalizada (la temporada anterior: 4 ligas) |

---

## 3. Estructura organizacional

```
ADMIN ("Canchas las TKT")
├── 4 Fields (Cancha 1, 2, 3, 4)
└── 15 Leagues
    ├── L-Lun-Libre (Libre Varonil, lunes 9-10pm)
    │   ├── 16 Teams
    │   │   ├── 1 DT
    │   │   ├── 2 Auxiliares
    │   │   └── 14 Jugadores
    │   ├── ~10 Matchdays (la actual va por la 4ª)
    │   └── ...
    ├── L-Lun-Sub17 (Varonil Sub 16-17, lunes 7-8pm)
    ├── L-Mar-Libre (Libre Varonil, martes 9-10pm)
    ├── L-Mar-Sub15 (Varonil Sub 14-15, martes 7-8pm)
    ├── L-Mie-Veteranos (Veteranos +35, miércoles 9-10pm)
    ├── L-Mie-Femenil (Libre Femenil, miércoles 7-8pm)
    ├── L-Jue-Libre (Libre Varonil, jueves 9-10pm)
    ├── L-Jue-Sub20 (Varonil Sub 18-20, jueves 7-8pm)
    ├── L-Vie-Libre (Libre Varonil, viernes 9-10pm)
    ├── L-Vie-Sub17 (Varonil Sub 16-17, viernes 7-8pm)
    ├── L-Vie-Femenil (Libre Femenil, viernes 6-11pm)
    ├── L-Sab-Amateur (Libre Mixto Amateur, sábado 8am-12pm)
    ├── L-Sab-Sub13 (Sub 12-13, sábado 6-7pm)
    ├── L-Sab-Libre (Libre Varonil, sábado 8-10pm)
    └── L-Dom-Libre (Libre Varonil, domingo 8am-12pm)
```

---

## 4. Canchas (fields)

Las 4 canchas son idénticas (sintéticas 7v7). Comparten una "dirección" común del complejo y un "nombre" distinto.

```ts
// Prisma create input
[
  {
    name: "Cancha 1",
    address: "Canchas las TKT, Av. Principal 100, CDMX",
    description: "Cancha sintética 60×40m, 7v7",
    capacity: 14,  // 7 por equipo + 7 banca
  },
  { name: "Cancha 2", address: "Canchas las TKT, Av. Principal 100, CDMX", capacity: 14 },
  { name: "Cancha 3", address: "Canchas las TKT, Av. Principal 100, CDMX", capacity: 14 },
  { name: "Cancha 4", address: "Canchas las TKT, Av. Principal 100, CDMX", capacity: 14 },
]
```

---

## 5. Usuarios (roles y distribución)

### 5.1 Distribución por rol

| Rol | Cuenta | Notas |
|---|--:|---|
| ADMIN | 1 | El dueño (José "Pepe" Ramírez) |
| REFEREE | 6 | De planta, cubren todo |
| TECHNICAL_DIRECTOR | 15 | 1 por equipo, pero 1 DT puede serlo en 2+ ligas |
| ASSISTANT | 30 | 1-2 por equipo |
| PLAYER | ~3360 | La mayoría |

### 5.2 Nombres (mexicanos plausibles)

**Inventario de 200 primeros nombres** (top del censo INEGI):

```ts
const FIRST_NAMES = [
  // Top 100 masculinos
  'José', 'Juan', 'Luis', 'Carlos', 'Miguel', 'Antonio', 'Francisco', 'Alejandro',
  'Manuel', 'Pedro', 'Ángel', 'Jesús', 'Roberto', 'Daniel', 'David', 'Javier',
  'Diego', 'Fernando', 'Ricardo', 'Eduardo', 'Rafael', 'Sergio', 'Héctor', 'Miguel Ángel',
  'José Luis', 'Juan Carlos', 'Carlos Alberto', 'Jorge', 'Andrés', 'Santiago', 'Sebastián',
  'Maximiliano', 'Joaquín', 'Iván', 'Camilo', 'Tomás', 'Lucas', 'Emiliano', 'Bruno',
  'Mateo', 'Gael', 'Dylan', 'Iker', 'Matías', 'Giovanni', 'Esteban', 'Bruno',
  'Rodrigo', 'César', 'Adrián', 'Mario', 'Pablo', 'Alan', 'Kevin', 'Bryan',
  'Brandon', 'Leonardo', 'Mauricio', 'Hugo', 'Gustavo', 'Enrique', 'Arturo', 'Alfonso',
  'Salvador', 'Octavio', 'Rodrigo', 'Ramiro', 'Gerardo', 'Elías', 'Jaime', 'Israel',
  'Abraham', 'Isaac', 'Samuel', 'Aarón', 'Josué', 'Neftalí', 'Isaí', 'Omar',
  'Rubén', 'Aarón', 'Saúl', 'Efraín', 'Ezequiel', 'Daniel', 'Caleb', 'Joaquín',
  // Top 100 femeninos
  'María', 'Guadalupe', 'Margarita', 'Verónica', 'Patricia', 'Lucía', 'Rosa', 'Martha',
  'Laura', 'Ana', 'Silvia', 'Gabriela', 'Elizabeth', 'Mónica', 'Daniela', 'Adriana',
  'Carolina', 'Fernanda', 'Sofía', 'Isabella', 'Camila', 'Valentina', 'Ximena', 'Andrea',
  'Paola', 'Mariana', 'Alejandra', 'Lourdes', 'Cristina', 'Teresa', 'Lucía', 'Victoria',
  'Sara', 'Itzel', 'Renata', 'Romina', 'Constanza', 'Antonella', 'Fátima', 'Zoe',
  'Ana Paula', 'María José', 'Regina', 'Dulce', 'Esperanza', 'Ariadna', 'Bárbara', 'Estefanía',
  'Marisol', 'Yolanda', 'Lorena', 'Araceli', 'Concepción', 'Mireya', 'Leticia', 'Aurora',
  'Estela', 'Irma', 'Alicia', 'Eva', 'Elena', 'Cristina', 'Diana', 'Marisol',
  'Marlene', 'Gloria', 'Rosario', 'Consuelo', 'Pilar', 'Mercedes', 'Amalia', 'Raquel',
  'Juana', 'Petra', 'Felisa', 'Sara', 'Tomasa', 'Eloísa', 'Águeda', 'Brígida',
];
```

**Inventario de 100 primeros apellidos**:

```ts
const LAST_NAMES = [
  'García', 'Rodríguez', 'González', 'Hernández', 'López', 'Martínez', 'Sánchez', 'Pérez',
  'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Díaz', 'Moreno', 'Romero', 'Alonso',
  'Navarro', 'Torres', 'Domínguez', 'Vázquez', 'Ramos', 'Gil', 'Molina', 'Serrano',
  'Blanco', 'Suárez', 'Castro', 'Ortega', 'Delgado', 'Marín', 'Rubio', 'Núñez',
  'Medina', 'Castillo', 'Sánchez', 'Carmona', 'Crespo', 'Santos', 'Vázquez', 'Reyes',
  'Calvo', 'Pérez', 'Gallego', 'Márquez', 'Vidal', 'León', 'Mora', 'Bravo',
  'Gallardo', 'Cano', 'Carmona', 'Nieto', 'Vargas', 'Cruz', 'Leal', 'Caballero',
  'Carrillo', 'Méndez', 'Campos', 'Vela', 'Calderón', 'Fuentes', 'Aguilar', 'Pardo',
  'Soler', 'Reyes', 'Acosta', 'Galván', 'Pacheco', 'Esteban', 'Arias', 'Mora',
  'Pereira', 'Bernal', 'Nieves', 'Aragón', 'Cárdenas', 'Villar', 'Esquivel', 'Garrido',
  'Robles', 'Santamaría', 'Palacios', 'Bermúdez', 'Salgado', 'Quiñones', 'Baeza', 'Casas',
];
```

### 5.3 Distribución de género por liga

| Liga | Categoría | Distribución |
|---|---|---|
| L-*-Libre, L-*-Sub* (varonil) | Varonil | 100% hombres |
| L-*-Femenil, L-*-Veteranos (mixto) | Mixto | 60% hombres / 40% mujeres |
| L-Sab-Amateur | Mixto | 50% hombres / 50% mujeres |
| L-*-Sub13/15 (juveniles) | Varonil | 100% hombres |

### 5.4 CURP y email

- **CURP**: generada procedurálmente como `KBL{6dígitos}{2letras}970101` (formato simplificado, suficiente para demo).
- **Email**: `{nombre}.{apellido}.{rol_corto}@tkt.local` (ej. `jose.ramirez.admin@tkt.local`).

### 5.5 Contraseñas

Todas iguales a `tkt2025` (hasheada con bcrypt en el seed). El admin puede cambiarlas después.

---

## 6. Equipos (teams)

### 6.1 Naming

**240 equipos** distribuidos en 15 ligas de 16. Nombres variados pero temáticamente consistentes:

- **Ligas varoniles**: animales + colores (Linces FC, Cóndores Rojos, Halcones Negros, Pumas de la UNAM, Tiburones del Sur, Lobos del Pedregal, Águilas Plateadas, Panteras Negras, Toros de Neza, Tigres del Ajusco, Leones de Iztapalapa, Gladiadores del Sur, Volcanes del Ajusco, Espartanos del Centro, Centinelas del Norte, Relámpagos Azules, Dragones FC).
- **Ligas femeniles / mixtas**: colores + barrios + flores (Rosa del Sur, Girasoles del Centro, Azules de Coyoacán, Blancas del Pedregal, Camelias del Valle, Lirios del Ajusco, Hortensias FC, Dalias del Sur, Orquídeas de Polanco, Jazmines del Centro, Margaritas del Norte, Violetas del Ajusco, Tulipanes de Tlalpan, Hortensias Blancas, Begonias del Valle, Camelias del Centro).
- **Ligas juveniles / sub-15/17**: nombres épicos (Fenrirs Sub17, Titanes Sub15, Centinelas Sub17, Espartanos Sub17, Gladiadores Sub15, Relámpagos Sub15, Volcanes Sub17, Dragones Sub15, Pumas Sub17, Águilas Sub15, Lobos Sub17, Halcones Sub15, Cóndores Sub17, Panteras Sub15, Leones Sub17, Tigres Sub15).

**16 nombres por liga × 15 ligas = 240 nombres únicos** (no se repiten entre ligas, pero pueden entre categorías).

### 6.2 Colores y emoji

- **primaryColor / secondaryColor**: rotar entre paletas (`#FFE600`/`#0A0A0A`, `#FF3D5A`/`#FFFFFF`, `#00D9FF`/`#0A0A0A`, `#FF2E93`/`#FFFFFF`, `#C6FF3D`/`#0A0A0A`, etc.).
- **emoji**: animales 🦅🦈🐆🐺🦁, naturaleza 🌋⚡🌌, símbolos 🛡⚔🟢, fútbol ⚽🏆.

### 6.3 Jugadores por equipo

Para 7v7, **14 jugadores por equipo** (7 titulares + 7 banca):

| Dorsal | Posición | Notas |
|--:|---|---|
| 1 | GK | Portero titular |
| 2 | DEF | Defensa |
| 3 | DEF | Defensa |
| 4 | DEF | Lateral |
| 5 | MID | Medio |
| 6 | MID | Medio |
| 7 | MID | Volante |
| 8 | FWD | Delantero |
| 9 | FWD | Centro-delantero (9 fijo) |
| 10 | MID | 10 clásico |
| 11 | FWD | Extremo |
| 12 | GK | Portero suplente |
| 13 | MID | Suplente |
| 14 | FWD | Suplente |

El dorsal **#1** siempre es GK titular. Los dorsales 12-14 son banca. El **capitán** es el dorsal #10 (10 clásico) por convención.

### 6.4 Dorsales únicos por equipo

No se repiten dorsales dentro del mismo equipo. El seed debe validar esto (un dorsale solo aparece una vez en `TeamMembership` por equipo).

---

## 7. DT y Auxiliares

Cada equipo tiene:

- **1 Director Técnico** (`membershipRole: 'DT'`, sin dorsal, sin posición).
- **1-2 Auxiliares** (`membershipRole: 'ASSISTANT'`).

**Importante**: el mismo User puede ser DT de varios equipos en la misma liga o en ligas distintas. Ej. el DT de "Linces FC" en L-Lun-Libre también puede ser DT de "Linces FC" en L-Jue-Libre (mismo equipo, distinta liga).

El seed debe permitir **compartir staff entre equipos** (un User con 2-3 membresías DT en equipos distintos).

---

## 8. Ligas (15 en total)

### 8.1 Catálogo completo

`I/V` = `I` (ida, 15 jornadas) o `V` (ida y vuelta, 30 jornadas, el doble partido con home/away invertido).

| ID | Nombre legible | Categoría | Día | Hora | Formato | Tipo | Ida/Vta | maxTeams | Estado |
|---|---|---|---|---|---|---|:--:|--:|--:|
| L-Lun-Libre | TKT — Lunes Libre Varonil | LIBRE | MONDAY | 21:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Lun-Sub17 | TKT — Lunes Sub-17 Varonil | SUB_17 | MONDAY | 19:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Mar-Libre | TKT — Martes Libre Varonil | LIBRE | TUESDAY | 21:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Mar-Sub15 | TKT — Martes Sub-15 Varonil | SUB_15 | TUESDAY | 19:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Mie-Veteranos | TKT — Miércoles Veteranos +35 | VETERANOS | WEDNESDAY | 21:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Mie-Femenil | TKT — Miércoles Femenil | FEMENIL | WEDNESDAY | 19:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Jue-Libre | TKT — Jueves Libre Varonil | LIBRE | THURSDAY | 21:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Jue-Sub20 | TKT — Jueves Sub-20 Varonil | SUB_20 | THURSDAY | 19:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Vie-Libre | TKT — Viernes Libre Varonil | LIBRE | FRIDAY | 21:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Vie-Sub17 | TKT — Viernes Sub-17 Varonil | SUB_17 | FRIDAY | 19:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Vie-Femenil | TKT — Viernes Femenil | FEMENIL | FRIDAY | 18:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Sab-Amateur | TKT — Sábado Amateur Mixto | MIXTO_AMATEUR | SATURDAY | 10:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Sab-Sub13 | TKT — Sábado Sub-13 Varonil | SUB_13 | SATURDAY | 18:00 | 7V7 | ROUND_ROBIN | I | 16 | IN_PROGRESS (jor 4/15) |
| L-Sab-Libre | TKT — Sábado Libre Varonil | LIBRE | SATURDAY | 20:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |
| L-Dom-Libre | TKT — Domingo Libre Varonil | LIBRE | SUNDAY | 10:00 | 7V7 | ROUND_ROBIN | V | 16 | IN_PROGRESS (jor 4/30) |

**Resumen**: **8 ligas con doble vuelta** (L-Lun-Libre, L-Mie-Femenil, L-Jue-Libre, L-Vie-Libre, L-Vie-Femenil, L-Sab-Amateur, L-Sab-Libre, L-Dom-Libre) y **7 ligas con ida** (las juveniles + Martes Libre + Veteranos + Jueves Sub-20).

### 8.2 Estado de las ligas

**15 ligas en curso** (la temporada actual va por la jornada 4). Todas con `status = 'IN_PROGRESS'`. La temporada pasada (hace 4 meses) tiene 4 ligas finalizadas con sus awards.

### 8.3 Fechas

- `startDate`: 4 semanas antes de hoy (la temporada arrancó un lunes).
- `endDate`: estimada a 11 semanas (temporada completa de 15 jornadas + liguilla) o 22 semanas (30 jornadas + liguilla). En la práctica, las ligas de doble vuelta extienden la temporada a 4 meses.
- `matchdaysCount`:
  - **Ida** → 15
  - **Ida y vuelta** → 30
- `homeAndAway`: `true` para doble vuelta, `false` para ida simple.
- **Después de la última jornada de round-robin**, hay un break de 1 semana, luego arranca la liguilla (8 partidos por liga: 4 QF + 2 SF + 1 Final + 1 Tercer lugar).

### 8.2 Estado de las ligas

**15 ligas en curso** (la temporada actual va por la jornada 4 de 15). Todas con `status = 'IN_PROGRESS'`. La temporada pasada (hace 4 meses) tiene 4 ligas finalizadas con sus awards.

### 8.3 Fechas

- `startDate`: 4 semanas antes de hoy (la temporada arrancó un lunes).
- `endDate`: estimada a 11 semanas (temporada completa de 15 jornadas + finales).
- `matchdaysCount`: 15 (ida) o 30 (ida y vuelta). Para esta seed, solo **IDA** = 15 jornadas.
- `homeAndAway`: false (solo ida en esta temporada, el dueño prueba el sistema).

---

## 9. Fixture (algoritmo de generación)

### 9.1 Round-robin con Berger (ya implementado)

La función `bergerRoundRobin(teams)` en `frontend/src/utils/roundRobin.ts` produce N-1 jornadas de N/2 partidos. Para 16 equipos = 15 jornadas de 8 partidos.

```ts
import { bergerRoundRobin } from '../utils/roundRobin';

const pairings: Pair[][] = bergerRoundRobin(teamIds);
// pairings[0] = jornada 1: 8 partidos
// pairings[1] = jornada 2: 8 partidos
// ...
// pairings[14] = jornada 15
```

### 9.2 Distribución de fechas

| Jornada | Fecha (en la temporada actual) |
|--:|---|
| 1 | lunes 4 semanas atrás (la jornada del día L-Lun-Libre y L-Lun-Sub17) |
| 2 | +7 días |
| 3 | +14 días |
| 4 | +21 días (la actual, en curso) |
| 5–15 | +28 a +98 días (futuras) |

### 9.3 Rotación de canchas y árbitros

Para cada partido de cada jornada, asignar:

- **Cancha**: rotar entre las 4 canchas de manera pseudoaleatoria (seed determinista) para que ningún equipo juegue siempre en la misma cancha.
- **Hora**: 
  - L-Lun-Libre, L-Mar-Libre, L-Mie-Veteranos, L-Jue-Libre, L-Vie-Libre: 21:00–22:30
  - L-Lun-Sub17, L-Mar-Sub15, L-Mie-Femenil, L-Jue-Sub20, L-Vie-Sub17: 19:00–20:30
  - L-Vie-Femenil: 18:00–19:30
  - L-Sab-Amateur: 10:00–11:30
  - L-Sab-Sub13: 18:00–19:30
  - L-Sab-Libre: 20:00–21:30
  - L-Dom-Libre: 10:00–11:30
- **Árbitro**: 6 árbitros. 3 tienen asignaciones fijas a canchas 1, 2, 3 (un árbitro por cancha). Los otros 3 rotan. Algoritmo: para la cancha N, si N ≤ 3, asignar árbitro fijo N; si N == 4, elegir rotativo según el partido.

### 9.4 Estados de los partidos

| Jornada | Estado | % de partidos |
|---|---|---|
| 1, 2, 3 | COMPLETED | 100% (ya jugados) |
| 4 (actual) | mix: 50% COMPLETED (los partidos de las 21h de ayer), 50% SCHEDULED | 50/50 |
| 5, 6, 7 | SCHEDULED | 100% (futuros) |
| 8–15 | SCHEDULED | 100% |

**Total**: 4 jornadas × 8 partidos × 15 ligas = 480 partidos generados. ~3.5 completados, ~0.5 en juego, ~4 pendientes.

### 9.5 Generación de resultados para partidos completados

Para cada partido `COMPLETED`, generar un resultado con distribución realista:

```ts
// Distribución ponderada de marcadores (fútbol amateur 7v7)
const SCORE_DISTRIBUTION: Array<[number, number, number]> = [
  // [home, away, weight]
  [2, 0, 10],  // 2-0 gana local
  [2, 1, 18],  // 2-1 resultado más común
  [3, 1, 12],
  [3, 2, 8],
  [1, 1, 12],  // empate común
  [0, 0, 5],
  [2, 2, 7],
  [1, 0, 8],
  [1, 2, 8],   // visitante gana (sorpresa)
  [0, 2, 4],
  [4, 2, 4],
  [4, 3, 2],  // partidazo
];
```

Sumar weights, normalizar a 100, samplear. Para los **goles específicos** del equipo ganador, asignar a un jugador aleatorio del equipo (preferentemente FWD #8, #9 o MID #10).

---

## 10. Eventos de partidos (goals, assists, cards, MVP)

Para cada partido `COMPLETED` con score (h, a):

1. **Goles**: h + a eventos `GOAL`. Cada uno con `minute ∈ [5, 90]`, `teamId` y `playerId` (jugador aleatorio del roster del equipo, preferentemente FWD #8/9/11 o MID #5/7/10). Para juveniles/sub-15, los delanteros son #8, #9.
2. **Asistencias**: para cada gol, 70% de probabilidad de tener un `secondaryUserId` (asistente). El asistente es otro jugador del mismo equipo, distinto del scorer.
3. **Tarjetas amarillas**: 25% de probabilidad por partido. Si sale, un jugador aleatorio del equipo perdedor (o cualquier equipo) recibe YELLOW_CARD al minuto 30-79.
4. **MVP**: 1 evento `MVP` por partido al minuto 90. Asignado al jugador con más eventos (goles + asist) en ese partido; si hay empate, al #10 o al ganador del partido.

Para el partido **IN_PROGRESS** (el primero de la jornada 4 que se "está jugando" en el momento del seed), generar 1 gol parcial.

---

## 11. Liguilla / Playoffs (post round-robin)

### 11.1 Estructura

Al finalizar la fase de round-robin (15 o 30 jornadas según la liga), los **8 mejores equipos** de cada liga entran a una liguilla de eliminación directa:

| Ronda | Partidos | Total por liga | Clasificación |
|---|---|--:|---|
| Cuartos de final | 4 | 4 | 1° vs 8° · 2° vs 7° · 3° vs 6° · 4° vs 5° |
| Semifinales | 2 | 2 | Ganadores de QF |
| Final | 1 | 1 | Ganadores de SF |
| Tercer lugar | 1 | 1 | Perdedores de SF |
| **Total liguilla** | **8** | **8** | |

**Por las 15 ligas** = **120 partidos de playoff**.

### 11.2 Datos en la base

Los partidos de playoff son `Match` records con campos `knockoutStage` y `knockoutPosition` poblados:

```ts
type KnockoutStage = 'QUARTERS' | 'SEMIS' | 'FINAL';
```

(Se necesitará agregar un valor `THIRD_PLACE` al enum `KnockoutStage` para distinguir la final del 3er lugar, **O** usar el campo `notes` con el string `"3rd place match"` para identificarlos. Recomiendo agregar `THIRD_PLACE` al enum.)

```ts
// Match con knockoutStage = 'QUARTERS', knockoutPosition = 1
// es el partido 1 vs 8 de la liguilla
{
  id: '...',
  leagueId: 'L-Lun-Libre',
  matchdayId: null,  // los playoffs no pertenecen a un matchday
  homeTeamId: '<seed-1-team>',
  awayTeamId: '<seed-8-team>',
  fieldId: '...',  // asignado por el seed
  scheduledAt: '...',  // ~2 semanas después de la última jornada
  status: 'SCHEDULED',  // todos en la temporada actual
  homeScore: null,
  awayScore: null,
  knockoutStage: 'QUARTERS',
  knockoutPosition: 1,
  knockoutFeedsIntoMatchId: '<semis-match-1-id>',
}
```

### 11.3 Sembrado (scheduling)

**Fechas de los playoffs** (después de la última jornada de round-robin):

| Liga | Última jornada RR | Break | Cuartos | Semis | Final | 3er lugar |
|---|---|---|---|---|---|---|
| L-Lun-Libre | hace 11 sem (15) / 22 sem (30) | +1 sem | +1 sem | +2 sem | +3 sem | mismo día que la final |
| ... (todas similares, con su día específico) | | | | | | |

**Asignación de canchas**: la final y el 3er lugar en la **Cancha 1** (la principal). Las semis en canchas 1 y 2. Los cuartos en cualquier cancha (rotar).

**Árbitros**: los 3 árbitros fijos (de canchas 1-3) arbitran los partidos más importantes (final, 3er lugar); los rotativos para cuartos y semis.

### 11.4 Sembrado de los cruces

Para que el seed sea **determinista** (reproducible), los cruces se computan desde la **standings actual** de la temporada:

```ts
// Para cada liga:
// 1. Calcular standings con los partidos RR completados (4 jornadas)
// 2. Tomar los 8 primeros por puntos
// 3. Generar el bracket por seed: 1v8, 4v5, 2v7, 3v6
// 4. Los partidos tienen status = SCHEDULED y sin scores
```

**Importante**: la standings al final de la temporada (15 o 30 jornadas) NO está disponible porque solo tenemos 4 jornadas. Pero podemos usar la standings parcial como "predicción" — el seed es plausible, no perfecto. La liguilla se siembra según la **standings parcial al momento del seed** (jor 4), no según la standings final.

**Caveat del seed**: como la temporada apenas va por la jornada 4, los cruces sembrados no reflejarán la realidad de la temporada final. En el seed, los cruces son **proyectados** según los datos parciales. En producción (v1.1+), los cruces se generan al finalizar la última jornada de RR.

### 11.5 Partido de "Tercer lugar"

- Tipo: `THIRD_PLACE` en `knockoutStage` (o `SEMIS` con `notes: '3rd place match'`).
- `homeTeamId` / `awayTeamId`: los dos perdedores de las semifinales.
- `knockoutFeedsIntoMatchId`: `null` (es el último partido del bracket).
- Mismo día que la final.

### 11.6 Volumen actualizado (solo playoff)

- 15 ligas × 8 partidos de playoff = **120 partidos** (todos `SCHEDULED`).
- 0 eventos (los playoffs aún no se juegan).

### 11.7 Acceptance criteria (playoffs)

- ✅ Cada liga tiene 4 partidos en `knockoutStage = 'QUARTERS'`.
- ✅ Cada liga tiene 2 partidos en `knockoutStage = 'SEMIS'`.
- ✅ Cada liga tiene 1 partido en `knockoutStage = 'FINAL'`.
- ✅ Cada liga tiene 1 partido en `knockoutStage = 'THIRD_PLACE'`.
- ✅ Los 8 partidos por liga suman 120 totales.
- ✅ Los `homeTeamId` y `awayTeamId` de QF corresponden a los top-8 de la standings parcial al momento del seed.
- ✅ Los `knockoutFeedsIntoMatchId` están bien cableados (QF → SF, SF → Final, SF → 3rd place).
- ✅ Todos los partidos de playoff tienen `status = 'SCHEDULED'`, `homeScore = null`, `awayScore = null`.
- ✅ La pantalla `/leagues/L-Lun-Libre/knockout` muestra el bracket completo con cruces y nombres (aunque sin scores aún).

---

## 12. Awards de la temporada pasada

4 ligas finalizadas en la temporada anterior (hace 4 meses). Cada una tiene 1 award CHAMPION (oro) para el equipo que terminó #1 en la standings:

- L-Lun-Libre-Prev → "Linces FC" (1er lugar)
- L-Mar-Libre-Prev → "Cóndores Rojos" (1er lugar)
- L-Vie-Libre-Prev → "Pumas de la UNAM" (1er lugar)
- L-Sab-Libre-Prev → "Tigres del Ajusco" (1er lugar)

(O el seed puede generar nombres plausibles. La idea es que `MOCK_AWARDS` en la página de perfil tenga contenido para mostrar.)

---

## 13. Acceptance criteria

El seed es válido si al correr `pnpm prisma db seed` desde `backend/`:

1. ✅ Crea 1 admin, 6 referees, ~15 DTs, ~30 assistants, ~3360 players.
2. ✅ Crea 4 canchas idénticas.
3. ✅ Crea 15 ligas con sus 16 equipos cada una (240 equipos total). 8 ligas con `homeAndAway=true` (30 jornadas), 7 con `homeAndAway=false` (15 jornadas).
4. ✅ Crea ~3600 membresías (DT + ASSISTANT + PLAYER) con dorsales 1-14 sin colisiones dentro de cada equipo.
5. ✅ Genera ~480 partidos de round-robin (4 jornadas × 8 partidos × 15 ligas).
6. ✅ ~3.5 jornadas por liga están COMPLETED con scores + eventos.
7. ✅ El primer partido de la jornada 4 está IN_PROGRESS con score parcial.
8. ✅ Genera **120 partidos de liguilla** (8 por liga: 4 QF + 2 SF + 1 Final + 1 Tercer lugar), todos `SCHEDULED`.
9. ✅ Los cruces de playoff se siembran según la standings parcial al momento del seed (top-8).
10. ✅ Los `knockoutFeedsIntoMatchId` están bien cableados.
11. ✅ La standings calculada server-side (vía `useStandings`) muestra la tabla coherente.
12. ✅ Las leaderboards (goleadores, asistidores, MVPs) tienen datos para L-Lun-Libre (la que más completa tiene).
13. ✅ La pantalla `/leagues/L-Lun-Libre/knockout` muestra el bracket completo con cruces sembrados.
14. ✅ Los hooks del frontend (sin cambios) leen estos datos vía API y los renderizan.

Tiempo de seed esperado: **< 90 segundos** (gracias a `createMany` de Prisma).

---

## 14. Estructura del seed (recomendada)

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts                          # Entry point
└── prisma/seed/                         # Modular seed helpers
    ├── prng.ts                          # Seeded random number generator
    ├── names.ts                         # FIRST_NAMES, LAST_NAMES
    ├── team-names.ts                    # 240 team names
    ├── colors.ts                        # Paletas de colores
    ├── users.ts                         # createUsers(prisma, opts)
    ├── fields.ts                        # createFields(prisma)
    ├── teams.ts                         # createTeams(prisma, opts)
    ├── leagues.ts                       # createLeagues(prisma, opts)
    ├── memberships.ts                   # createMemberships(prisma, opts)
    ├── matchdays.ts                     # createMatchdays(prisma, opts)
    ├── matches.ts                       # createMatches(prisma, opts)
    ├── events.ts                        # createEvents(prisma, opts)
    └── awards.ts                        # createAwards(prisma, opts)
```

`backend/prisma/seed.ts` (entry point):

```ts
import { PrismaClient } from '@prisma/client';
import { createFields } from './seed/fields';
import { createUsers } from './seed/users';
import { createTeams } from './seed/teams';
import { createLeagues } from './seed/leagues';
import { createMemberships } from './seed/memberships';
import { createMatchdays } from './seed/matchdays';
import { createMatches } from './seed/matches';
import { createEvents } from './seed/events';
import { createAwards } from './seed/awards';

const prisma = new PrismaClient();
const SEED = 42; // determinista: misma seed = mismos datos

async function main() {
  // 1. Wipe in dependency order
  await prisma.matchEvent.deleteMany();
  await prisma.match.deleteMany();
  await prisma.matchday.deleteMany();
  await prisma.leagueTeam.deleteMany();
  await prisma.teamMembership.deleteMany();
  await prisma.team.deleteMany();
  await prisma.leagueField.deleteMany();
  await prisma.award.deleteMany();
  await prisma.league.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.field.deleteMany();

  // 2. Create
  const fields = await createFields(prisma);
  const users = await createUsers(prisma, { seed: SEED });
  const teams = await createTeams(prisma, { seed: SEED });
  const leagues = await createLeagues(prisma, { seed: SEED });
  await prisma.leagueField.createMany({ data: ... }); // canchas por liga
  await createMemberships(prisma, { teams, users, seed: SEED });
  const matchdays = await createMatchdays(prisma, { leagues, seed: SEED });
  const matches = await createMatches(prisma, { matchdays, teams, fields, seed: SEED });
  await createEvents(prisma, { matches, seed: SEED });
  await createAwards(prisma, { leagues, teams, seed: SEED });

  console.log('✅ Seed completo:');
  console.log(`  ${users.length} usuarios, ${teams.length} equipos, ${leagues.length} ligas, ${matches.length} partidos`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

Para ejecutarlo:

```bash
cd backend
node_modules/.bin/prisma db seed
```

Y para que se auto-ejecute con `migrate dev`:

```prisma
// En schema.prisma, al final:
generator client {
  provider = "prisma-client-js"
  // ...
}
```

Más el package.json:

```json
{
  "prisma": {
    "seed": "ts-node --transpile-only prisma/seed.ts"
  }
}
```

---

## 15. Próximos pasos

1. **Aprobar el spec** — dime si las ligas, los equipos, los partidos y los estados son correctos.
2. **Implementar el seed** — genero `backend/prisma/seed.ts` y los helpers modulares.
3. **Correr el seed** — `pnpm prisma db seed`.
4. **Validar pantallas** — abro `localhost:5173` y verifico que `/leagues/L-Lun-Libre` muestre 16 equipos con sus 14 jugadores + DT + auxiliar, todo con datos realistas.

¿Quieres que arranque con la implementación del seed (`backend/prisma/seed.ts`)? Si tienes dudas o quieres ajustar algo del spec (volúmenes, distribución de género, estados de partidos, etc.), dímelo antes.
