export type TaskOutcome = "success" | "partial" | "failed" | "unknown";
export type Intervention = "none" | "light_edit" | "heavy_edit" | "unknown";

export interface TaskObservation {
  id: string;
  agentConfiguration: string;
  status: string;
  finalOutcome: TaskOutcome;
  firstAttemptOutcome: TaskOutcome;
  retryCount: number;
  maxIntervention: Intervention;
  duration: string;
  tokens: string;
  runSummary: string;
}

export interface TaskRun {
  id: string;
  label: string;
  boundary: string;
  evaluation: string;
  events: RunEvent[];
  evidence: EvidenceReference[];
}

export interface RunEvent {
  type: string;
  target: string;
  duration: string;
  status?: "success" | "failed";
}

export interface EvidenceReference {
  type: "test" | "artifact" | "git";
  reference: string;
  status: string;
  tone: "success" | "danger" | "neutral";
}

export interface TaskDetail {
  id: string;
  category: string;
  categorySource: string;
  difficulty: string;
  observations: TaskObservation[];
  runs: TaskRun[];
}
