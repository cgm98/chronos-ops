import { Response } from 'express';
import { routineService } from '../di/container.js';
import { asyncHandler } from '../http/middlewares/error-handler.js';
import { AuthRequest } from '../http/middlewares/auth.middleware.js';

export class RoutineController {
  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(routineService.getWithStatus(req.user!.userId));
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(201).json(routineService.create(req.user!.userId, req.body));
  });

  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(routineService.update(req.user!.userId, req.params.id, req.body));
  });

  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    routineService.delete(req.user!.userId, req.params.id);
    res.json({ success: true });
  });

  static toggleToday = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(routineService.toggleToday(req.user!.userId, req.params.id));
  });

  static getDag = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(routineService.getDag(req.user!.userId));
  });
}
