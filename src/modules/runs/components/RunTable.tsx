import type { RunTimelineRecord } from "../types/run";
import { RunTableRow } from "./RunTableRow";
import styles from "./RunTable.module.css";

interface RunTableProps {
  records: RunTimelineRecord[];
  onOpenTask: () => void;
}

export function RunTable({ records, onOpenTask }: RunTableProps) {
  return (
    <div className={styles.card}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>时间</th>
            <th>Agent 配置</th>
            <th>Task</th>
            <th>类别</th>
            <th>难度</th>
            <th>结果</th>
            <th>人工干预</th>
            <th>耗时</th>
            <th>Token</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <RunTableRow key={record.id} record={record} onOpenTask={onOpenTask} />
          ))}
        </tbody>
      </table>
      {records.length === 0 && (
        <div className={styles.empty}>没有符合当前筛选条件的 Run</div>
      )}
    </div>
  );
}
