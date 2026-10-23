export interface DomainEntity {
  id: string;
  user_id: string;
}

export interface IDomainRepository {
  findById(id: string, userId: string): DomainEntity | undefined;
}
