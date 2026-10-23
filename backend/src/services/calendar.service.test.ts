import { test, describe, before } from 'node:test';
import assert from 'node:assert';

process.env.DB_PATH = ':memory:';

describe('CalendarService.getMonth (Fase 1: agrega Finanzas + Contactos + Tareas/Rutinas)', () => {
  let db: any;
  let usersTable: any;
  let CalendarService: any;
  let TaskRepository: any, TaskService: any;
  let CodeReviewRepository: any;
  let RecurringRepository: any, RecurringService: any, EventRepository: any;
  let RoutineRepository: any, RoutineService: any;
  let PersonRepository: any, PersonService: any;
  let PersonImportantDateRepository: any;
  let PersonFollowUpRepository: any;
  let userId: string;
  let month: string;
  let year: number, monthNum: number;

  before(async () => {
    const connection = await import('../../infrastructure/database/connection.js');
    connection.initDb();
    db = connection.db;

    const schema = await import('../../infrastructure/database/schemas/auth.schema.js');
    usersTable = schema.usersTable;

    ({ CalendarService } = await import('./calendar.service.js'));
    ({ TaskRepository } = await import('../../infrastructure/repositories/task.repository.js'));
    ({ TaskService } = await import('./task.service.js'));
    ({ CodeReviewRepository } = await import('../../infrastructure/repositories/code-review.repository.js'));
    ({ RecurringRepository } = await import('../../infrastructure/repositories/recurring.repository.js'));
    ({ RecurringService } = await import('./recurring.service.js'));
    ({ EventRepository } = await import('../../infrastructure/repositories/event.repository.js'));
    ({ RoutineRepository } = await import('../../infrastructure/repositories/routine.repository.js'));
    ({ RoutineService } = await import('./routine.service.js'));
    ({ PersonRepository } = await import('../../infrastructure/repositories/person.repository.js'));
    ({ PersonService } = await import('./person.service.js'));
    ({ PersonImportantDateRepository } = await import('../../infrastructure/repositories/person-important-date.repository.js'));
    ({ PersonFollowUpRepository } = await import('../../infrastructure/repositories/person-follow-up.repository.js'));

    userId = 'user-calendar-1';
    await db.insert(usersTable).values({ id: userId, email: 'calendar1@example.com', provider: 'local' }).run();

    const now = new Date();
    year = now.getFullYear();
    monthNum = now.getMonth() + 1;
    month = `${year}-${String(monthNum).padStart(2, '0')}`;
  });

  test('agrega tarea, recurrente, rutina diaria y cumpleaños del mes consultado', () => {
    const day15 = `${month}-15`;

    const taskService = new TaskService(new TaskRepository());
    taskService.create({ title: 'Entregar informe', due_date: day15 }, userId);

    const recurringService = new RecurringService(new RecurringRepository(), new EventRepository());
    recurringService.create(userId, { name: 'Netflix', amount: 30, day_of_month: 15, type: 'subscription' });

    const routineService = new RoutineService(new RoutineRepository(), new EventRepository());
    routineService.create(userId, { title: 'Meditar', frequency: 'daily' });

    const personService = new PersonService(new PersonRepository());
    personService.create(userId, { name: 'Ana', birthday: `1990-${String(monthNum).padStart(2, '0')}-20` });

    const service = new CalendarService(
      new TaskRepository(), new CodeReviewRepository(), new RecurringRepository(), new RoutineRepository(),
      new PersonRepository(), new PersonImportantDateRepository(), new PersonFollowUpRepository()
    );
    const events = service.getMonth(userId, month);

    const task = events.find((e: any) => e.type === 'task');
    assert.ok(task, 'debe incluir la tarea');
    assert.strictEqual(task.date, day15);
    assert.strictEqual(task.title, 'Entregar informe');

    const recurring = events.find((e: any) => e.type === 'recurring_bill');
    assert.ok(recurring, 'debe incluir el recurrente');
    assert.strictEqual(recurring.date, day15);

    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const routineEvents = events.filter((e: any) => e.type === 'routine');
    assert.strictEqual(routineEvents.length, daysInMonth, 'rutina diaria: un evento por cada día del mes');

    const birthday = events.find((e: any) => e.type === 'birthday');
    assert.ok(birthday, 'debe incluir el cumpleaños');
    assert.strictEqual(birthday.date, `${month}-20`);
    assert.strictEqual(birthday.title, 'Cumpleaños de Ana');
  });

  test('month inválido lanza ValidationError', () => {
    const service = new CalendarService(
      new TaskRepository(), new CodeReviewRepository(), new RecurringRepository(), new RoutineRepository(),
      new PersonRepository(), new PersonImportantDateRepository(), new PersonFollowUpRepository()
    );
    assert.throws(() => service.getMonth(userId, '2026/07'), /inválido/);
  });
});
