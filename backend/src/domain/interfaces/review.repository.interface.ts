import { Review, DueQueueItem, DueCounts } from '../entities/review.entity.js';

export interface IReviewRepository {
  getDueQueue(userId: string): DueQueueItem[];
  getDueCounts(userId: string): DueCounts;
  create(review: Review): void;
}
