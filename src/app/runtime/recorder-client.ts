import { invoke, isTauri } from "@tauri-apps/api/core";

export type ConnectorId = "codex" | "claude-code" | "gemini-cli" | "open-code";

export interface RuntimeStatus {
  capturePaused: boolean;
  receiverStatus: "listening" | "failed";
  receiverAddress: string | null;
  receiverError: string | null;
  acceptedEvents: number;
  duplicateEvents: number;
  rejectedAuth: number;
  rejectedPayloads: number;
  rateLimited: number;
  storedEvents: number;
  spoolBytes: number;
  spoolCapacityBytes: number;
  databaseEncryption: string;
  rawContentPersisted: boolean;
}

export interface RecordedRun {
  runId: string;
  agentId: string;
  modelId: string;
  sourceTier: string;
  startedAt: string;
  endedAt: string | null;
  lifecycleStatus: string;
  sourceExecutionStatus: string;
  eventCount: number;
  tokenInput: number | null;
  tokenOutput: number | null;
}

export interface ConnectorCapability {
  id: ConnectorId;
  displayName: string;
  connectorVersion: string;
  detectedVersion: string | null;
  mechanism: string;
  sourceTier: "experimental";
  authentication: string;
  offlineGuarantee: string;
  verifiedOnThisDevice: boolean;
}

export interface ConnectorRuntimeStatus {
  capability: ConnectorCapability;
  installed: boolean;
  enabled: boolean;
  health: "not-detected" | "configured" | "available";
  detail: string;
}

export interface ConnectorInstallPlan {
  connector: ConnectorId;
  supported: boolean;
  configPath: string;
  changes: string[];
  compatibilityMode: boolean;
  conflict: string | null;
  requiresConfirmation: boolean;
}

export function isDesktopRuntime(): boolean {
  return isTauri();
}

export async function getRuntimeStatus(): Promise<RuntimeStatus | null> {
  return isTauri() ? invoke<RuntimeStatus>("get_runtime_status") : null;
}

export async function setCapturePaused(paused: boolean): Promise<void> {
  if (isTauri()) {
    await invoke("set_capture_paused", { paused });
  }
}

export async function listRecordedRuns(limit = 200): Promise<RecordedRun[] | null> {
  return isTauri() ? invoke<RecordedRun[]>("list_recorded_runs", { limit }) : null;
}

export async function listConnectorStatuses(): Promise<
  ConnectorRuntimeStatus[] | null
> {
  return isTauri() ? invoke<ConnectorRuntimeStatus[]>("list_connector_statuses") : null;
}

export async function planConnectorInstall(
  connector: ConnectorId
): Promise<ConnectorInstallPlan | null> {
  return isTauri()
    ? invoke<ConnectorInstallPlan>("plan_connector_install", { connector })
    : null;
}

export async function installConnector(connector: ConnectorId): Promise<void> {
  await invoke("install_connector", { connector, confirmed: true });
}

export async function uninstallConnector(connector: ConnectorId): Promise<void> {
  await invoke("uninstall_connector", { connector, confirmed: true });
}
