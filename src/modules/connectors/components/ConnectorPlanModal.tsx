import { ShieldCheck, X } from "lucide-react";
import { Button } from "../../../shared/components/Button/Button";
import type { ConnectorInstallPlan } from "../types/connector";
import styles from "../pages/ConnectorsPage.module.css";

interface ConnectorPlanModalProps {
  plan: ConnectorInstallPlan;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConnectorPlanModal({
  plan,
  busy,
  onClose,
  onConfirm
}: ConnectorPlanModalProps) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connector-plan-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <span>配置变更确认</span>
            <h2 id="connector-plan-title">安装 {connectorLabel(plan.connector)}</h2>
          </div>
          <Button aria-label="关闭" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" size={17} />
          </Button>
        </header>
        <div className={styles.planBody}>
          <p>
            配置文件：<code>{plan.configPath}</code>
          </p>
          <ul>
            {plan.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
          {plan.compatibilityMode && (
            <p className={styles.warningText}>此连接器使用 loopback 兼容模式。</p>
          )}
          {plan.conflict && <p className={styles.warningText}>{plan.conflict}</p>}
        </div>
        <footer className={styles.planActions}>
          <span className={styles.planNote}>
            <ShieldCheck aria-hidden="true" size={15} />
            原配置将加密备份，最多保留 5 份。
          </span>
          <Button onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            disabled={!plan.supported || busy}
            onClick={onConfirm}
          >
            {busy ? "安装中…" : "确认安装"}
          </Button>
        </footer>
      </section>
    </div>
  );
}

function connectorLabel(id: ConnectorInstallPlan["connector"]): string {
  return (
    {
      codex: "Codex",
      "claude-code": "Claude Code",
      "gemini-cli": "Gemini CLI",
      "open-code": "OpenCode"
    }[id] ?? id
  );
}
