import {
  Activity,
  ArrowLeftRight,
  Database,
  Inbox,
  Layers3,
  Link2,
  Settings
} from "lucide-react";

export const appNavigation = [
  { id: "runs", label: "Run 时间线", icon: Activity, enabled: true },
  { id: "tasks", label: "任务", icon: Layers3, enabled: true },
  { id: "inbox", label: "结果收件箱", icon: Inbox, enabled: true },
  { id: "compare", label: "对比", icon: ArrowLeftRight, enabled: true },
  { id: "connectors", label: "连接器", icon: Link2, enabled: true },
  { id: "settings", label: "设置", icon: Settings, enabled: false },
  { id: "data", label: "数据管理", icon: Database, enabled: false }
] as const;

export type AppPage = (typeof appNavigation)[number]["id"];
