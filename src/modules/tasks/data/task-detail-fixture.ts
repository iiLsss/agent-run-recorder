import type { TaskDetail } from "../types/task-detail";

export const taskDetailFixture: TaskDetail = {
  id: "Task-8f2c",
  category: "编程",
  categorySource: "rule v3",
  difficulty: "中（3）· 执行前 · 不可覆盖",
  observations: [
    {
      id: "obs-a",
      agentConfiguration: "Claude Code · Sonnet 4.5",
      status: "settled · task_closed",
      finalOutcome: "failed",
      firstAttemptOutcome: "failed",
      retryCount: 1,
      maxIntervention: "heavy_edit",
      duration: "30m 11s",
      tokens: "180.6k",
      runSummary: "2 个 eligible Run"
    },
    {
      id: "obs-b",
      agentConfiguration: "Codex · GPT-5.2",
      status: "settled · inactivity",
      finalOutcome: "success",
      firstAttemptOutcome: "success",
      retryCount: 0,
      maxIntervention: "none",
      duration: "12m 48s",
      tokens: "84.2k",
      runSummary: "1 个 eligible Run"
    }
  ],
  runs: [
    {
      id: "run-3",
      label: "Run #3 · Codex · 今天 14:32",
      boundary: "closed · explicit · succeeded",
      evaluation: "成功 / 无干预",
      events: [
        { type: "read", target: "src/spool/segment.rs", duration: "428ms" },
        {
          type: "shell",
          target: "cargo test",
          duration: "6.2s",
          status: "success"
        },
        { type: "write", target: "src/spool/recovery.rs", duration: "410ms" },
        { type: "read", target: "src/input.rs", duration: "340ms" },
        {
          type: "artifact",
          target: "docs/recovery-notes.md",
          duration: "document"
        }
      ],
      evidence: [
        {
          type: "test",
          reference: "verification · spool_recovery",
          status: "passed",
          tone: "success"
        },
        {
          type: "artifact",
          reference: "document · recovery-notes.md",
          status: "已生成",
          tone: "neutral"
        },
        {
          type: "git",
          reference: "commit · a91a2b3（object token）",
          status: "已采纳",
          tone: "success"
        }
      ]
    },
    {
      id: "run-2",
      label: "Run #2 · Claude Code · 今天 11:02",
      boundary: "closed · timeout · failed",
      evaluation: "失败 / 重度修改",
      events: [
        { type: "read", target: "src/spool/recovery.rs", duration: "310ms" },
        {
          type: "shell",
          target: "cargo test",
          duration: "7.4s",
          status: "failed"
        }
      ],
      evidence: [
        {
          type: "test",
          reference: "verification · spool_recovery",
          status: "failed",
          tone: "danger"
        }
      ]
    },
    {
      id: "run-1",
      label: "Run #1 · Claude Code · 今天 09:15",
      boundary: "closed · explicit · failed",
      evaluation: "失败 / 轻度修改",
      events: [
        { type: "read", target: "src/spool/segment.rs", duration: "290ms" },
        {
          type: "shell",
          target: "cargo test",
          duration: "5.8s",
          status: "failed"
        }
      ],
      evidence: []
    }
  ]
};
