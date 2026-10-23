export class RecurringService {
  constructor(private repo: any, private eventRepo?: any) {}
  create(userId: string, data: any) {
    const item = { id: `rec-${Math.random()}`, user_id: userId, active: 1, ...data };
    this.repo.create(item);
    return item;
  }
}
