import { Router } from 'express';
import { TaskController } from '../../controllers/task.controller.js';
import { RoutineController } from '../../controllers/routine.controller.js';
import { PlanController } from '../../controllers/plan.controller.js';
import { CalendarController } from '../../controllers/calendar.controller.js';
import { TaskKpiController } from '../../controllers/task-kpi.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

export const apiRouter = Router();

// Health check público (sin auth)
apiRouter.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Middleware de autenticación/espacio de usuario obligatorio para el resto de rutas
apiRouter.use(authMiddleware);

// Rutas de Tareas
apiRouter.get('/tasks', TaskController.getAll);
apiRouter.post('/tasks', TaskController.create);
apiRouter.get('/tasks/:id', TaskController.getById);
apiRouter.put('/tasks/:id', TaskController.update);
apiRouter.delete('/tasks/:id', TaskController.delete);

// Rutas de Rutinas
apiRouter.get('/routines', RoutineController.getAll);
apiRouter.get('/routines/dag', RoutineController.getDag);
apiRouter.post('/routines', RoutineController.create);
apiRouter.put('/routines/:id', RoutineController.update);
apiRouter.delete('/routines/:id', RoutineController.delete);
apiRouter.post('/routines/:id/toggle', RoutineController.toggleToday);

// Rutas de Planes
apiRouter.get('/plans', PlanController.getByDomain);
apiRouter.post('/plans', PlanController.create);
apiRouter.get('/plans/:id', PlanController.getById);
apiRouter.put('/plans/:id', PlanController.update);
apiRouter.delete('/plans/:id', PlanController.delete);
apiRouter.get('/plans/:id/versions', PlanController.getVersions);
apiRouter.get('/plans/:id/versions/:versionId', PlanController.getVersion);
apiRouter.post('/plans/:id/versions/:versionId/restore', PlanController.restoreVersion);

// Rutas de Calendario y KPIs
apiRouter.get('/calendar', CalendarController.getMonth);
apiRouter.get('/kpis', TaskKpiController.get);
