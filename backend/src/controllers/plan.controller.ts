import { Response } from 'express';
import { planService } from '../di/container.js';
import { asyncHandler } from '../http/middlewares/error-handler.js';
import { NotFoundError, ValidationError } from '../../domain/errors.js';
import { AuthRequest } from '../http/middlewares/auth.middleware.js';

export class PlanController {
  static getByDomain = asyncHandler(async (req: AuthRequest, res: Response) => {
    const domainId = req.query.domainId as string | undefined;
    if (!domainId) {
      throw new ValidationError('domainId es requerido');
    }
    res.json(planService.getByDomain(domainId, req.user!.userId));
  });

  static getById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const item = planService.getById(req.params.id, req.user!.userId);
    if (!item) {
      throw new NotFoundError('Plan no encontrado');
    }
    res.json(item);
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(201).json(planService.create(req.body, req.user!.userId));
  });

  static update = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(planService.update(req.params.id, req.body, req.user!.userId));
  });

  static delete = asyncHandler(async (req: AuthRequest, res: Response) => {
    planService.delete(req.params.id, req.user!.userId);
    res.json({ success: true });
  });

  static getVersions = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(planService.getVersions(req.params.id, req.user!.userId));
  });

  static getVersion = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(planService.getVersion(req.params.id, req.params.versionId, req.user!.userId));
  });

  static restoreVersion = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(planService.restoreVersion(req.params.id, req.params.versionId, req.user!.userId));
  });
}
