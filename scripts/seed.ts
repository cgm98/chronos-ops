import { openDatabase } from '../backend/src/infrastructure/database/connection.ts';

// Utilidades para fechas relativas dinámicas
const formatDate = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

const formatIso = (offsetDays: number, hour = 10, minute = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export function seedDatabase(targetDbPath?: string) {
  const sqlite = openDatabase(targetDbPath);

  console.log('🌱 Inicializando semillero sintético de alta fidelidad para CHRONOS-OPS...');

  // 1. Limpieza idempotente previa de tablas operativas
  sqlite.exec(`
    DELETE FROM routine_events;
    DELETE FROM routines;
    DELETE FROM tasks;
    DELETE FROM plan_versions;
    DELETE FROM plans;
    DELETE FROM events;
    DELETE FROM users;
  `);

  // 2. Semilla de Usuario Principal
  const insertUser = sqlite.prepare(`
    INSERT INTO users (id, email, provider, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertUser.run('u1', 'architect@chronos-ops.internal', 'local', formatIso(-30), formatIso(0));
  insertUser.run('u2', 'peer.engineer@chronos-ops.internal', 'local', formatIso(-20), formatIso(0));

  console.log('✓ Usuarios creados: u1 (Principal), u2 (Secundario)');

  // 3. Semilla de Tareas Operativas (Kanban con balance realista)
  const insertTask = sqlite.prepare(`
    INSERT INTO tasks (
      id, user_id, title, description, status, priority,
      assignee_id, project_id, due_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tasksData = [
    // --- Columna PENDIENTE (todo) ---
    {
      id: 'task-101',
      user_id: 'u1',
      title: 'Auditoría de índices y compactación WAL en SQLite',
      description: 'Verificar tamaño de página, fragmentación de árbol B-Tree y plan de ejecución en consultas complejas de KPIs.',
      status: 'todo',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-infra',
      due_date: formatDate(3),
      created_at: formatIso(-4, 9),
      updated_at: formatIso(-4, 9)
    },
    {
      id: 'task-102',
      user_id: 'u1',
      title: 'Definir especificación OpenAPI v3 para motor DAG',
      description: 'Documentar schemas JSON de endpoints /api/routines/dag, respuestas de error 400 por ciclos y contratos de eventos.',
      status: 'todo',
      priority: 'medium',
      assignee_id: null,
      project_id: 'proj-core',
      due_date: formatDate(5),
      created_at: formatIso(-3, 11),
      updated_at: formatIso(-3, 11)
    },
    {
      id: 'task-103',
      user_id: 'u1',
      title: 'Benchmark de latencia P99 en ordenamiento topológico Kahn',
      description: 'Generar grafos de prueba con 1.000 nodos y validar que la resolución del orden tarde menos de 10ms en node:sqlite.',
      status: 'todo',
      priority: 'low',
      assignee_id: null,
      project_id: 'proj-core',
      due_date: formatDate(8),
      created_at: formatIso(-2, 14),
      updated_at: formatIso(-2, 14)
    },
    {
      id: 'task-104',
      user_id: 'u1',
      title: 'Actualizar parches de seguridad críticos en dependencias',
      description: 'Tarea atrasada para validar el cálculo y alerta de tareas vencidas en el header de KPIs.',
      status: 'todo',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-infra',
      due_date: formatDate(-2), // VENCIDA hace 2 días para activar indicador
      created_at: formatIso(-6, 8),
      updated_at: formatIso(-2, 8)
    },

    // --- Columna EN CURSO (in_progress) ---
    {
      id: 'task-105',
      user_id: 'u1',
      title: 'Implementar detección de ciclos y validación DAG en servidor',
      description: 'Algoritmo de Kahn integrado en routine.service.ts para rechazar dependencias cíclicas en escritura antes de persistir.',
      status: 'in_progress',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-core',
      due_date: formatDate(0), // Vence HOY para radar de prioridades
      created_at: formatIso(-2, 9),
      updated_at: formatIso(0, 10)
    },
    {
      id: 'task-106',
      user_id: 'u1',
      title: 'Refactorizar Kanban con scroll desacoplado a 100dvh',
      description: 'Asegurar que cada columna mantenga scroll independiente y soporte drag & drop sin provocar scroll de la ventana global.',
      status: 'in_progress',
      priority: 'medium',
      assignee_id: null,
      project_id: 'proj-ux',
      due_date: formatDate(1), // Vence mañana
      created_at: formatIso(-1, 15),
      updated_at: formatIso(0, 11)
    },
    {
      id: 'task-107',
      user_id: 'u1',
      title: 'Optimizar inserción por lotes con Transaction Prepared Statements',
      description: 'Empaquetar mutaciones masivas en transacciones explícitas BEGIN TRANSACTION / COMMIT para máxima tasa de IOPs.',
      status: 'in_progress',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-core',
      due_date: formatDate(2),
      created_at: formatIso(-3, 16),
      updated_at: formatIso(-1, 17)
    },

    // --- Columna BLOQUEADA (blocked) ---
    {
      id: 'task-108',
      user_id: 'u1',
      title: 'Despliegue a cluster multi-región con replicación de volumen',
      description: 'Bloqueada a la espera de credenciales IAM de infraestructura de producción y revisión de cortafuegos.',
      status: 'blocked',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-infra',
      due_date: formatDate(4),
      created_at: formatIso(-5, 10),
      updated_at: formatIso(-1, 9)
    },
    {
      id: 'task-109',
      user_id: 'u1',
      title: 'Migración a persistencia distribuida LiteFS / Turso',
      description: 'Pausada a la espera de métricas definitivas de tamaño de base de datos y latencia observada en local.',
      status: 'blocked',
      priority: 'low',
      assignee_id: null,
      project_id: 'proj-infra',
      due_date: null,
      created_at: formatIso(-8, 12),
      updated_at: formatIso(-2, 14)
    },

    // --- Columna HECHA (done) ---
    {
      id: 'task-110',
      user_id: 'u1',
      title: 'Desacoplar repositorio de dependencias legadas de LEARN',
      description: 'Eliminadas referencias cruzadas y carpetas server/ y public/ obsoletas. Arquitectura 100% independiente.',
      status: 'done',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-core',
      due_date: formatDate(-4),
      created_at: formatIso(-7, 8),
      updated_at: formatIso(-4, 18)
    },
    {
      id: 'task-111',
      user_id: 'u1',
      title: 'Implementar selector interactivo de tema Claro y Oscuro',
      description: 'Soporte completo de tokens de diseño, CSS variables y sincronización automática con prefers-color-scheme.',
      status: 'done',
      priority: 'medium',
      assignee_id: null,
      project_id: 'proj-ux',
      due_date: formatDate(-2),
      created_at: formatIso(-4, 13),
      updated_at: formatIso(-2, 16)
    },
    {
      id: 'task-112',
      user_id: 'u1',
      title: 'Unificar componentes modales y validaciones inline por campo',
      description: 'Progressive disclosure implementado con campos esenciales primero y opciones técnicas plegables.',
      status: 'done',
      priority: 'medium',
      assignee_id: null,
      project_id: 'proj-ux',
      due_date: formatDate(-1),
      created_at: formatIso(-3, 10),
      updated_at: formatIso(-1, 15)
    },
    {
      id: 'task-113',
      user_id: 'u1',
      title: 'Configurar suites de tests con runner nativo node:test y tsx',
      description: '13 pruebas automatizadas cubriendo el motor DAG, servicios de calendario, KPIs de tareas e integridad de importación.',
      status: 'done',
      priority: 'high',
      assignee_id: null,
      project_id: 'proj-infra',
      due_date: formatDate(-5),
      created_at: formatIso(-8, 9),
      updated_at: formatIso(-5, 17)
    }
  ];

  for (const t of tasksData) {
    insertTask.run(
      t.id, t.user_id, t.title, t.description, t.status, t.priority,
      t.assignee_id, t.project_id, t.due_date, t.created_at, t.updated_at
    );
  }
  console.log(`✓ Tareas creadas: ${tasksData.length} registros distribuidos en todo, in_progress, blocked y done.`);

  // 4. Semilla de Rutinas con Cadena Causal DAG (Grafo sin ciclos)
  const insertRoutine = sqlite.prepare(`
    INSERT INTO routines (
      id, user_id, title, description, frequency, weekly_days,
      active, time_of_day, duration_mins, anchor_cue, depends_on_id,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const routinesData = [
    {
      id: 'rt-101',
      user_id: 'u1',
      title: 'Revisión matutina de logs y telemetría crítica',
      description: 'Inspeccionar dashboards de observabilidad, errores no controlados y latencia P99 de la base de datos.',
      frequency: 'daily',
      weekly_days: null,
      active: 1,
      time_of_day: 'morning',
      duration_mins: 15,
      anchor_cue: 'Al iniciar la jornada con el primer café matutino',
      depends_on_id: null,
      created_at: formatIso(-14),
      updated_at: formatIso(0)
    },
    {
      id: 'rt-102',
      user_id: 'u1',
      title: 'Alineación de prioridades y standup asíncrono',
      description: 'Mapear las 3 prioridades del día en el tablero Kanban y verificar bloqueos en dependencias.',
      frequency: 'daily',
      weekly_days: null,
      active: 1,
      time_of_day: 'morning',
      duration_mins: 15,
      anchor_cue: 'Inmediatamente después de verificar la telemetría de logs',
      depends_on_id: 'rt-101', // DAG: depende de rt-101
      created_at: formatIso(-14),
      updated_at: formatIso(0)
    },
    {
      id: 'rt-103',
      user_id: 'u1',
      title: 'Bloque Deep Work: Ingeniería de Software de Alto Impacto',
      description: 'Sesión enfocada de desarrollo sin interrupciones, notificaciones silenciadas y foco exclusivo en Core Engine.',
      frequency: 'daily',
      weekly_days: null,
      active: 1,
      time_of_day: 'morning',
      duration_mins: 90,
      anchor_cue: 'Al concluir la alineación de prioridades',
      depends_on_id: 'rt-102', // DAG: depende de rt-102
      created_at: formatIso(-14),
      updated_at: formatIso(0)
    },
    {
      id: 'rt-104',
      user_id: 'u1',
      title: 'Triage de Pull Requests y Code Review riguroso',
      description: 'Revisión técnica de código, análisis de regresión, verificación de contratos de API y cobertura de tests.',
      frequency: 'daily',
      weekly_days: null,
      active: 1,
      time_of_day: 'afternoon',
      duration_mins: 45,
      anchor_cue: 'Al reanudar actividades en la tarde tras el almuerzo',
      depends_on_id: 'rt-103', // DAG: depende de rt-103
      created_at: formatIso(-14),
      updated_at: formatIso(0)
    },
    {
      id: 'rt-105',
      user_id: 'u1',
      title: 'Auditoría de seguridad y cierre operativo',
      description: 'Comprobar pipelines de CI/CD limpios, commits firmados y dejar el espacio de trabajo listo para el día siguiente.',
      frequency: 'daily',
      weekly_days: null,
      active: 1,
      time_of_day: 'evening',
      duration_mins: 20,
      anchor_cue: 'Al cerrar la jornada laboral',
      depends_on_id: 'rt-104', // DAG: depende de rt-104
      created_at: formatIso(-14),
      updated_at: formatIso(0)
    },
    {
      id: 'rt-106',
      user_id: 'u1',
      title: 'Retrospectiva semanal de arquitectura y deuda técnica',
      description: 'Sesión semanal de balance técnico: trade-offs analizados, refactorizaciones necesarias y lecciones aprendidas.',
      frequency: 'weekly',
      weekly_days: '5', // Viernes
      active: 1,
      time_of_day: 'afternoon',
      duration_mins: 60,
      anchor_cue: 'Cierre de la tarde del viernes',
      depends_on_id: null,
      created_at: formatIso(-21),
      updated_at: formatIso(0)
    }
  ];

  for (const r of routinesData) {
    insertRoutine.run(
      r.id, r.user_id, r.title, r.description, r.frequency, r.weekly_days,
      r.active, r.time_of_day, r.duration_mins, r.anchor_cue, r.depends_on_id,
      r.created_at, r.updated_at
    );
  }
  console.log(`✓ Rutinas creadas: ${routinesData.length} nodos con grafo topológico acíclico.`);

  // 5. Semilla de Historial de Cumplimiento (Rachas reales continuas)
  const insertRoutineEvent = sqlite.prepare(`
    INSERT INTO routine_events (id, user_id, routine_id, date, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let eventCounter = 1;

  // rt-101: Racha de 7 días consecutivos (incluyendo hoy)
  for (let offset = -6; offset <= 0; offset++) {
    const d = formatDate(offset);
    insertRoutineEvent.run(`rev-${eventCounter++}`, 'u1', 'rt-101', d, formatIso(offset, 8, 30));
  }

  // rt-102: Racha de 5 días consecutivos (incluyendo hoy)
  for (let offset = -4; offset <= 0; offset++) {
    const d = formatDate(offset);
    insertRoutineEvent.run(`rev-${eventCounter++}`, 'u1', 'rt-102', d, formatIso(offset, 9, 0));
  }

  // rt-103: Racha de 3 días consecutivos (incluyendo hoy)
  for (let offset = -2; offset <= 0; offset++) {
    const d = formatDate(offset);
    insertRoutineEvent.run(`rev-${eventCounter++}`, 'u1', 'rt-103', d, formatIso(offset, 10, 15));
  }

  // rt-104: Cumplida ayer y anteayer, hoy pendiente para interactuar
  for (let offset = -2; offset <= -1; offset++) {
    const d = formatDate(offset);
    insertRoutineEvent.run(`rev-${eventCounter++}`, 'u1', 'rt-104', d, formatIso(offset, 15, 30));
  }

  // rt-105: Cumplida anteayer, hoy pendiente
  insertRoutineEvent.run(`rev-${eventCounter++}`, 'u1', 'rt-105', formatDate(-1), formatIso(-1, 18, 0));

  console.log(`✓ Eventos de rutinas creados: ${eventCounter - 1} ejecuciones históricas (simulando rachas activas de 7, 5 y 3 días).`);

  // 6. Semilla de Planes Operativos y Versionado
  const insertPlan = sqlite.prepare(`
    INSERT INTO plans (id, user_id, domain_id, title, status, content, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertPlanVersion = sqlite.prepare(`
    INSERT INTO plan_versions (id, plan_id, title, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertPlan.run(
    'plan-201',
    'u1',
    'dom-arch',
    'Roadmap de Desacoplamiento y Rendimiento P99 en CHRONOS-OPS',
    'active',
    'Especificación técnica de migración hacia backend desacoplado Express + TypeScript con SQLite nativo WAL.',
    formatIso(-15),
    formatIso(0)
  );

  insertPlanVersion.run(
    'ver-201-1',
    'plan-201',
    'Borrador inicial de límites de dominio',
    'Identificación de acoplamientos innecesarios con LEARN y definición de interfaces stub.',
    formatIso(-15)
  );
  insertPlanVersion.run(
    'ver-201-2',
    'plan-201',
    'RFC de Arquitectura Aprobada',
    'Adopción de Express 5, Vue 3, Pinia, TypeScript estricto y node:sqlite sin drivers C++ nativos.',
    formatIso(-5)
  );

  insertPlan.run(
    'plan-202',
    'u1',
    'dom-ops',
    'Estrategia de Tolerancia a Fallos y Event Sourcing Idempotente',
    'draft',
    'Diseño de bus inmutable de eventos para auditoría de transiciones operativas y reversibilidad.',
    formatIso(-7),
    formatIso(-1)
  );

  console.log('✓ Planes operativos y versiones creadas.');

  console.log('\n✨ Base de datos sembrada con éxito. Todos los grafos, rachas y tareas reflejan un entorno operativo coherente.');
}

// Ejecución directa si se invoca con CLI
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('seed')) {
  seedDatabase();
}
