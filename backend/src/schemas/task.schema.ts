import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { people } from './person.schema.js';
import { projects } from './project.schema.js';

export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  user_id: text('user_id'),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').notNull().default('todo'),
  priority: text('priority').notNull().default('medium'),
  assignee_id: text('assignee_id').references(() => people.id, { onDelete: 'set null' }),
  project_id: text('project_id').references(() => projects.id, { onDelete: 'set null' }),
  due_date: text('due_date'),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull()
});
