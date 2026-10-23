import { IReviewRepository } from '../../domain/interfaces/review.repository.interface.js';
import { Review, DueQueueItem, DueCounts } from '../../domain/entities/review.entity.js';

export class ReviewRepository implements IReviewRepository {
  getDueQueue(userId: string): DueQueueItem[] {
    return [];
  }
  getDueCounts(userId: string): DueCounts {
    return { total: 0, dueToday: 0 };
  }
  create(review: Review): void {}
}
