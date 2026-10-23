# Plan de migración de LEARN a CHRONOS-OPS

**Estado (2026-10-23):** primera aplicación independiente implementada; 13 planes importados; mejoras avanzadas y validación visual pendientes.  
**Origen:** `D:\TRABAJO\DESARROLLO DE SOFTWARE\CHRISTIAN\PROYECTOS\WEB\JS\App\LEARN`  
**Destino:** este repositorio.

## 1. Decisiones de límite antes de copiar código

**Decisiones aplicadas:** los IDs de usuario, persona, proyecto y dominio se conservan como referencias externas; calendario incluye solo tareas y rutinas; ReviewStudio permanece en LEARN; `anchor_cue` no crea dependencias. La interfaz actual se implementó en JavaScript nativo, por lo que no reproduce literalmente las vistas Vue ni sus estilos.

1. **Identidad:** conservar `user_id` como identificador externo; definir cómo CHRONOS-OPS autentica al usuario sin copiar la base de usuarios de LEARN.
2. **Referencias externas:** `tasks.assignee_id` apunta a `people`, `tasks.project_id` a `projects` y `plans.domain_id` a `domains`. Mantener los IDs como referencias externas sin claves foráneas entre bases y decidir cómo se muestran nombres y enlaces cuando el origen no está disponible. No usar URI semántica como sustituto automático de una identidad estable.
3. **Calendario:** el servicio actual agrega tareas y rutinas junto con facturas recurrentes, contactos, fechas importantes y revisiones de código. El calendario propio debe definir si muestra solo eventos operativos o consume los otros dominios mediante adaptadores explícitos. Copiarlo sin esos repositorios no compila.
4. **ReviewStudio:** el `review.service.ts` actual usa preguntas, conceptos y `QuestionEngine`; `review.schema.ts` registra repasos de estudio. Dejarlo en LEARN hasta que exista un caso de uso de revisión operativa con nombre, modelo y datos propios.
5. **Rutinas y DAG:** `depends_on_id` admite una sola dependencia explícita; el cliente también infiere dependencias de texto de `anchor_cue`. Para reglas de ejecución, usar únicamente aristas explícitas y validadas. Conservar `anchor_cue` como texto orientativo. Si se requieren varias dependencias, diseñar una tabla de aristas versionada.

## 2. Inventario que debe cerrar la extracción

| Módulo | Archivos principales en LEARN | Dependencias que hay que incluir o reemplazar |
| --- | --- | --- |
| Rutinas | `server/src/application/services/routine.service.ts`, esquema, repositorio, controlador, rutas; `client/src/views/RoutinesView/` | `EventRepository`, `todayLocal`, entidad, DTO, store, servicio HTTP, componentes y composables |
| Tareas | `task.service.ts`, `task-kpi.service.ts`, esquema, repositorio, controladores, rutas; `TasksView/` | entidad, DTO, stores, servicios HTTP, referencias a personas y proyectos |
| Planes | `plan.service.ts`, esquemas `plans` y `plan_versions`, repositorios, controlador, rutas | repositorio de dominios, bus de eventos, contratos de versiones |
| Calendario | `calendar.service.ts`, controlador, rutas; `CalendarView/` | repositorios de otros dominios; sustituirlos por adaptadores o reducir alcance |
| Tablero | `WorkDashboard/` | consultas agregadas, stores, navegación y estilos compartidos |

Antes de copiar cada vista, inventariar imports transitivos, rutas de Vue Router, componentes globales, variables CSS, iconos y contratos de API. El código de origen está distribuido entre `server/` y `client/`; las rutas `backend/` y `frontend/` del resumen inicial no corresponden al árbol actual.

## 3. Entregas en orden

| Entrega | Estado |
| --- | --- |
| 0. Línea base y respaldo | Inventario y lectura de origen realizados; falta respaldo formal y comparación visual |
| 1. Núcleo independiente | Implementado con Node 24, SQLite y frontend nativo |
| 2. Integridad del DAG y calendario | Implementado para dependencia única explícita y eventos operativos |
| 3. Datos históricos | Importador probado e importación inicial realizada: 13 planes; falta ensayo de reversión y corte de tráfico |
| 4. Mejoras de planificación | Pendiente de datos y objetivos de rendimiento medidos |

### Entrega 0: línea base y respaldo

- Fijar un commit o etiqueta de origen y registrar versiones de Node, npm y SQLite.
- Obtener conteos de `tasks`, `routines`, `plans`, `plan_versions` y eventos de rutinas por usuario; registrar claves huérfanas y duplicados.
- Crear una copia consistente de `cogni.db` con el mecanismo de backup de SQLite, tomando en cuenta WAL. Evitar copiar solo el archivo principal mientras la base esté activa.
- Registrar contratos HTTP y capturas o pruebas de los flujos existentes.

**Salida:** inventario reproducible, respaldo verificable y conjunto de datos de ensayo sin información sensible.

### Entrega 1: núcleo independiente

