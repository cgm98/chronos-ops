import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
  };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.headers['x-user-id'];
  if (!userId || typeof userId !== 'string' || !/^[A-Za-z0-9._:@/-]{1,128}$/.test(userId)) {
    return next(new AppError('Cabecera X-User-Id es obligatoria para aislar el contexto de datos', 401));
  }
  req.user = { userId };
  next();
}
