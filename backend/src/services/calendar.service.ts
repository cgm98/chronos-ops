import { TaskRepository } from '../../infrastructure/repositories/task.repository.js';
import { CodeReviewRepository } from '../../infrastructure/repositories/code-review.repository.js';
import { RecurringRepository } from '../../infrastructure/repositories/recurring.repository.js';
import { RoutineRepository } from '../../infrastructure/repositories/routine.repository.js';
import { PersonRepository } from '../../infrastructure/repositories/person.repository.js';
import { PersonImportantDateRepository } from '../../infrastructure/repositories/person-important-date.repository.js';
import { PersonFollowUpRepository } from '../../infrastructure/repositories/person-follow-up.repository.js';
import { ValidationError } from '../../domain/errors.js';
import { occurrenceInMonth } from '../../lib/recurrence.js';

const MONTH_RE = /^\d{4}-\d{2}$/;

export type CalendarEventType =
  | 'task' | 'recurring_bill' | 'routine' | 'birthday' | 'important_date' | 'follow_up' | 'code_review';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  sourceId: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

// Agrega, sin tablas nuevas, todo lo que ya vive repartido en Finanzas,
// Contactos y Tareas/Rutinas — la "última pieza" del grafo de vida: nunca
// se veía junto en ningún lado hasta este endpoint.
export class CalendarService {
  constructor(
    private readonly taskRepo: TaskRepository,
    private readonly codeReviewRepo: CodeReviewRepository,
    private readonly recurringRepo: RecurringRepository,
    private readonly routineRepo: RoutineRepository,
    private readonly personRepo: PersonRepository,
    private readonly importantDateRepo: PersonImportantDateRepository,
    private readonly followUpRepo: PersonFollowUpRepository
  ) {}

  getMonth(userId: string, month: string): CalendarEvent[] {
    if (!MONTH_RE.test(month)) throw new ValidationError(`month inválido: ${month} (formato YYYY-MM)`);
    const [year, monthNum] = month.split('-').map(Number);
    const events: CalendarEvent[] = [];

    // --- Tareas ---
    for (const t of this.taskRepo.getAll(userId)) {
      if (t.due_date && t.due_date.startsWith(month)) {
        events.push({ date: t.due_date, type: 'task', title: t.title, sourceId: t.id });
      }
    }

    // --- Code reviews ---
    for (const r of this.codeReviewRepo.getAll(userId)) {
      if (r.due_date && r.due_date.startsWith(month)) {
        events.push({ date: r.due_date, type: 'code_review', title: r.title, sourceId: r.id });
      }
    }

    // --- Recurrentes de Finanzas ---
    for (const item of this.recurringRepo.getAll(userId)) {
      if (!item.active) continue;
      const date = occurrenceInMonth(item.day_of_month, year, monthNum - 1);
      events.push({ date, type: 'recurring_bill', title: item.name, sourceId: item.id });
    }

    // --- Rutinas: un evento por cada día programado del mes ---
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    for (const routine of this.routineRepo.getAll(userId)) {
      if (!routine.active) continue;
      const scheduledDays = routine.frequency === 'weekly'
        ? new Set((routine.weekly_days || '').split(',').map(Number))
        : null;
      for (let day = 1; day <= daysInMonth; day++) {
        const dow = new Date(year, monthNum - 1, day).getDay();
        if (scheduledDays === null || scheduledDays.has(dow)) {
          events.push({ date: `${year}-${pad(monthNum)}-${pad(day)}`, type: 'routine', title: routine.title, sourceId: routine.id });
        }
      }
    }

    // --- Personas: cumpleaños y fechas importantes (recurrencia anual por mes-día) ---
    const people = this.personRepo.getAll(userId);
    const peopleById = new Map(people.map(p => [p.id, p]));

    for (const p of people) {
      if (!p.birthday) continue;
      const [, bm, bd] = p.birthday.split('-').map(Number);
      if (bm === monthNum) {
        events.push({ date: `${year}-${pad(monthNum)}-${pad(bd)}`, type: 'birthday', title: `Cumpleaños de ${p.name}`, sourceId: p.id });
      }
    }

    for (const d of this.importantDateRepo.findAllForUser(userId)) {
      const [, dm, dd] = d.date.split('-').map(Number);
      if (dm === monthNum) {
        const personName = peopleById.get(d.person_id)?.name || '?';
        // sourceId = person_id (no el id de la fila): permite abrir PersonModal
        // al clickear, mismo criterio que birthday.
        events.push({ date: `${year}-${pad(monthNum)}-${pad(dd)}`, type: 'important_date', title: `${d.label} (${personName})`, sourceId: d.person_id });
      }
    }

    // --- Seguimientos pendientes ---
    for (const f of this.followUpRepo.findAllForUser(userId)) {
      if (f.done || !f.due_date || !f.due_date.startsWith(month)) continue;
      const personName = peopleById.get(f.person_id)?.name || '?';
      events.push({ date: f.due_date, type: 'follow_up', title: `${personName}: ${f.description}`, sourceId: f.person_id });
    }

    return events.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  }
}
