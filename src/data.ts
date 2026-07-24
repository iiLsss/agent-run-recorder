export type RunResult =
  | "成功"
  | "部分完成"
  | "失败"
  | "已取消"
  | "未评价";

export interface RunRecord {
  id: string;
  time: string;
  agent: string;
  model: string;
  task: string;
  category: string;
  difficulty: string;
  result: RunResult;
  intervention: string;
  duration: string;
  tokens: string;
}

export const runs: RunRecord[] = [
  {
    id: "run-8",
    time: "今天 14:32",
    agent: "Claude Code",
    model: "Sonnet 4.5",
    task: "重构 spool 段恢复逻辑",
    category: "编程",
    difficulty: "中 · 3",
    result: "成功",
    intervention: "无",
    duration: "12m 40s",
    tokens: "84.2k"
  },
  {
    id: "run-7",
    time: "今天 14:05",
    agent: "Codex",
    model: "GPT-5.2",
    task: "导出 CSV 字段映射",
    category: "编程",
    difficulty: "低 · 2",
    result: "部分完成",
    intervention: "轻度",
    duration: "8m 12s",
    tokens: "41.7k"
  },
  {
    id: "run-6",
    time: "今天 13:48",
    agent: "Gemini CLI",
    model: "2.5 Pro",
    task: "调研 OTLP 认证方案",
    category: "研究",
    difficulty: "高 · 5",
    result: "失败",
    intervention: "接管",
    duration: "21m 03s",
    tokens: "132k"
  },
  {
    id: "run-5",
    time: "今天 13:20",
    agent: "OpenCode",
    model: "R1nk K3",
    task: "周期数据透视",
    category: "数据分析",
    difficulty: "中 · 3",
    result: "成功",
    intervention: "无",
    duration: "6m 44s",
    tokens: "28.9k"
  },
  {
    id: "run-4",
    time: "今天 11:57",
    agent: "Cursor",
    model: "Composer 1",
    task: "落地英文翻译",
    category: "文档",
    difficulty: "低 · 1",
    result: "已取消",
    intervention: "未知",
    duration: "2m 10s",
    tokens: "—"
  },
  {
    id: "run-3",
    time: "今天 11:28",
    agent: "Claude Code",
    model: "Sonnet 4.5",
    task: "fixture 脱敏审查",
    category: "编程",
    difficulty: "高 · 4",
    result: "成功",
    intervention: "轻度",
    duration: "17m 31s",
    tokens: "96.4k"
  },
  {
    id: "run-2",
    time: "今天 10:48",
    agent: "Codex",
    model: "GPT-5.2",
    task: "客户端事件草拟",
    category: "沟通",
    difficulty: "未知",
    result: "未评价",
    intervention: "未知",
    duration: "5m 02s",
    tokens: "12.6k"
  },
  {
    id: "run-1",
    time: "今天 10:15",
    agent: "Gemini CLI",
    model: "2.5 Pro",
    task: "竞品结构归档",
    category: "浏览器操作",
    difficulty: "低 · 2",
    result: "成功",
    intervention: "无",
    duration: "4m 18s",
    tokens: "18.2k"
  }
];

export interface Connector {
  name: string;
  method: string;
  tier: "完整采集档" | "标准采集档" | "实验";
  status: "正常" | "异常" | "未启用";
  version: string;
  events: string;
  lastSeen: string;
  detail: string;
}

export const connectors: Connector[] = [
  {
    name: "Codex",
    method: "OTel / 官方事件能力",
    tier: "完整采集档",
    status: "正常",
    version: "v0.2.0",
    events: "86 Runs",
    lastSeen: "最后事件 12 分钟前",
    detail: "停机保障：72h spool · 标识导入：条件支持"
  },
  {
    name: "Claude Code",
    method: "OTel / Hooks",
    tier: "完整采集档",
    status: "正常",
    version: "v0.1.4",
    events: "58 Runs",
    lastSeen: "最后事件 1 分钟前",
    detail: "停机保障：72h spool · 标识导入：条件支持"
  },
  {
    name: "Gemini CLI",
    method: "OTel",
    tier: "完整采集档",
    status: "正常",
    version: "v0.9.8",
    events: "42 Runs",
    lastSeen: "最后事件 5 分钟前",
    detail: "停机保障：72h spool · 标识导入：条件支持"
  },
  {
    name: "OpenCode",
    method: "事件与导出",
    tier: "完整采集档",
    status: "正常",
    version: "v0.6.3",
    events: "19 Runs",
    lastSeen: "最后事件 8 分钟前",
    detail: "停机保障：72h · 标识导入：条件支持"
  },
  {
    name: "Cursor",
    method: "Hooks · v0.8.5",
    tier: "标准采集档",
    status: "异常",
    version: "v0.8.5",
    events: "14 Runs",
    lastSeen: "最后事件 16 分钟前",
    detail: "认证降级：兼容模式（安全降级）· 无法保证本地认证"
  },
  {
    name: "Windsurf",
    method: "Hooks",
    tier: "实验",
    status: "未启用",
    version: "—",
    events: "0 Runs",
    lastSeen: "尚未采集",
    detail: "当前版本暂未通过冻结能力矩阵"
  }
];
