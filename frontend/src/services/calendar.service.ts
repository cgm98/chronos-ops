import { request } from './api.client';
import type { CalendarEvent } from '../types/calendar.types';

export const CalendarService = {
  getMonth: (month: string) => request<CalendarEvent[]>(`/api/calendar?month=${encodeURIComponent(month)}`)
};
