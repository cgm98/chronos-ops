export interface Review {
  id: string;
  user_id: string;
  concept_id: string;
  question_id?: string;
  created_at: string;
}

export interface DueQueueItem {
  id: string;
  concept_id: string;
  question_id: string;
  due_date: string;
}

export interface DueCounts {
  total: number;
  dueToday: number;
}
