import { RoutineRepository } from '../../infrastructure/repositories/routine.repository.js';
import { EventRepository } from '../../infrastructure/repositories/event.repository.js';
import { Routine, RoutineFrequency, RoutineWithStatus } from '../../domain/entities/routine.entity.js';
import { NotFoundError, ValidationError } from '../../domain/errors.js';
import { generateId } from '../utils.js';
import { todayLocal } from '../../lib/recurrence.js';

const FREQUENCIES: RoutineFrequency[] = ['daily', 'weekly'];
const WEEKLY_DAYS_RE = /^[0-6](,[0-6])*$/;

function validateFrequency(frequency: unknown, weeklyDays: unknown): { frequency: RoutineFrequency; weekly_days: string | null } {
  if (!FREQUENCIES.includes(frequency as RoutineFrequency)) throw new ValidationError(`frequency inválida: ${frequency}`);
  if (frequency === 'weekly') {
    if (typeof weeklyDays !== 'string' || !WEEKLY_DAYS_RE.test(weeklyDays)) {
      throw new ValidationError('weekly_days es obligatorio cuando frequency es "weekly" (formato: "1,3,5")');
    }
    return { frequency: 'weekly', weekly_days: weeklyDays };
  }
  return { frequency: 'daily', weekly_days: null };
}

const ROUTINE_COMPLETED = 'routine_completed';

export class RoutineService {
  constructor(
    private readonly routineRepo: RoutineRepository,
    private readonly eventRepo: EventRepository
  ) {}

  getAll(userId: string): Routine[] {
    return this.routineRepo.getAll(userId);
  }

  create(userId: string, data: Partial<Routine>): Routine {
    if (!data.title || !data.title.trim()) throw new ValidationError('title es obligatorio');
    if (data.depends_on_id) {
      const parent = this.routineRepo.findById(data.depends_on_id, userId);
      if (!parent) throw new ValidationError('La dependencia no existe para este usuario');
    }
    const { frequency, weekly_days } = validateFrequency(data.frequency, data.weekly_days);

    const now = new Date().toISOString();
    const newRoutine: Routine = {
      id: data.id || generateId('routine'),
      user_id: userId,
      title: data.title.trim(),
      description: data.description || null,
      frequency,
      weekly_days,
      active: data.active !== undefined ? (data.active ? 1 : 0) : 1,
      time_of_day: data.time_of_day || 'anytime',
      duration_mins: Number(data.duration_mins) || 15,
      anchor_cue: data.anchor_cue || null,
      depends_on_id: data.depends_on_id || null,
      created_at: now,
      updated_at: now
    };
    this.routineRepo.create(newRoutine);
    return newRoutine;
  }

  update(userId: string, id: string, data: Partial<Routine>): Routine {
    const existing = this.routineRepo.findById(id, userId);
    if (!existing) throw new NotFoundError('Rutina no encontrada');
    if (data.title !== undefined && !data.title.trim()) throw new ValidationError('title no puede quedar vacío');
    if (data.depends_on_id) {
      if (data.depends_on_id === id) throw new ValidationError('Una rutina no puede depender de sí misma');
      let cursor: string | null = data.depends_on_id;
      const seen = new Set<string>([id]);
      while (cursor) {
        if (seen.has(cursor)) throw new ValidationError('La dependencia crearía un ciclo');
        seen.add(cursor);
        const parent = this.routineRepo.findById(cursor, userId);
        if (!parent) throw new ValidationError('La dependencia no existe para este usuario');
        cursor = parent.depends_on_id;
      }
    }

    const { frequency, weekly_days } = data.frequency !== undefined || data.weekly_days !== undefined
      ? validateFrequency(data.frequency ?? existing.frequency, data.weekly_days ?? existing.weekly_days)
      : { frequency: existing.frequency, weekly_days: existing.weekly_days };

    const updated: Routine = {
      ...existing,
      title: data.title !== undefined ? data.title.trim() : existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      frequency,
      weekly_days,
      active: data.active !== undefined ? (data.active ? 1 : 0) : existing.active,
      time_of_day: data.time_of_day !== undefined ? data.time_of_day : (existing.time_of_day || 'anytime'),
      duration_mins: data.duration_mins !== undefined ? Number(data.duration_mins) : (existing.duration_mins || 15),
      anchor_cue: data.anchor_cue !== undefined ? data.anchor_cue : existing.anchor_cue,
      depends_on_id: data.depends_on_id !== undefined ? data.depends_on_id : existing.depends_on_id,
      updated_at: new Date().toISOString()
    };
    this.routineRepo.update(updated);
    return updated;
  }

