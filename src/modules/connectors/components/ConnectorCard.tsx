import { Badge, type BadgeTone } from "../../../shared/components/Badge/Badge";
import type { ConnectorRecord } from "../types/connector";
import styles from "../pages/ConnectorsPage.module.css";

interface ConnectorCardProps {
  connector: ConnectorRecord;
  enabled: boolean;
  onToggle: () => void;
}

export function ConnectorCard({ connector, enabled, onToggle }: ConnectorCardProps) {
  return (
    <article
      className={
        connector.status === "异常" ? styles.connectorCardWarning : styles.connectorCard
      }
    >
      <header className={styles.connectorHeader}>
        <div>
          <strong>{connector.name}</strong>
          <span>{connector.method}</span>
        </div>
        <button
          type="button"
          className={enabled ? styles.toggleOn : styles.toggle}
          aria-label={`${enabled ? "停用" : "启用"} ${connector.name}`}
          aria-pressed={enabled}
          onClick={onToggle}
        >
          <span />
        </button>
      </header>
      <div className={styles.connectorBadges}>
        <Badge tone={getTierTone(connector.tier)}>{connector.tier}</Badge>
        <Badge tone={getStatusTone(connector.status)}>
          {getDisplayStatus(connector.status, enabled)}
        </Badge>
      </div>
      <p className={styles.connectorMeta}>
        {connector.version} · {connector.runCount ?? "—"} Runs · 最近事件{" "}
        {connector.lastEvent}
      </p>
      <p>{connector.guarantee}</p>
      {connector.warning && <p className={styles.warningText}>{connector.warning}</p>}
    </article>
  );
}

function getDisplayStatus(status: ConnectorRecord["status"], enabled: boolean): string {
  if (!enabled) {
    return status === "未启用" ? "未启用" : "已暂停";
  }
  return status === "未启用" ? "实验启用" : status;
}

function getTierTone(tier: ConnectorRecord["tier"]): BadgeTone {
  if (tier === "完整采集档") {
    return "accent";
  }
  if (tier === "标准采集档") {
    return "warning";
  }
  return "muted";
}

function getStatusTone(status: ConnectorRecord["status"]): BadgeTone {
  if (status === "正常") {
    return "success";
  }
  if (status === "异常") {
    return "warning";
  }
  return "muted";
}
