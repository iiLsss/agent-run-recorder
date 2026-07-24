import { Badge } from "../../../shared/components/Badge/Badge";
import type { TaskObservation } from "../types/task-detail";
import {
  getOutcomeTone,
  interventionLabels,
  outcomeLabels
} from "../utils/task-presentation";
import styles from "../pages/TaskDetailPage.module.css";

interface ObservationCardProps {
  observation: TaskObservation;
}

export function ObservationCard({ observation }: ObservationCardProps) {
  const tone = getOutcomeTone(observation.finalOutcome);

  return (
    <article className={styles.panel}>
      <header className={styles.panelHeader}>
        <strong>配置观察 · {observation.agentConfiguration}</strong>
        <span className={styles.monoMuted}>{observation.status}</span>
      </header>
      <div className={styles.metrics}>
        <Metric
          label="最终结果 finalOutcome"
          value={outcomeLabels[observation.finalOutcome]}
          tone={tone}
        />
        <Metric
          label="首试结果 firstAttempt"
          value={outcomeLabels[observation.firstAttemptOutcome]}
        />
        <Metric label="配置内重试 retryCount" value={`${observation.retryCount}`} />
        <Metric
          label="最大人工干预 maxIntervention"
          value={interventionLabels[observation.maxIntervention]}
          tone={observation.maxIntervention === "none" ? "success" : "warningText"}
        />
        <Metric label="总耗时" value={observation.duration} mono />
        <Metric label="Token 合计" value={observation.tokens} mono />
      </div>
      <div className={styles.observationFooter}>
        <Badge>{observation.runSummary}</Badge>
      </div>
    </article>
  );
}

interface MetricProps {
  label: string;
  value: string;
  tone?: string;
  mono?: boolean;
}

function Metric({ label, value, tone = "", mono = false }: MetricProps) {
  const valueClass = [styles.metricValue, styles[tone], mono ? styles.mono : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={styles.metric}>
      <span>{label}</span>
      <strong className={valueClass}>{value}</strong>
    </div>
  );
}
