export type PlanStatus = 'draft' | 'active' | 'archived';

export interface Plan {
  id: string;
  user_id?: string;
  domain_id: string;
  title: string;
  status: PlanStatus;
  content: string;
  created_at: string;
  updated_at: string;
}