- Crear estructura de servidor y cliente con TypeScript, Vue 3 y SQLite; añadir scripts de desarrollo, compilación y pruebas.
- Crear migraciones de `chronos.db` para tareas, rutinas, planes, versiones y eventos de cumplimiento. Activar claves foráneas y WAL en la conexión SQLite.
- Migrar entidades, repositorios, servicios, controladores, rutas y validaciones de tareas, indicadores, rutinas y planes. Sustituir dependencias externas mediante interfaces explícitas.
- Migrar `TasksView`, `RoutinesView` y la parte operativa de `WorkDashboard`, junto con sus stores y servicios HTTP.
- Mantener compatibilidad de IDs y fechas; documentar cualquier cambio de contrato.

**Salida:** CRUD de tareas, rutinas y planes; rachas e indicadores; aplicación ejecutable sin `cogni.db`.

### Entrega 2: integridad del DAG y calendario

- Centralizar en el servidor la validación de dependencia existente, mismo usuario, ausencia de autorreferencia y ausencia de ciclos al crear o modificar.
- Calcular orden topológico con desempate estable y devolver un error explícito cuando el grafo no sea válido. Definir el comportamiento al desactivar o eliminar un predecesor.
- Decidir si las dependencias bloquean completar una rutina o solo ordenan su presentación; reflejar la misma regla en API y UI.
- Extraer un calendario de tareas y rutinas. Incorporar eventos de otros dominios solo mediante adaptadores con contratos y fallos definidos.

**Salida:** DAG consistente en todas las rutas de escritura y calendario funcional sin repositorios de LEARN.

### Entrega 3: datos históricos y cambio de tráfico

- Ejecutar un importador idempotente desde un respaldo de LEARN hacia `chronos.db`, con mapa de IDs externos y reporte por tabla.
- Verificar conteos, muestras por usuario, relaciones, fechas locales, versiones de planes y eventos de cumplimiento. Ejecutar `PRAGMA foreign_key_check` e `integrity_check`.
- Ensayar la reversión restaurando el respaldo del destino. Programar una ventana de congelación o una sincronización incremental para evitar perder cambios hechos durante el cambio de aplicación.
- Cambiar el tráfico solo después de comparar los flujos principales con la línea base.

**Salida:** migración repetible, informe de conciliación y procedimiento de reversión probado.

### Entrega 4: mejoras de planificación

- Definir disponibilidad, duración y restricciones concretas; producir primero planes deterministas y explicar por qué uno es inviable.
- Añadir estimaciones PERT y simulación solo cuando existan duraciones históricas suficientes para calibrarlas.
- Medir tamaño de base, latencia y uso de CPU con cargas representativas antes de decidir si Rust/WASM o un solver especializado aportan valor.
- Diseñar eventos versionados, idempotencia y autorización antes de permitir que agentes externos modifiquen tareas o desbloqueen dependencias.

**Salida:** mejoras respaldadas por métricas y contratos. Esta entrega no bloquea la independencia funcional.

## 4. Pruebas de aceptación

- **Aislamiento:** la aplicación inicia y ejecuta sus flujos principales sin acceder a `cogni.db` ni importar módulos de LEARN.
- **Integridad:** crear y actualizar dependencias inexistentes, de otro usuario, propias o cíclicas produce errores; el orden del DAG es estable con los mismos datos.
- **Datos:** el importador se puede repetir sin duplicar registros; los conteos y relaciones concuerdan con el respaldo; los eventos históricos conservan fecha y usuario.
- **Producto:** crear, editar y completar tareas y rutinas; consultar rachas, planes, indicadores y calendario; navegar entre vistas.
- **Operación:** build y pruebas de servidor y cliente pasan; respaldo y reversión se han ensayado con una copia de datos.

## 5. Riesgos que requieren decisión explícita

| Riesgo | Consecuencia | Decisión o mitigación |
| --- | --- | --- |
| Referencias cruzadas con LEARN | Datos visibles sin nombre o enlaces rotos | Contratos de consulta o instantáneas de nombres con IDs estables |
| Dependencias inferidas desde `anchor_cue` | Ciclos o cambios de orden al editar texto | Excluirlas de la regla de ejecución; migrarlas solo tras revisión |
| Eventos de cumplimiento compartidos | Pérdida de rachas | Migrar eventos pertinentes y verificar fechas locales |
| Escrituras simultáneas durante el corte | Divergencia entre bases | Congelación breve o replicación incremental ensayada |
| Objetivos de rendimiento del informe sin medición | Complejidad innecesaria | Establecer cargas y presupuestos después de la línea base |

## 6. Secuencia inmediata de implementación

1. Fijar alcance del calendario, identidad y referencias externas.
2. Completar inventario de imports y contratos de tareas, rutinas y planes.
3. Preparar respaldo y datos de ensayo.
4. Construir `chronos.db` y el servidor mínimo.
5. Migrar vistas por flujo completo y verificar paridad.

Este plan distingue lo existente de lo propuesto. El informe de ingeniería es una fuente de ideas para la Entrega 4, no evidencia de que Rust/WASM, CP-SAT, Monte Carlo o despacho de agentes ya funcionen.
