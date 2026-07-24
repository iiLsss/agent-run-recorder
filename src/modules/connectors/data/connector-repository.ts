import {
  getRuntimeStatus,
  listConnectorStatuses,
  type ConnectorRuntimeStatus,
  type RuntimeStatus
} from "../../../app/runtime/recorder-client";
import type { ConnectorRecord, HealthMetric } from "../types/connector";

export async function loadConnectorDashboard(): Promise<{
  connectors: ConnectorRecord[];
  health: HealthMetric[];
} | null> {
  const [statuses, runtime] = await Promise.all([
    listConnectorStatuses(),
    getRuntimeStatus()
  ]);
  if (!statuses || !runtime) {
    return null;
  }
  return {
    connectors: statuses.map(toConnectorRecord),
    health: toHealthMetrics(runtime)
  };
}

function toConnectorRecord(status: ConnectorRuntimeStatus): ConnectorRecord {
  const capability = status.capability;
  return {
    id: capability.id,
    runtimeId: capability.id,
    name: capability.displayName,
    method: capability.mechanism,
    tier: "实验",
    status: connectorStatus(status),
    version: capability.detectedVersion ?? "未检测",
    runCount: null,
    lastEvent: "尚无可确认事件",
    guarantee: `接收保障：${capability.offlineGuarantee} · ${capability.authentication}`,
    warning: warningFor(status)
  };
}

function connectorStatus(status: ConnectorRuntimeStatus): ConnectorRecord["status"] {
  if (status.health === "configured") {
    return "正常";
  }
  return status.health === "not-detected" ? "异常" : "未启用";
}

function warningFor(status: ConnectorRuntimeStatus): string | undefined {
  if (!status.capability.verifiedOnThisDevice) {
    return "本机未检测到可执行文件；当前能力未完成设备验证";
  }
  if (status.capability.authentication.includes("compatibility")) {
    return "兼容模式（安全降级）：仅允许 Gemini 服务名访问 loopback 端点";
  }
  return status.installed ? undefined : "已检测客户端，尚未安装采集配置";
}

function toHealthMetrics(status: RuntimeStatus): HealthMetric[] {
  const spoolPercent = Math.round(
    (status.spoolBytes / status.spoolCapacityBytes) * 100
  );
  return [
    {
      id: "spool",
      title: "spool 水位",
      value: `${spoolPercent}% · ${formatBytes(status.spoolBytes)} / ${formatBytes(
        status.spoolCapacityBytes
      )}`,
      progress: spoolPercent,
      lines: ["AES-256-GCM 分段加密", "落盘确认后写入 SQLCipher"]
    },
    {
      id: "otlp",
      title: "OTLP 本地接收",
      value: status.receiverAddress ?? "接收器启动失败",
      lines: [
        "仅绑定 127.0.0.1 · 限流 100 rps",
        `拒绝认证 ${status.rejectedAuth} · 拒绝负载 ${status.rejectedPayloads}`
      ]
    },
    {
      id: "resource",
      title: "采集健康",
      value: `已接收 ${status.acceptedEvents} · 已存储 ${status.storedEvents}`,
      lines: [
        `重复事件 ${status.duplicateEvents} · 限流 ${status.rateLimited}`,
        "原始 prompt、响应、命令输出不持久化"
      ]
    }
  ];
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(bytes < 1024 * 1024 ? 2 : 0)} MB`;
}
