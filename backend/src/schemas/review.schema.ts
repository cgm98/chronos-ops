import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { concepts } from './concept.schema.js';

export const questions = sqliteTable('questions', {
  id: text('id').primaryKey(),
  concept_id: text('concept_id').notNull().references(() => concepts.id, { onDelete: 'cascade' }),
  question_type: text('question_type').notNull(), // definition, analogy, etc.
  prompt: text('prompt').notNull(),
  answer: text('answer'),
  difficulty: integer('difficulty').default(3),
  created_at: text('created_at').notNull()
});

export const reviews = sqliteTable('reviews', {
  id: text('id').primaryKey(),
  concept_id: text('concept_id').notNull().references(() => concepts.id, { onDelete: 'cascade' }),
  question_id: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  latency_ms: integer('latency_ms').notNull(),
  error_type: text('error_type'), // omission, commission, partial, none
  created_at: text('created_at').notNull()
});
