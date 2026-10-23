import { sqlite } from '../database/connection.js';
import { randomUUID } from 'node:crypto';

export interface DomainEventRecord {
  id: string;
  kind: string;
  entity_type: string;
  entity_id: string;
  payload: string | null;
  created_at: string;
}

export class EventRepository {
  findByEntity(entityType: string, entityId: string, kind?: string): DomainEventRecord[] {
    if (kind) {
      const stmt = sqlite.prepare(`
        SELECT * FROM events
        WHERE entity_type = ? AND entity_id = ? AND kind = ?
        ORDER BY created_at ASC
      `);
      return stmt.all(entityType, entityId, kind) as DomainEventRecord[];
    }
    const stmt = sqlite.prepare(`
      SELECT * FROM events
      WHERE entity_type = ? AND entity_id = ?
      ORDER BY created_at ASC
    `);
    return stmt.all(entityType, entityId) as DomainEventRecord[];
  }

  log(kind: string, entityType: string, entityId: string, payload?: any): DomainEventRecord {
    const id = `event-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const payloadStr = payload ? JSON.stringify(payload) : null;
    const stmt = sqlite.prepare(`
      INSERT INTO events (id, kind, entity_type, entity_id, payload, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, kind, entityType, entityId, payloadStr, now);
    return { id, kind, entity_type: entityType, entity_id: entityId, payload: payloadStr, created_at: now };
  }

  deleteById(id: string): void {
    const stmt = sqlite.prepare('DELETE FROM events WHERE id = ?');
    stmt.run(id);
  }
}
