import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { domains } from './domain.schema.js';

export const plans = sqliteTable('plans', {
  id: text('id').primaryKey(),
  domain_id: text('domain_id').notNull().references(() => domains.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),
  content: text('content').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull()
});

export const plan_versions = sqliteTable('plan_versions', {
  id: text('id').primaryKey(),
  plan_id: text('plan_id').notNull().references(() => plans.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull(),
  created_at: text('created_at').notNull()
});
