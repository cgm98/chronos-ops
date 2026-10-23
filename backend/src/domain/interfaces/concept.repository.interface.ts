export interface IConceptRepository {
  findById(conceptId: string, userId: string): { id: string } | undefined;
}
