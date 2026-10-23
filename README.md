# CHRONOS-OPS

Motor de planificación operativa diaria, tareas, rutinas y calendario. Este repositorio contiene una primera aplicación independiente extraída del dominio operativo de **LEARN**.

## Requisitos previos

- **Node.js**: Versión 24.0.0 o superior (requerido por `node:sqlite` nativo y módulos ECMAScript).
- **Dependencias**: Cero paquetes externos requeridos (`npm install` no es necesario).
- **Docker / Docker Compose**: Opcional, para ejecución contenida (Docker Compose v2+).

### Variables de entorno

El servidor utiliza las siguientes variables (disponibles en `.env.example`):

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto TCP de escucha del servidor HTTP |
| `HOST` | `127.0.0.1` (`0.0.0.0` en Docker) | Interfaz de red de enlace |
| `DB_PATH` | `db/chronos.db` | Ruta del archivo de base de datos SQLite (WAL) |

---

## Ejecución en Local

### 1. Instalación de dependencias y semillero de datos
```sh
npm install

# (Opcional) Poblar la base de datos con datos sintéticos coherentes (tareas, rutinas DAG, rachas y planes):
npm run seed
```

### 2. Modo Desarrollo

**Opción A: Servidor Backend API + SPA integrado** (escucha en `http://127.0.0.1:3000` con recarga automática):
```sh
npm run dev
```

**Opción B: Servidor de Desarrollo Frontend con HMR** (Vite en puerto `5173`, con proxy transparente hacia el backend en el puerto `3000`):
```sh
# Terminal 1: Backend API
npm run dev

# Terminal 2: Vite Frontend Dev Server
npm run dev:frontend
```

### 3. Modo Producción
Compila la SPA cliente en `dist/` y levanta el servidor Express:
```sh
npm run build
npm start
```

### 4. Verificación
1. Abra su navegador en: `http://127.0.0.1:3000`
2. Verifique la API de salud mediante HTTP GET:
```sh
curl -s http://127.0.0.1:3000/api/health
# Respuesta: {"ok":true}
```

> **Persistencia automática:** Si el archivo no existe, el servidor inicializa automáticamente `db/chronos.db` al arrancar, activando `PRAGMA foreign_keys = ON`, `PRAGMA journal_mode = WAL` y creando las tablas e índices necesarios.

---

## Ejecución con Docker

### Opción A: Mediante Docker Compose (Recomendado)

El archivo `compose.yaml` define el servicio, vincula `127.0.0.1:3000` y monta `./db` en el contenedor para persistir la base de datos en el host.

```sh
# Construir imagen y levantar contenedor en primer plano
docker compose up --build

# O en segundo plano (modo detached)
docker compose up -d --build

# Visualizar logs del contenedor
docker compose logs -f

# Detener el contenedor
docker compose down
```

### Opción B: Mediante Docker CLI Directo

```sh
# Construir la imagen basada en node:24-alpine
docker build -t chronos-ops .

# Ejecutar montando el volumen de persistencia
docker run -d \
  --name chronos \
  -p 127.0.0.1:3000:3000 \
  -v ./db:/app/db \
  chronos-ops

# Detener y remover contenedor
docker stop chronos && docker rm chronos
```

> [!IMPORTANT]
> **Permisos en Linux:** El contenedor ejecuta bajo el usuario no privilegiado `node` (UID:GID `1000:1000`). Asegure que el directorio host `./db` tenga permisos de lectura/escritura (`chown -R 1000:1000 ./db` o `chmod 775 ./db`).
>
> **Aislamiento y Acceso:** Esta versión es local. El selector «Usuario» y la cabecera HTTP `X-User-Id` aíslan los datos en la base (`tasks`, `routines`, `plans`), pero **no** autentican criptográficamente personas. No exponga el puerto a redes públicas ni detrás de un proxy inverso abierto sin implementar autenticación previa.

---

## Pruebas Unitarias e Integración

El proyecto utiliza el test runner nativo de Node.js (`node:test` y `node:assert/strict`) potenciado por `tsx` para ejecución directa en TypeScript.

### 1. Ejecutar la suite completa

```sh
npm test
```

### 2. Ejecución con modo observación (Watch Mode)
Re-ejecuta automáticamente las pruebas ante cualquier cambio en el código o en los tests:

```sh
npx tsx --test --watch backend/src/services/*.test.ts test/*.test.ts
```

### 3. Cobertura de suites y módulos

| Suite | Comando | Cobertura / Invariantes |
| --- | --- | --- |
| **Backend Express API** | `npx tsx --test test/backend-api.test.ts` | Health check (`/api/health`), SPA static fallback, validación de cabecera `X-User-Id` (401), CRUD y aislamiento multi-usuario, cálculo de DAG y prevención de ciclos (400). |
| **Servicio de Rutinas y DAG** | `npx tsx --test backend/src/services/routine.service.test.ts` | Rachas diarias y semanales, cálculo de cumplimiento histórico, validación de frecuencias y manejo de excepciones (`ValidationError`, `NotFoundError`). |
| **Servicio de Calendario** | `npx tsx --test backend/src/services/calendar.service.test.ts` | Agregación de tareas, eventos recurrentes, rutinas y fechas clave por mes/año consultado. |
| **KPIs Operativos** | `npx tsx --test backend/src/services/task-kpi.service.test.ts` | Tasa de cumplimiento a 30 días, tareas vencidas, distribución por estado. |
| **Importador de Datos** | `npx tsx --test test/import.test.js` | Migración de respaldos SQLite desde LEARN (`cogni.db`), modo `--dry-run`, preservación de IDs e integridad referencial foránea. |

---

## Migrar datos desde LEARN

