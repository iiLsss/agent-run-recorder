export type ReviewOutcome = "success" | "partial" | "failed" | "cancelled";
export type ReviewIntervention = "none" | "light_edit" | "heavy_edit" | "takeover";
export type ReviewDifficulty = "unknown" | "low" | "medium" | "high";

export interface ClassificationReview {
  category: string;
  preRunDifficulty: string;
}

export interface ReviewRecord {
  id: string;
  scope: "run" | "task";
  agentConfiguration: string;
  taskTitle: string;
  meta: string;
  time: string;
  suggestion?: string;
  classificationReview?: ClassificationReview;
}

export interface ReviewState {
  outcome?: ReviewOutcome;
  intervention?: ReviewIntervention;
  submitted: boolean;
  skipped: boolean;
  category?: string;
  postHocConfirmedDifficulty?: ReviewDifficulty;
}
