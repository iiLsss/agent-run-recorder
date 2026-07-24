import type { ConnectorRecord } from "../types/connector";

export function createConnectorState(
  connectors: ConnectorRecord[]
): Record<string, boolean> {
  return Object.fromEntries(
    connectors.map((connector) => [connector.id, connector.status !== "未启用"])
  );
}
