import { Badge } from "../../../shared/components/Badge/Badge";
import styles from "../pages/TaskDetailPage.module.css";

interface TaskOverallCardProps {
  confirmed: boolean;
}

export function TaskOverallCard({ confirmed }: TaskOverallCardProps) {
  return (
    <article className={styles.panel}>
      <header className={styles.panelHeader}>
        <strong>Task 整体结果 · TaskOverallResult</strong>
        <Badge>独立于配置归因</Badge>
      </header>
      <div className={styles.overallContent}>
        <div>
          <strong className={confirmed ? styles.successValue : styles.heroValue}>
            {confirmed ? "成功" : "未确认"}
          </strong>
          <p>
            {confirmed
              ? "用户已确认 Task 整体结果"
              : "用户尚未提交整体评价 · outcome = unknown"}
          </p>
        </div>
        <div className={styles.derived}>
          <span>只读系统推断 DerivedTaskStatus</span>
          <strong>成功 — 仅预览，不进入正式统计</strong>
        </div>
      </div>
    </article>
  );
}
