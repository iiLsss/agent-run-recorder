import type { TaskRun } from "../types/task-detail";
import styles from "../pages/TaskDetailPage.module.css";

interface RunHistoryProps {
  runs: TaskRun[];
  selectedRunId: string;
  onSelect: (runId: string) => void;
}

export function RunHistory({ runs, selectedRunId, onSelect }: RunHistoryProps) {
  return (
    <article className={styles.panel}>
      <header className={styles.panelHeader}>
        <strong>Run（{runs.length}）· 边界来源与评价状态</strong>
      </header>
      <div className={styles.historyList}>
        {runs.map((run) => (
          <button
            key={run.id}
            type="button"
            className={
              run.id === selectedRunId ? styles.historyRowActive : styles.historyRow
            }
            onClick={() => onSelect(run.id)}
          >
            <strong>{run.label}</strong>
            <span className={styles.mono}>{run.boundary}</span>
            <span>评价：{run.evaluation}</span>
          </button>
        ))}
      </div>
    </article>
  );
}