Trabaje sobre un respaldo SQLite consistente de `cogni.db` (incluya el estado WAL mediante la API de backup de SQLite). Revise primero el inventario:

```sh
npm run import:learn -- --source /ruta/al/respaldo-cogni.db --dry-run
npm run import:learn -- --source /ruta/al/respaldo-cogni.db --target db/chronos.db
```

El importador exige un destino inexistente, conserva IDs, copia tareas, rutinas, planes, versiones y eventos de cumplimiento, valida dependencias e integridad y reporta registros sin `user_id`. Los IDs de personas, proyectos y dominios quedan como referencias externas. Se ejecutó contra la base de LEARN en modo de solo lectura el 23 de octubre de 2026: importó 13 planes y no encontró tareas, rutinas, versiones ni eventos de cumplimiento pertinentes. Para repetirlo en otro entorno, prepare antes un respaldo consistente.

## Alcance de la migración

| Área | Origen en LEARN | Destino previsto |
| --- | --- | --- |
| Rutinas y dependencias | `server/src/application/services/routine.service.ts`, `server/src/infrastructure/database/schemas/routine.schema.ts`, `client/src/views/RoutinesView/` | Motor de rutinas y vista independiente |
| Tareas e indicadores | `task.service.ts`, `task-kpi.service.ts`, `task.schema.ts`, `TasksView/` | Gestión de tareas e indicadores |
| Planes | `plan.service.ts`, `plan.schema.ts` y `plan_versions` | Planes y versiones |
| Calendario | `calendar.service.ts`, `CalendarView/` | Disponibilidad y agenda |
| Tablero | `WorkDashboard/` | Resumen operativo |

Las rutas abreviadas de servicios y vistas de esta tabla se ubican bajo `server/src/application/services/` y `client/src/views/`, respectivamente en LEARN. En CHRONOS-OPS, el backend está modularizado en `backend/src/` con Express, TypeScript y `node:sqlite` nativo. El frontend Vue 3 en `frontend/` se integra desacoplado sin dependencias residuales del prototipo anterior.

`ReviewStudio/` y `review.schema.ts` necesitan una decisión de alcance antes de migrarse. En LEARN, `reviews` registra evaluaciones de preguntas asociadas a `concepts`, por lo que forma parte del dominio de estudio, no del núcleo operativo de CHRONOS-OPS. Una revisión diaria operativa requeriría un modelo propio.

## Datos y límites del dominio

- Persistencia: SQLite dedicado en `db/chronos.db`. El objetivo de tamaño inferior a 15 MB es una hipótesis que debe medirse con datos y retención reales.
- `tasks` referencia `people` y `projects`; `plans` referencia `domains`. Antes de separar la base de datos hay que definir identificadores externos y una política para referencias huérfanas.
- En LEARN, `routines` usa `depends_on_id` para una dependencia individual y el DAG se calcula en el cliente. En CHRONOS-OPS, el servidor valida pertenencia y ciclos al escribir, y devuelve el orden topológico. `anchor_cue` queda como texto, sin inferir aristas.
- Las rutinas ya registran eventos de cumplimiento mediante `EventRepository`; la adopción de event sourcing completo requiere un diseño de migración y proyecciones, no solo añadir una tabla de eventos.

## Evolución propuesta

El desglose de entregables, decisiones y verificaciones está en [el plan de migración](docs/PLAN_MIGRACION.md).

1. **Extraer el dominio existente.** Inventariar dependencias, fijar contratos API, crear esquema y migraciones para `chronos.db`, trasladar los flujos operativos y verificar paridad funcional con LEARN.
2. **Consolidar el DAG en el servidor.** Validar referencias, pertenencia al usuario y ciclos en cada escritura; exponer orden topológico determinista y tareas bloqueadas. Añadir pruebas para grafos vacíos, desconectados, ciclos y borrados.
3. **Planificación factible.** Incorporar duración, ventanas de disponibilidad, precedencia, calendario y restricciones de capacidad. Empezar por un planificador determinista con explicaciones de inviabilidad y medirlo antes de elegir un solver externo.
4. **Incertidumbre.** Guardar estimaciones optimista, probable y pesimista; calcular PERT y simular escenarios cuando haya datos de duración suficientes. Mostrar probabilidades como estimaciones, no como garantías.
5. **Historial y agentes.** Definir eventos versionados e idempotentes para cambios relevantes. Integrar agentes mediante una API con autorización, estados verificables y confirmación de resultados antes de desbloquear dependencias.

Rust/WASM, CP-SAT, modelos de adherencia y una interfaz Canvas son opciones de investigación. Su adopción depende de perfiles de rendimiento, calidad de datos y necesidades observadas. Las cifras de latencia, tamaño y velocidad del informe de propuesta no se consideran requisitos verificados.

## Criterios de aceptación de la primera fase

- La aplicación puede crear, consultar, modificar y eliminar tareas, rutinas y planes con datos en `db/chronos.db`.
- Las operaciones rechazan dependencias inexistentes, ajenas al usuario y cíclicas.
- Calendario, tablero y vistas de tareas y rutinas funcionan sin conectarse a `cogni.db`.
- Hay un importador reproducible para un respaldo, con verificación de conteos e integridad referencial. La preparación del respaldo sigue siendo un paso operativo externo.
- Las pruebas automatizadas del dominio y la API pasan en el repositorio independiente. La interfaz requiere validación visual manual.

## Fuente

Proyecto original: `D:\TRABAJO\DESARROLLO DE SOFTWARE\CHRISTIAN\PROYECTOS\WEB\JS\App\LEARN`.

Propuesta de referencia: `LEARN/analisis/INFORME_CHRONOS_OPS_DEEP_TECH.md` (20 de octubre de 2026). El documento describe una arquitectura objetivo; no representa funcionalidades ya implementadas en este repositorio.
