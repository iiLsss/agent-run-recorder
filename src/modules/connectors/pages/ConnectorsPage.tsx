import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCcw } from "lucide-react";
import {
  installConnector,
  isDesktopRuntime,
  planConnectorInstall,
  uninstallConnector,
  type ConnectorId
} from "../../../app/runtime/recorder-client";
import { Button } from "../../../shared/components/Button/Button";
import { PageHeader } from "../../../shared/components/PageHeader/PageHeader";
import { AddConnectorModal } from "../components/AddConnectorModal";
import { ConnectorCard } from "../components/ConnectorCard";
import { ConnectorPlanModal } from "../components/ConnectorPlanModal";
import { HealthGrid } from "../components/HealthGrid";
import { loadConnectorDashboard } from "../data/connector-repository";
import { connectorFixtures, healthFixtures } from "../data/connector-fixtures";
import type { ConnectorInstallPlan, ConnectorRecord } from "../types/connector";
import { createConnectorState } from "../utils/connector-state";
import styles from "./ConnectorsPage.module.css";

export function ConnectorsPage() {
  const [desktop] = useState(() => isDesktopRuntime());
  const [connectors, setConnectors] = useState<ConnectorRecord[]>(connectorFixtures);
  const [health, setHealth] = useState(healthFixtures);
  const [enabled, setEnabled] = useState(() => createConnectorState(connectorFixtures));
  const [modalOpen, setModalOpen] = useState(false);
  const [plan, setPlan] = useState<ConnectorInstallPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastCheck, setLastCheck] = useState("12 秒前");
  const [notice, setNotice] = useState("");

  const refreshDashboard = useCallback(async () => {
    try {
      const dashboard = await loadConnectorDashboard();
      if (!dashboard) return;
      setConnectors(dashboard.connectors);
      setHealth(dashboard.health);
      setEnabled(createConnectorState(dashboard.connectors));
    } catch (error) {
      setNotice(`连接器检测失败：${toMessage(error)}`);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshDashboard]);

  const toggleConnector = async (connector: ConnectorRecord) => {
    if (!desktop || !connector.runtimeId) {
      setEnabled((current) => ({
        ...current,
        [connector.id]: !current[connector.id]
      }));
      return;
    }
    if (!enabled[connector.id]) {
      await openPlan(connector.runtimeId);
      return;
    }
    if (!window.confirm(`确认卸载 ${connector.name} 的采集配置？`)) return;
    try {
      await uninstallConnector(connector.runtimeId);
      setNotice(`${connector.name} 采集配置已卸载`);
      await refreshDashboard();
    } catch (error) {
      setNotice(`卸载失败：${toMessage(error)}`);
    }
  };

  const selectConnector = async (name: string) => {
    setModalOpen(false);
    const connector = connectorIdFromName(name);
    if (!desktop || !connector) {
      setNotice(`${name} 连接器配置已准备`);
      return;
    }
    await openPlan(connector);
  };

  const openPlan = async (connector: ConnectorId) => {
    try {
      const nextPlan = await planConnectorInstall(connector);
      if (nextPlan) setPlan(nextPlan);
    } catch (error) {
      setNotice(`无法生成安装计划：${toMessage(error)}`);
    }
  };

  const confirmInstall = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await installConnector(plan.connector);
      setNotice(`${connectorName(plan.connector)} 采集配置已安装`);
      setPlan(null);
      await refreshDashboard();
    } catch (error) {
      setNotice(`安装失败：${toMessage(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const configuredCount = connectors.filter(
    (connector) => enabled[connector.id]
  ).length;
  const normalCount = connectors.filter(
    (connector) => enabled[connector.id] && connector.status === "正常"
  ).length;

  return (
    <section className={styles.page} aria-labelledby="connectors-title">
      <PageHeader
        title="连接器与健康"
        titleId="connectors-title"
        description={`${configuredCount} 个已配置 · ${normalCount} 正常 · ${connectors.length - configuredCount} 个未启用`}
        actions={
          <>
            <Button
              onClick={() => {
                setLastCheck("刚刚");
                void refreshDashboard();
              }}
            >
              <RefreshCcw aria-hidden="true" size={14} />
              检测能力矩阵
            </Button>
            <Button variant="primary" onClick={() => setModalOpen(true)}>
              <Plus aria-hidden="true" size={14} />
              添加连接器
            </Button>
          </>
        }
      />

      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.connectorGrid}>
        {connectors.map((connector) => (
          <ConnectorCard
            key={connector.id}
            connector={connector}
            enabled={enabled[connector.id]}
            onToggle={() => void toggleConnector(connector)}
          />
        ))}
      </div>
      <HealthGrid metrics={health} lastCheck={lastCheck} />
      {modalOpen && (
        <AddConnectorModal
          onClose={() => setModalOpen(false)}
          onSelect={(name) => void selectConnector(name)}
        />
      )}
      {plan && (
        <ConnectorPlanModal
          plan={plan}
          busy={busy}
          onClose={() => setPlan(null)}
          onConfirm={() => void confirmInstall()}
        />
      )}
    </section>
  );
}

function connectorIdFromName(name: string): ConnectorId | null {
  const ids: Record<string, ConnectorId> = {
    Codex: "codex",
    "Claude Code": "claude-code",
    "Gemini CLI": "gemini-cli",
    OpenCode: "open-code"
  };
  return ids[name] ?? null;
}

function connectorName(id: ConnectorId): string {
  return (
    {
      codex: "Codex",
      "claude-code": "Claude Code",
      "gemini-cli": "Gemini CLI",
      "open-code": "OpenCode"
    }[id] ?? id
  );
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
