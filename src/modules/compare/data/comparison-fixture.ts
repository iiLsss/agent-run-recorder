import type { ComparisonFixture } from "../types/comparison";

export const comparisonFixture: ComparisonFixture = {
  configurations: [
    {
      id: "claude-sonnet",
      label: "Claude Code · Sonnet 4.5",
      version: "agentVersionGroup v2026.4",
      tier: "完整采集档"
    },
    {
      id: "codex-gpt",
      label: "Codex · GPT-5.2",
      version: "v5.2-stable",
      tier: "完整采集档"
    }
  ],
  metrics: [
    {
      id: "first-attempt",
      label: "首试成功率",
      configurationA: "58% · 7/12",
      configurationB: "67% · 10/15",
      unknown: "2 / 1"
    },
    {
      id: "final-success",
      label: "配置最终成功率",
      configurationA: "75% · 9/12",
      configurationB: "80% · 12/15",
      unknown: "1 / 1",
      primary: true
    },
    {
      id: "partial",
      label: "部分完成率",
      configurationA: "8% · 1/12",
      configurationB: "13% · 2/15",
      unknown: "1 / 1"
    },
    {
      id: "failed",
      label: "失败率",
      configurationA: "17% · 2/12",
      configurationB: "7% · 1/15",
      unknown: "1 / 1"
    },
    {
      id: "intervention",
      label: "人工干预率",
      configurationA: "25% · 3/12",
      configurationB: "13% · 2/15",
      unknown: "2 / 1"
    },
    {
      id: "retry",
      label: "配置内重试 · 中位数",
      configurationA: "1",
      configurationB: "0",
      unknown: "—"
    },
    {
      id: "tokens",
      label: "Token · 中位数",
      configurationA: "88.4k",
      configurationB: "76.1k",
      unknown: "能力范围相同"
    }
  ],
  summary: {
    quality: "中",
    feedbackCoverage: "83% / 92%",
    metadataCompleteness: "96% / 98%",
    mergeCoverage: "91% / 95%",
    pairedCount: 8,
    pairedResult: "A 3 · B 4 · 持平 1"
  }
};
