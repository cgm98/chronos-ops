import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../backend/src/app.js';
import { initDb } from '../backend/src/infrastructure/database/connection.js';
import type { Server } from 'node:http';

describe('Backend Express API (TypeScript + node:sqlite)', () => {
  let server: Server;
  let baseUrl: string;

  before(async () => {
    initDb(':memory:');
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  test('GET /api/health retorna 200 sin cabecera X-User-Id', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    assert.equal(res.status, 200);
    const body = await res.json() as any;
    assert.equal(body.ok, true);
  });

  test('GET / y rutas frontend retornan la aplicación SPA compilada', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('CHRONOS-OPS'));
  });

  test('GET /api/tasks sin cabecera X-User-Id retorna 401', async () => {
    const res = await fetch(`${baseUrl}/api/tasks`);
    assert.equal(res.status, 401);
  });

  test('CRUD completo de Tareas y aislamiento multi-usuario', async () => {
    const userA = 'user-alpha';
    const userB = 'user-beta';

    // 1. Crear tarea para User A
    const postRes = await fetch(`${baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userA },
      body: JSON.stringify({ title: 'Tarea de Alfa', priority: 'high' })
    });
    assert.equal(postRes.status, 201);
    const createdTask = await postRes.json() as any;
    assert.equal(createdTask.title, 'Tarea de Alfa');
    assert.equal(createdTask.priority, 'high');

    // 2. Listar tareas de User A -> 1 tarea
    const listResA = await fetch(`${baseUrl}/api/tasks`, {
      headers: { 'X-User-Id': userA }
    });
    const tasksA = await listResA.json() as any[];
    assert.equal(tasksA.length, 1);

    // 3. Listar tareas de User B -> 0 tareas (aislamiento estricto)
    const listResB = await fetch(`${baseUrl}/api/tasks`, {
      headers: { 'X-User-Id': userB }
    });
    const tasksB = await listResB.json() as any[];
    assert.equal(tasksB.length, 0);

    // 4. Actualizar tarea
    const putRes = await fetch(`${baseUrl}/api/tasks/${createdTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': userA },
      body: JSON.stringify({ status: 'done' })
    });
    assert.equal(putRes.status, 200);
    const updated = await putRes.json() as any;
    assert.equal(updated.status, 'done');

    // 5. KPIs reflejan la tarea completada
    const kpisRes = await fetch(`${baseUrl}/api/kpis`, {
      headers: { 'X-User-Id': userA }
    });
    const kpis = await kpisRes.json() as any;
    assert.equal(kpis.total, 1);
    assert.equal(kpis.byStatus.done, 1);
  });

  test('Rutinas: cálculo de DAG y prevención de ciclos', async () => {
    const user = 'user-dag';

    // Crear Rutina A
    const resA = await fetch(`${baseUrl}/api/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': user },
      body: JSON.stringify({ title: 'Rutina A', frequency: 'daily' })
    });
    assert.equal(resA.status, 201);
    const a = await resA.json() as any;

    // Crear Rutina B que depende de A
    const resB = await fetch(`${baseUrl}/api/routines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': user },
      body: JSON.stringify({ title: 'Rutina B', frequency: 'daily', depends_on_id: a.id })
    });
    assert.equal(resB.status, 201);
    const b = await resB.json() as any;

    // Consultar DAG
    const dagRes = await fetch(`${baseUrl}/api/routines/dag`, {
      headers: { 'X-User-Id': user }
    });
    assert.equal(dagRes.status, 200);
    const dag = await dagRes.json() as any;
    assert.equal(dag.layers.length, 2);

    // Intentar crear ciclo: Actualizar A para depender de B -> debe rechazar con 400
    const cycleRes = await fetch(`${baseUrl}/api/routines/${a.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': user },
      body: JSON.stringify({ depends_on_id: b.id })
    });
    assert.equal(cycleRes.status, 400);
  });
});
