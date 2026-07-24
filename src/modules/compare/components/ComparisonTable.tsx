import { Badge } from "../../../shared/components/Badge/Badge";
import type { ComparisonMetric } from "../types/comparison";
import styles from "../pages/ComparePage.module.css";

interface ComparisonTableProps {
  metrics: ComparisonMetric[];
}

export function ComparisonTable({ metrics }: ComparisonTableProps) {
  return (
    <article className={styles.panel}>
      <header className={styles.panelHeader}>
        <strong>描述统计 · 指标 × 配置对 × 比较桶</strong>
        <Badge mono>analysisAsOf 2026-07-24 00:00 CST</Badge>
      </header>
      <div className={`${styles.metricRow} ${styles.metricHeader}`}>
        <span>指标</span>
        <span>配置 A</span>
        <span>配置 B</span>
        <span>unknown（A / B）</span>
      </div>
      {metrics.map((metric) => (
        <div className={styles.metricRow} key={metric.id}>
          <strong>
            {metric.label}
            {metric.primary && <Badge tone="accent">主方向指标</Badge>}
          </strong>
          <code>{metric.configurationA}</code>
          <code>{metric.configurationB}</code>
          <code className={styles.muted}>{metric.unknown}</code>
        </div>
      ))}
    </article>
  );
}
