import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Hábito recurrente — separado de `tasks` a propósito (mismo criterio que
// RecurringItem vive separado de Expense en Finanzas): una tarea puntual y
// un hábito que se repite son conceptos distintos.
export const routines = sqliteTable('routines', {
  id: text('id').primaryKey(),
  user_id: text('user_id'),
  title: text('title').notNull(),
  description: text('description'),
  frequency: text('frequency').notNull(), // 'daily' | 'weekly'
  weekly_days: text('weekly_days'), // "1,3,5" (0=domingo..6=sábado) — solo si frequency='weekly'
  active: integer('active').notNull().default(1),
  time_of_day: text('time_of_day').notNull().default('anytime'),
  duration_mins: integer('duration_mins').notNull().default(15),
  anchor_cue: text('anchor_cue'),
  depends_on_id: text('depends_on_id'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull()
});

