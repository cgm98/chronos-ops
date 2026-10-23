import { Response } from 'express';
import { calendarService } from '../di/container.js';
import { asyncHandler } from '../http/middlewares/error-handler.js';
import { AuthRequest } from '../http/middlewares/auth.middleware.js';
import { ValidationError } from '../../domain/errors.js';

export class CalendarController {
  static getMonth = asyncHandler(async (req: AuthRequest, res: Response) => {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    if (!month) throw new ValidationError('month es obligatorio (formato YYYY-MM)');
    res.json(calendarService.getMonth(req.user!.userId, month));
  });
}
