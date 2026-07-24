import { useMemo, useState } from "react";
import { GitBranch } from "lucide-react";
import { Button } from "../../../shared/components/Button/Button";
import { PageHeader } from "../../../shared/components/PageHeader/PageHeader";
import { ObservationCard } from "../components/ObservationCard";
import { RunHistory } from "../components/RunHistory";
import { RunInspector } from "../components/RunInspector";
import { TaskOverallCard } from "../components/TaskOverallCard";
import { taskDetailFixture } from "../data/task-detail-fixture";
import styles from "./TaskDetailPage.module.css";

export function TaskDetailPage() {
  const [confirmed, setConfirmed] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState("run-3");
  const [notice, setNotice] = useState("");
  const selectedRun = useMemo(
    () =>
      taskDetailFixture.runs.find((run) => run.id === selectedRunId) ??
      taskDetailFixture.runs[0],
    [selectedRunId]
  );

  return (
    <section className={styles.page} aria-labelledby="task-detail-title">
      <PageHeader
        title="Task 详情"
        titleId="task-detail-title"
        description={`${taskDetailFixture.id} · 2 个配置 · 3 次 Run · 隐私规则已生效`}
        actions={
          <>
            <Button onClick={() => setNotice("归并与拆分操作将保留评价并写入审计记录")}>
              <GitBranch aria-hidden="true" size={14} />
              归并 / 拆分
            </Button>
            <Button
              variant="primary"
              disabled={confirmed}
              onClick={() => setConfirmed(true)}
            >
              {confirmed ? "整体结果已确认" : "确认整体结果"}
            </Button>
          </>
        }
      />

      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.metaStrip}>
        <span>
          类别：{taskDetailFixture.category} · 来源 {taskDetailFixture.categorySource}
        </span>
        <span>难度：{taskDetailFixture.difficulty}</span>
        <strong>全部 Run / Observation 继承同一比较类别</strong>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.mainColumn}>
          <TaskOverallCard confirmed={confirmed} />
          {taskDetailFixture.observations.map((observation) => (
            <ObservationCard key={observation.id} observation={observation} />
          ))}
          <div className={styles.warning}>
            同一 Task
            的两个配置观察值形成观察性配对；仍可能受顺序、上下文继承与用户学习影响。
          </div>
          <RunHistory
            runs={taskDetailFixture.runs}
            selectedRunId={selectedRunId}
            onSelect={setSelectedRunId}
          />
        </div>
        <RunInspector run={selectedRun} />
      </div>
    </section>
  );
}
