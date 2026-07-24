import { ChevronRight, ShieldCheck, Terminal, X } from "lucide-react";
import { Button } from "../../../shared/components/Button/Button";
import styles from "../pages/ConnectorsPage.module.css";

const connectorOptions = ["Codex", "Claude Code", "Gemini CLI", "OpenCode"];

interface AddConnectorModalProps {
  onClose: () => void;
  onSelect: (connector: string) => void;
}

export function AddConnectorModal({ onClose, onSelect }: AddConnectorModalProps) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="connector-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.modalHeader}>
          <div>
            <span>新连接器</span>
            <h2 id="connector-modal-title">添加采集来源</h2>
          </div>
          <Button aria-label="关闭" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" size={17} />
          </Button>
        </header>
        <div className={styles.modalOptions}>
          {connectorOptions.map((connector) => (
            <button key={connector} type="button" onClick={() => onSelect(connector)}>
              <Terminal aria-hidden="true" size={18} />
              <span>
                <strong>{connector}</strong>
                <small>读取冻结能力矩阵后安装</small>
              </span>
              <ChevronRight aria-hidden="true" size={14} />
            </button>
          ))}
        </div>
        <footer className={styles.modalNote}>
          <ShieldCheck aria-hidden="true" size={15} />
          安装前会显示配置变更范围、认证能力和卸载恢复方式。
        </footer>
      </section>
    </div>
  );
}
