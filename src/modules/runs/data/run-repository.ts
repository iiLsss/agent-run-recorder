import { runTimelineFixtures } from "./run-fixtures";
import type { RunTimelineRecord } from "../types/run";
import {
  isDesktopRuntime,
  listRecordedRuns,
  type RecordedRun
} from "../../../app/runtime/recorder-client";

export function listRunTimelineRecords(): RunTimelineRecord[] {
  return isDesktopRuntime() ? [] : [...runTimelineFixtures];
}

export async function loadRecordedRunTimeline(): Promise<RunTimelineRecord[] | null> {
  const runs = await listRecordedRuns();
  return runs?.map(toTimelineRecord) ?? null;
}

function toTimelineRecord(run: RecordedRun): RunTimelineRecord {
  return {
    id: run.runId,
    startedAt: run.startedAt,
    displayTime: formatDisplayTime(run.startedAt),
    agent: agentLabel(run.agentId),
    model: run.modelId || "未知",
    modelDetail: run.sourceTier === "experimental" ? "实验采集" : run.sourceTier,
    taskTitle: "未关联 Task",
    taskLinked: false,
    category: "未知",
    difficulty: "unknown",
    result: resultFromSource(run.sourceExecutionStatus),
    intervention: "unknown",
    duration: formatDuration(run.startedAt, run.endedAt),
    tokens: formatTokens(run.tokenInput, run.tokenOutput)
  };
}

function formatDisplayTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "未知"
    : new Intl.DateTimeFormat("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(date);
}

function formatDuration(startedAt: string, endedAt: string | null): string {
  if (!endedAt) {
    return "进行中";
  }
  const milliseconds = new Date(endedAt).valueOf() - new Date(startedAt).valueOf();
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return "未知";
  }
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function formatTokens(input: number | null, output: number | null): string | null {
  if (input === null && output === null) {
    return null;
  }
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(
    (input ?? 0) + (output ?? 0)
  );
}

function resultFromSource(status: string): RunTimelineRecord["result"] {
  if (status === "succeeded") return "success";
  if (status === "failed") return "failed";
  if (status === "cancelled") return "cancelled";
  return "unknown";
}

function agentLabel(agentId: string): string {
  return (
    {
      codex: "Codex",
      "claude-code": "Claude Code",
      "gemini-cli": "Gemini CLI",
      opencode: "OpenCode"
    }[agentId] ?? agentId
  );
}
