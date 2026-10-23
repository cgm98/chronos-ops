export class PersonRepository {
  private static items: any[] = [];

  create(item: any): void {
    PersonRepository.items.push(item);
  }

  getAll(userId: string): any[] {
    return PersonRepository.items.filter(i => i.user_id === userId);
  }
}
