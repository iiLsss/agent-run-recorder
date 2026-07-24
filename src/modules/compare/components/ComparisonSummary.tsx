import { Badge } from "../../../shared/components/Badge/Badge";
import type { ComparisonSummary as Summary } from "../types/comparison";
import styles from "../pages/ComparePage.module.css";

interface ComparisonSummaryProps {
  summary: Summary;
}

export function ComparisonSummary({ summary }: ComparisonSummaryProps) {
  return (
    <div className={styles.summaryGrid}>
      <article className={styles.summaryCard}>
        <header>
          <strong>数据质量 · 当前比较桶</strong>
          <Badge tone="warning">{summary.quality}</Badge>
        </header>
        <p>反馈覆盖：{summary.feedbackCoverage}</p>
        <p>元数据完整：{summary.metadataCompleteness}</p>
        <p>Task 归并：{summary.mergeCoverage} · 指标能力一致</p>
      </article>

      <article className={styles.summaryCard}>
        <span>观察性配对</span>
        <strong className={styles.pairedValue}>{summary.pairedCount} 对</strong>
        <p>{summary.pairedResult}</p>
        <small>控制 Task 身份差异，不代表随机实验或因果关系</small>
      </article>

      <article className={styles.summaryCard}>
        <header>
          <strong>方向性结论 · 未启用</strong>
          <Badge tone="muted">阻断</Badge>
        </header>
        <p>
          M1 仅展示描述统计；当前数据质量为「中」。达到 M2
          的全部预注册门槛前，不提供方向性判断。
        </p>
      </article>
    </div>
  );
}
