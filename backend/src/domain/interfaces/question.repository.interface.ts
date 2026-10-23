export interface IQuestionRepository {
  getForConcept(conceptId: string, userId: string): { id: string }[];
}
