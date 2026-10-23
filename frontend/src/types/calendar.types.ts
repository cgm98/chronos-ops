export type CalendarEventType =
  | 'task' | 'recurring_bill' | 'routine' | 'birthday' | 'important_date' | 'follow_up' | 'code_review';

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  sourceId: string;
}
