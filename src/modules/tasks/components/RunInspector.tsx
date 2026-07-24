import { Badge } from "../../../shared/components/Badge/Badge";
import type { TaskRun } from "../types/task-detail";
import styles from "../pages/TaskDetailPage.module.css";

interface RunInspectorProps {
  run: TaskRun;
}

export function RunInspector({ run }: RunInspectorProps) {
  return (
    <aside className={styles.inspector}>
      <article className={styles.panel}>
        <header className={styles.panelHeader}>
          <strong>事件流 · {run.label.split(" · ")[0]}</strong>
          <Badge mono>{run.events.length} 事件</Badge>
        </header>
        <div className={styles.eventList}>
          {run.events.map((event, index) => (
            <div className={styles.eventRow} key={`${event.type}-${index}`}>
              <code>{event.type}</code>
              <code>{event.target}</code>
              <code className={event.status === "failed" ? styles.danger : ""}>
                {event.duration}
                {event.status ? ` · ${event.status}` : ""}
              </code>
            </div>
          ))}
        </div>
      </article>

      <article className={styles.panel}>
        <header className={styles.panelHeader}>
          <strong>证据 · EvidenceReference</strong>
          <Badge tone="success">已脱敏</Badge>
        </header>
        <div className={styles.evidenceList}>
          {run.evidence.length === 0 && (
            <p className={styles.emptyEvidence}>该 Run 暂无自动证据</p>
          )}
          {run.evidence.map((evidence) => (
            <div className={styles.evidenceRow} key={evidence.reference}>
              <Badge tone={evidence.tone}>{evidence.type}</Badge>
              <span>{evidence.reference}</span>
              <strong className={styles[evidence.tone]}>{evidence.status}</strong>
            </div>
          ))}
        </div>
        <p className={styles.privacyNote}>
          仅保存 tokenized 引用与 displayHint，不保存原始路径、URL 或开放字符串
        </p>
      </article>
    </aside>
  );
}
