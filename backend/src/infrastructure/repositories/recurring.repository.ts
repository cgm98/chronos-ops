export class RecurringRepository {
  private static items: any[] = [];

  create(item: any): void {
    RecurringRepository.items.push(item);
  }

  getAll(userId: string): any[] {
    return RecurringRepository.items.filter(i => i.user_id === userId);
  }
}
