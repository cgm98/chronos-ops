import { IQuestionRepository } from '../../domain/interfaces/question.repository.interface.js';

export class QuestionRepository implements IQuestionRepository {
  getForConcept(conceptId: string, userId: string): { id: string }[] {
    return [];
  }
}
