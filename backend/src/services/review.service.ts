import { Review, DueQueueItem, DueCounts } from '../../domain/entities/review.entity.js';
import { IReviewRepository } from '../../domain/interfaces/review.repository.interface.js';
import { IQuestionRepository } from '../../domain/interfaces/question.repository.interface.js';
import { IConceptRepository } from '../../domain/interfaces/concept.repository.interface.js';
import { generateId } from '../utils.js';
import { eventBus } from '../../domain/events.js';
import { NotFoundError } from '../../domain/errors.js';
import { QuestionEngine } from './question.engine.js';

export class ReviewService {
  constructor(
    private readonly reviewRepository: IReviewRepository,
    private readonly questionRepository: IQuestionRepository,
    private readonly questionEngine: QuestionEngine,
    private readonly conceptRepository: IConceptRepository
  ) {}

  getDueQueue(userId: string): DueQueueItem[] {
    return this.reviewRepository.getDueQueue(userId);
  }

  getDueCounts(userId: string): DueCounts {
    return this.reviewRepository.getDueCounts(userId);
  }

  create(data: Partial<Review>, userId: string): Review {
    const id = generateId('rev');
    const now = new Date().toISOString();
    const concept_id = data.concept_id!;

    if (!this.conceptRepository.findById(concept_id, userId)) {
      throw new NotFoundError('Concepto no encontrado');
    }

    let question_id = data.question_id;

    if (question_id) {
      const qList = this.questionRepository.getForConcept(concept_id, userId);
      const qExists = qList.find(q => q.id === question_id);
      if (!qExists) {
        question_id = undefined;
      }
    }

    if (!question_id) {
      const existingQuestions = this.questionRepository.getForConcept(concept_id, userId);
      if (existingQuestions.length > 0) {
        question_id = existingQuestions[0].id;
      } else {
        const list = this.questionEngine.generateForConcept(concept_id, userId);
        if (list.length > 0) {
          question_id = list[0].id;
        } else {
          const fallbackId = generateId('q-fb');
          this.questionRepository.create({
            id: fallbackId,
            concept_id,
            question_type: 'definition',
            prompt: 'Pregunta de repaso de definición',
            answer: null,
            difficulty: 3,
            created_at: now
          });
          question_id = fallbackId;
        }
      }
    }

    const review: Review = {
      id,
      concept_id,
      question_id,
      score: Number(data.score),
      latency_ms: Number(data.latency_ms),
      error_type: data.error_type || null,
      created_at: now
    };

    this.reviewRepository.createReview(review);

    eventBus.emit('review.completed', {
      id,
      timestamp: now,
      data: { ...review, entityType: 'review' }
    });

    return review;
  }
}
