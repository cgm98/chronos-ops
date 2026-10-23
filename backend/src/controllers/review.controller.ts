import { Response } from 'express';
import { reviewService } from '../di/container.js';
import { asyncHandler } from '../http/middlewares/error-handler.js';
import { AuthRequest } from '../http/middlewares/auth.middleware.js';

export class ReviewController {
  static getDueQueue = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(reviewService.getDueQueue(req.user!.userId));
  });

  static getDueCounts = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json(reviewService.getDueCounts(req.user!.userId));
  });

  static create = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(201).json(reviewService.create(req.body, req.user!.userId));
  });
}
