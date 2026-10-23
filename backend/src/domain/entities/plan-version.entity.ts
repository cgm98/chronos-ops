export const PLAN_SNAPSHOT_WINDOW_MS = 15 * 60 * 1000;

export interface PlanVersion {
  id: string;
  plan_id: string;
  title: string;
  content: string;
  created_at: string;
}

export interface PlanVersionSummary {
  id: string;
  plan_id: string;
  title: string;
  created_at: string;
}
