import { Gauge, HardDrive, Wifi } from "lucide-react";
import type { HealthMetric } from "../types/connector";
import styles from "../pages/ConnectorsPage.module.css";

const healthIcons = {
  spool: HardDrive,
  otlp: Wifi,
  resource: Gauge
};

interface HealthGridProps {
  metrics: HealthMetric[];
  lastCheck: string;
}

export function HealthGrid({ metrics, lastCheck }: HealthGridProps) {
  return (
    <div className={styles.healthGrid}>
      {metrics.map((metric) => {
        const Icon = healthIcons[metric.id as keyof typeof healthIcons] ?? Gauge;
        return (
          <article className={styles.healthCard} key={metric.id}>
            <header>
              <Icon aria-hidden="true" size={16} />
              <strong>{metric.title}</strong>
            </header>
            <b>{metric.value}</b>
            {metric.progress !== undefined && (
              <div
                className={styles.progress}
                aria-label={`${metric.title} ${metric.progress}%`}
              >
                <span style={{ width: `${metric.progress}%` }} />
                <i />
              </div>
            )}
            {metric.lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
            {metric.id === "resource" && <small>本次能力检测：{lastCheck}</small>}
          </article>
        );
      })}
    </div>
  );
}
