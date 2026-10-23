import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../domain/errors.js';

export function asyncHandler(fn: (req: any, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const status = err instanceof AppError ? err.status : (err.statusCode || 500);
  if (status === 500) {
    console.error('Internal Server Error:', err);
  }
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : err.message
  });
}
