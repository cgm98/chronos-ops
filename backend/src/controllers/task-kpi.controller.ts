import { Response } from 'express';
import { taskKpiService } from '../di/container.js';
import { asyncHandler } from '../http/middlewares/error-handler.js';
import { AuthRequest } from '../http/middlewares/auth.middleware.js';

export class TaskKpiController {
  static get = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(taskKpiService.getKpis(req.user!.userId));
  });
}
