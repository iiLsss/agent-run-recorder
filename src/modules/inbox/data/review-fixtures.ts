import type { ReviewRecord } from "../types/review";

export const reviewFixtures: ReviewRecord[] = [
  {
    id: "fixture-review",
    scope: "run",
    agentConfiguration: "Claude Code · Sonnet 4.5",
    taskTitle: "fixture 脱敏审查",
    meta: "编程 · 高 · 4",
    time: "今天 11:28 · 17m 31s",
    suggestion:
      "自动建议：轻度 — Run 结束后 30 分钟内，在相关路径集合检测到 git 变更。该信号仅供确认。"
  },
  {
    id: "draft-review",
    scope: "run",
    agentConfiguration: "Codex · GPT-5.2",
    taskTitle: "客户端事件草拟",
    meta: "沟通 · 难度未知",
    time: "今天 10:48 · 5m 02s",
    classificationReview: {
      category: "沟通",
      preRunDifficulty: "unknown"
    }
  },
  {
    id: "task-review",
    scope: "task",
    agentConfiguration: "Gemini CLI · 2.5 Pro",
    taskTitle: "调研 OTLP 认证方案",
    meta: "Task 整体评价",
    time: "今天 13:48 · 21m 03s"
  }
];
