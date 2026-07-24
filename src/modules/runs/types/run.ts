export const runResults = [
  "success",
  "partial",
  "failed",
  "cancelled",
  "unknown"
] as const;

export type RunResult = (typeof runResults)[number];

export const difficultyBuckets = ["low", "medium", "high", "unknown"] as const;

export type DifficultyBucket = (typeof difficultyBuckets)[number];

export const interventionLevels = [
  "none",
  "light_edit",
  "heavy_edit",
  "takeover",
  "unknown"
] as const;

export type InterventionLevel = (typeof interventionLevels)[number];

export interface RunTimelineRecord {
  id: string;
  startedAt: string;
  displayTime: string;
  agent: string;
  model: string;
  modelDetail?: string;
  taskTitle: string;
  taskLinked?: boolean;
  category: string;
  difficulty: DifficultyBucket;
  difficultyScore?: number;
  result: RunResult;
  intervention: InterventionLevel;
  duration: string;
  tokens: string | null;
}

export interface RunFilterCriteria {
  query: string;
  agent: string;
  model: string;
  category: string;
  difficulty: DifficultyBucket | "all";
  result: RunResult | "all";
  intervention: InterventionLevel | "all";
}
