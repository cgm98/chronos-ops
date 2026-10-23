export type RoutineFrequency = 'daily' | 'weekly';

export interface Routine {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  frequency: RoutineFrequency;
  weekly_days: string | null;
  active: number;
  time_of_day: string;
  duration_mins: number;
  anchor_cue: string | null;
  depends_on_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoutineWithStatus extends Routine {
  dueToday: boolean;
  doneToday: boolean;
  currentStreak: number;
  recentDays: { date: string; done: boolean }[];
}
