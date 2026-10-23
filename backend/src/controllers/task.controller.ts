import { Response } from 'express';
import { taskService } from '../di/container.js';
import { asyncHandler } from '../http/middlewares/error-handler.js';
import { NotFoundError } from '../../domain/errors.js';
import { AuthRequest } from '../http/middlewares/auth.middleware.js';

export class TaskController {
  static getAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(taskService.getAll(req.user!.userId));
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = taskService.getById(req.params.id, req.user!.userId);
    if (!item) {
      throw new NotFoundError('Tarea no encontrada');
    }
    res.json(item);
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(201).json(taskService.create(req.body, req.user!.userId));
  });

  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(taskService.update(req.params.id, req.body, req.user!.userId));
  });

  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    taskService.delete(req.params.id, req.user!.userId);
    res.json({ success: true });
  });
}
