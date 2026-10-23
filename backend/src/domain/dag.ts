import { AppError } from './errors.js';
import { Routine } from './entities/routine.entity.js';

export function localDate(date: Date = new Date(), timeZone: string = process.env.TZ || 'America/Lima'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

export function routineOrder(routines: Routine[]): { layers: Routine[][]; sortedOrder: Routine[] } {
  const byId = new Map(routines.map(r => [r.id, r]));
  const indegree = new Map(routines.map(r => [r.id, 0]));
  const children = new Map<string, string[]>(routines.map(r => [r.id, []]));

  for (const r of routines) {
    if (r.depends_on_id) {
      if (!byId.has(r.depends_on_id)) throw new AppError('Dependencia ausente');
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
    throw new AppError('El grafo contiene un ciclo');
  }
  return { layers, sortedOrder: layers.flat() };
}
