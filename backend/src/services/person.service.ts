export class PersonService {
  constructor(private repo: any) {}
  create(userId: string, data: any) {
    const item = { id: `person-${Math.random()}`, user_id: userId, ...data };
    this.repo.create(item);
    return item;
  }
}
