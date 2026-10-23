import { IConceptRepository } from '../../domain/interfaces/concept.repository.interface.js';

export class ConceptRepository implements IConceptRepository {
  findById(conceptId: string, userId: string): { id: string } | undefined {
    return { id: conceptId };
  }
}
