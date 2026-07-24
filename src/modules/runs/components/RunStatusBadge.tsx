import { resultLabels } from "../utils/run-presentation";
import type { RunResult } from "../types/run";
import styles from "./RunStatusBadge.module.css";

interface RunStatusBadgeProps {
  result: RunResult;
}

export function RunStatusBadge({ result }: RunStatusBadgeProps) {
  return (
    <span className={`${styles.badge} ${styles[result]}`}>
      <span aria-hidden="true" className={styles.dot} />
      {resultLabels[result]}
    </span>
  );
}
