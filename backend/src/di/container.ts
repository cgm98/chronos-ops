import { TaskRepository } from '../infrastructure/repositories/task.repository.js';
import { RoutineRepository } from '../infrastructure/repositories/routine.repository.js';
import { EventRepository } from '../infrastructure/repositories/event.repository.js';
import { PlanRepository } from '../infrastructure/repositories/plan.repository.js';
import { PlanVersionRepository } from '../infrastructure/repositories/plan-version.repository.js';
import { DomainRepository } from '../infrastructure/repositories/domain.repository.js';
import { CodeReviewRepository } from '../infrastructure/repositories/code-review.repository.js';
import { RecurringRepository } from '../infrastructure/repositories/recurring.repository.js';
import { PersonRepository } from '../infrastructure/repositories/person.repository.js';
import { PersonImportantDateRepository } from '../infrastructure/repositories/person-important-date.repository.js';
import { PersonFollowUpRepository } from '../infrastructure/repositories/person-follow-up.repository.js';
import { ReviewRepository } from '../infrastructure/repositories/review.repository.js';
import { QuestionRepository } from '../infrastructure/repositories/question.repository.js';
import { ConceptRepository } from '../infrastructure/repositories/concept.repository.js';

import { TaskService } from '../services/task.service.js';
import { RoutineService } from '../services/routine.service.js';
import { PlanService } from '../services/plan.service.js';
import { CalendarService } from '../services/calendar.service.js';
import { TaskKpiService } from '../services/task-kpi.service.js';
import { ReviewService } from '../services/review.service.js';
import { QuestionEngine } from '../services/question.engine.js';

// Repositorios
export const taskRepo = new TaskRepository();
export const routineRepo = new RoutineRepository();
export const eventRepo = new EventRepository();
export const planRepo = new PlanRepository();
export const planVersionRepo = new PlanVersionRepository();
export const domainRepo = new DomainRepository();

export const codeReviewRepo = new CodeReviewRepository();
export const recurringRepo = new RecurringRepository();
export const personRepo = new PersonRepository();
export const personImportantDateRepo = new PersonImportantDateRepository();
export const personFollowUpRepo = new PersonFollowUpRepository();

export const reviewRepo = new ReviewRepository();
export const questionRepo = new QuestionRepository();
export const conceptRepo = new ConceptRepository();
export const questionEngine = new QuestionEngine();

// Servicios
export const taskService = new TaskService(taskRepo);
export const routineService = new RoutineService(routineRepo, eventRepo);
export const planService = new PlanService(planRepo, planVersionRepo, domainRepo);
export const calendarService = new CalendarService(
  taskRepo,
  codeReviewRepo,
  recurringRepo,
  routineRepo,
  personRepo,
  personImportantDateRepo,
  personFollowUpRepo
);
export const taskKpiService = new TaskKpiService(taskRepo);
export const reviewService = new ReviewService(reviewRepo, questionRepo, questionEngine, conceptRepo);
