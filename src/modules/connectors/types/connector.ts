import type {
  ConnectorId,
  ConnectorInstallPlan
} from "../../../app/runtime/recorder-client";

export type ConnectorTier = "完整采集档" | "标准采集档" | "实验";
export type ConnectorStatus = "正常" | "异常" | "未启用";

export interface ConnectorRecord {
  id: string;
  runtimeId?: ConnectorId;
  name: string;
  method: string;
  tier: ConnectorTier;
  status: ConnectorStatus;
  version: string;
  runCount: number | null;
  lastEvent: string;
  guarantee: string;
  warning?: string;
}

export type { ConnectorInstallPlan };

export interface HealthMetric {
  id: string;
  title: string;
  value: string;
  lines: string[];
  progress?: number;
}
