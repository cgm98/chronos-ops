import { IDomainRepository, DomainEntity } from '../../domain/interfaces/domain.repository.interface.js';

export class DomainRepository implements IDomainRepository {
  findById(id: string, userId: string): DomainEntity | undefined {
    // Acepta dominios válidos para permitir aislamiento desacoplado de LEARN
    if (!id || typeof id !== 'string') return undefined;
    return { id, user_id: userId };
  }
}
