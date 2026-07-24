import type { RunTimelineRecord } from "../types/run";
import { formatDifficulty, interventionLabels } from "../utils/run-presentation";
import { RunStatusBadge } from "./RunStatusBadge";
import styles from "./RunTable.module.css";

interface RunTableRowProps {
  record: RunTimelineRecord;
  onOpenTask: () => void;
}

export function RunTableRow({ record, onOpenTask }: RunTableRowProps) {
  const difficulty = formatDifficulty(record.difficulty, record.difficultyScore);

  return (
    <tr>
      <td className={styles.monoMuted}>{record.displayTime}</td>
      <td>
        <span className={styles.agent}>{record.agent}</span>
        <small className={styles.model}>
          {record.model} · {record.modelDetail ?? "稳定版"}
        </small>
      </td>
      <td>
        <button
          className={styles.task}
          type="button"
          disabled={record.taskLinked === false}
          onClick={onOpenTask}
        >
          {record.taskTitle}
        </button>
      </td>
      <td>
        <span className={styles.category}>{record.category}</span>
      </td>
      <td className={styles.mono}>{difficulty}</td>
      <td>
        <RunStatusBadge result={record.result} />
      </td>
      <td className={record.intervention === "takeover" ? styles.danger : ""}>
        {interventionLabels[record.intervention]}
      </td>
      <td className={styles.mono}>{record.duration}</td>
      <td className={styles.mono}>{record.tokens ?? "—"}</td>
    </tr>
  );
}
