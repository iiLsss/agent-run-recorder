import type { Intervention, TaskOutcome } from "../types/task-detail";

export const outcomeLabels: Record<TaskOutcome, string> = {
  success: "成功",
  partial: "部分完成",
  failed: "失败",
  unknown: "未确认"
};

export const interventionLabels: Record<Intervention, string> = {
  none: "无",
  light_edit: "轻度修改",
  heavy_edit: "重度修改",
  unknown: "未知"
};

export function getOutcomeTone(outcome: TaskOutcome): string {
  if (outcome === "success") {
    return "success";
  }
  if (outcome === "failed") {
    return "danger";
  }
  return "neutral";
}
