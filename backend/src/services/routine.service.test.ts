import { test, describe, before } from 'node:test';
import assert from 'node:assert';

process.env.DB_PATH = ':memory:';

describe('RoutineService (Rutinas Fase 1: CRUD, toggle, racha)', () => {
  let db: any, sqlite: any;
  let usersTable: any;
  let RoutineService: any, RoutineRepository: any, EventRepository: any;
  let userId: string;

  // Inserta un evento de "rutina completada" con created_at fijo — bypassa
  // EventRepository.log() (que siempre usa new Date()) para simular días
  // pasados sin depender de qué día es "hoy" al correr el test.
  const insertCompletion = (routineId: string, date: Date) => {
    sqlite.prepare(`INSERT INTO events (id, kind, entity_type, entity_id, created_at) VALUES (?, 'routine_completed', 'routine', ?, ?)`)
      .run(`event-test-${Math.random()}`, routineId, date.toISOString());
  };

  before(async () => {
    const connection = await import('../../infrastructure/database/connection.js');
    connection.initDb();
    db = connection.db;
    sqlite = connection.sqlite;

    const schema = await import('../../infrastructure/database/schemas/auth.schema.js');
    usersTable = schema.usersTable;

    ({ RoutineService } = await import('./routine.service.js'));
    ({ RoutineRepository } = await import('../../infrastructure/repositories/routine.repository.js'));
    ({ EventRepository } = await import('../../infrastructure/repositories/event.repository.js'));

    userId = 'user-routine-1';
    await db.insert(usersTable).values({ id: userId, email: 'routine1@example.com', provider: 'local' }).run();
  });

  test('rutina diaria: racha de 3 días consecutivos, toggle deshace y rehace', () => {
    const service = new RoutineService(new RoutineRepository(), new EventRepository());
    const routine = service.create(userId, { title: 'Meditar', frequency: 'daily' });

    const now = new Date();
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    insertCompletion(routine.id, now);
    insertCompletion(routine.id, yesterday);
    insertCompletion(routine.id, twoDaysAgo);

    let status = service.getWithStatus(userId).find((r: any) => r.id === routine.id);
    assert.strictEqual(status.dueToday, true);
    assert.strictEqual(status.doneToday, true);
    assert.strictEqual(status.currentStreak, 3);

    // Undo: ya había evento de hoy (insertado arriba) → toggle lo borra
    const toggled = service.toggleToday(userId, routine.id);
    assert.strictEqual(toggled.doneToday, false);

    status = service.getWithStatus(userId).find((r: any) => r.id === routine.id);
    assert.strictEqual(status.doneToday, false);
    assert.strictEqual(status.currentStreak, 0); // diaria: hoy sin completar corta la racha

    // Redo: togglear de nuevo lo vuelve a marcar
    const toggledBack = service.toggleToday(userId, routine.id);
    assert.strictEqual(toggledBack.doneToday, true);
    status = service.getWithStatus(userId).find((r: any) => r.id === routine.id);
    assert.strictEqual(status.currentStreak, 3);
  });

  test('rutina semanal: solo cuenta días programados, saltando los demás sin cortar la racha', () => {
    const service = new RoutineService(new RoutineRepository(), new EventRepository());
    const todayDow = new Date().getDay();
    const routine = service.create(userId, { title: 'Ejercicio', frequency: 'weekly', weekly_days: String(todayDow) });

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    insertCompletion(routine.id, now);
    insertCompletion(routine.id, sevenDaysAgo);

    const status = service.getWithStatus(userId).find((r: any) => r.id === routine.id);
    assert.strictEqual(status.dueToday, true);
    assert.strictEqual(status.doneToday, true);
    assert.strictEqual(status.currentStreak, 2);
  });

  test('validación: frequency inválida y weekly sin weekly_days lanzan ValidationError', () => {
    const service = new RoutineService(new RoutineRepository(), new EventRepository());
    assert.throws(() => service.create(userId, { title: 'x', frequency: 'monthly' }), /inválida/);
    assert.throws(() => service.create(userId, { title: 'x', frequency: 'weekly' }), /weekly_days/);
  });

  test('toggle/update/delete de rutina ajena: NotFoundError', () => {
    const service = new RoutineService(new RoutineRepository(), new EventRepository());
    const routine = service.create(userId, { title: 'Solo mía', frequency: 'daily' });
    assert.throws(() => service.toggleToday('otro-user', routine.id), /no encontrada/i);
    assert.throws(() => service.update('otro-user', routine.id, { title: 'x' }), /no encontrada/i);
    assert.throws(() => service.delete('otro-user', routine.id), /no encontrada/i);
  });
});