  delete(userId: string, id: string): void {
    const existing = this.routineRepo.findById(id, userId);
    if (!existing) throw new NotFoundError('Rutina no encontrada');
    this.routineRepo.delete(id, userId);
  }

  // Togglea el cumplimiento de hoy: si ya había un evento de hoy lo borra
  // (undo), si no lo crea. La fecha se deriva de created_at con la misma
  // conversión local que todayLocal() usa para "hoy" — nunca .slice(0,10)
  // sobre el ISO en UTC (mismo cuidado que expense.service.ts/income.service.ts).
  toggleToday(userId: string, routineId: string): { doneToday: boolean } {
    const routine = this.routineRepo.findById(routineId, userId);
    if (!routine) throw new NotFoundError('Rutina no encontrada');

    const today = todayLocal();
    const events = this.eventRepo.findByEntity('routine', routineId, ROUTINE_COMPLETED);
    const todayEvent = events.find(e => todayLocal(new Date(e.created_at)) === today);

    if (todayEvent) {
      this.eventRepo.deleteById(todayEvent.id);
      return { doneToday: false };
    }
    this.eventRepo.log(ROUTINE_COMPLETED, 'routine', routineId, { date: today });
    return { doneToday: true };
  }

  getWithStatus(userId: string): RoutineWithStatus[] {
    const now = new Date();
    const today = todayLocal(now);
    const todayDow = now.getDay();

    return this.routineRepo.getAll(userId).map(routine => {
      const events = this.eventRepo.findByEntity('routine', routine.id, ROUTINE_COMPLETED);
      const completionDates = new Set(events.map(e => todayLocal(new Date(e.created_at))));
      const scheduledDays = routine.frequency === 'weekly'
        ? new Set((routine.weekly_days || '').split(',').map(Number))
        : null;

      const dueToday = scheduledDays === null || scheduledDays.has(todayDow);
      const doneToday = completionDates.has(today);
      const currentStreak = this.computeStreak(scheduledDays, completionDates);
      const recentDays = this.recentDays(completionDates, now);

      return { ...routine, dueToday, doneToday, currentStreak, recentDays };
    });
  }

  private recentDays(completionDates: Set<string>, now: Date): { date: string; done: boolean }[] {
    const days: { date: string; done: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const date = todayLocal(d);
      days.push({ date, done: completionDates.has(date) });
    }
    return days;
  }

  // Días consecutivos hacia atrás desde hoy con cumplimiento, saltando días
  // no programados (rutinas semanales) sin cortar la racha. Mismo algoritmo
  // que streakDays en client/src/composables/useReviewStudio.ts, extendido
  // para soportar "solo cuenta si el día estaba programado".
  private computeStreak(scheduledDays: Set<number> | null, completionDates: Set<string>): number {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 3650; i++) {
      const isDue = scheduledDays === null || scheduledDays.has(d.getDay());
      if (isDue) {
        if (completionDates.has(todayLocal(d))) {
          streak++;
        } else {
          break;
        }
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  getDag(userId: string): { layers: Routine[][]; sortedOrder: Routine[] } {
    const routines = this.getAll(userId);
    const byId = new Map(routines.map(r => [r.id, r]));
    const indegree = new Map(routines.map(r => [r.id, 0]));
    const children = new Map<string, string[]>(routines.map(r => [r.id, []]));

    for (const r of routines) {
      if (r.depends_on_id) {
        if (!byId.has(r.depends_on_id)) throw new ValidationError('Dependencia ausente');
        indegree.set(r.id, (indegree.get(r.id) || 0) + 1);
        children.get(r.depends_on_id)!.push(r.id);
      }
    }

    const layers: Routine[][] = [];
    let queue = routines.filter(r => (indegree.get(r.id) || 0) === 0).map(r => r.id).sort();

    while (queue.length > 0) {
      layers.push(queue.map(id => byId.get(id)!));
      const next: string[] = [];
      for (const id of queue) {
        for (const child of children.get(id) || []) {
          indegree.set(child, (indegree.get(child) || 0) - 1);
          if ((indegree.get(child) || 0) === 0) next.push(child);
        }
      }
      queue = next.sort();
    }

    if (layers.flat().length !== routines.length) {
      throw new ValidationError('El grafo contiene un ciclo');
    }
    return { layers, sortedOrder: layers.flat() };
  }
}
