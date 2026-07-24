import type { DifficultyBucket, InterventionLevel, RunResult } from "../types/run";

export const resultLabels: Record<RunResult, string> = {
  success: "成功",
  partial: "部分完成",
  failed: "失败",
  cancelled: "已取消",
  unknown: "未评价"
};

export const interventionLabels: Record<InterventionLevel, string> = {
  none: "无",
  light_edit: "轻度",
  heavy_edit: "重度",
  takeover: "接管",
  unknown: "未知"
};

const difficultyLabels: Record<DifficultyBucket, string> = {
  low: "低",
  medium: "中",
  high: "高",
  unknown: "未知"
};

export function formatDifficulty(difficulty: DifficultyBucket, score?: number): string {
  const label = difficultyLabels[difficulty];
  return score ? `${label} · ${score}` : label;
}
