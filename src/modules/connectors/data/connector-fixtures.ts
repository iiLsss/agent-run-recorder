import type { ConnectorRecord, HealthMetric } from "../types/connector";

export const connectorFixtures: ConnectorRecord[] = [
  {
    id: "codex",
    name: "Codex",
    method: "OTel / 官方事件能力",
    tier: "完整采集档",
    status: "正常",
    version: "v0.2.0",
    runCount: 86,
    lastEvent: "12 分钟前",
    guarantee: "停机保障：72h spool · 历史导入：条件支持"
  },
  {
    id: "claude",
    name: "Claude Code",
    method: "OTel / Hooks",
    tier: "完整采集档",
    status: "正常",
    version: "v0.1.4",
    runCount: 58,
    lastEvent: "1 分钟前",
    guarantee: "停机保障：72h spool · 历史导入：条件支持"
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    method: "OTel",
    tier: "完整采集档",
    status: "正常",
    version: "v0.9.8",
    runCount: 42,
    lastEvent: "5 分钟前",
    guarantee: "停机保障：72h spool · 历史导入：条件支持"
  },
  {
    id: "opencode",
    name: "OpenCode",
    method: "事件与导出",
    tier: "完整采集档",
    status: "正常",
    version: "v0.6.3",
    runCount: 19,
    lastEvent: "8 分钟前",
    guarantee: "停机保障：72h · 历史导入：条件支持"
  },
  {
    id: "cursor",
    name: "Cursor",
    method: "Hooks · v0.8.5",
    tier: "标准采集档",
    status: "异常",
    version: "v0.8.5",
    runCount: 14,
    lastEvent: "16 分钟前",
    guarantee: "直接 Hook · 停机保障：来源保留期内回填",
    warning: "兼容模式（安全降级）· 无法携带本地认证令牌"
  },
  {
    id: "windsurf",
    name: "Windsurf",
    method: "Hooks",
    tier: "实验",
    status: "未启用",
    version: "—",
    runCount: 0,
    lastEvent: "尚未采集",
    guarantee: "当前版本暂未通过冻结能力矩阵"
  }
];

export const healthFixtures: HealthMetric[] = [
  {
    id: "spool",
    title: "spool 水位",
    value: "34% · 87 / 256 MB",
    progress: 34,
    lines: ["72h 峰值容量 · 跨 producer 统计", "80% 预警 · 当前无丢失区间"]
  },
  {
    id: "otlp",
    title: "OTLP 本地接收",
    value: "127.0.0.1:4318 · 认证令牌有效",
    lines: ["仅绑定 loopback · 限流 100 rps", "请求大小与事件数限制已启用"]
  },
  {
    id: "resource",
    title: "资源与健康",
    value: "CPU 0.4% · 内存 118 MB",
    lines: ["崩溃-free 99.98% · 失败事件 0", "最近健康检查：12 秒前"]
  }
];
