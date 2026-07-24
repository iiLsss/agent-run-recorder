import { Check } from "lucide-react";
import { Badge } from "../../../shared/components/Badge/Badge";
import { Button } from "../../../shared/components/Button/Button";
import type { ReviewDifficulty, ReviewRecord, ReviewState } from "../types/review";
import {
  ClassificationReview,
  ReviewControls,
  Suggestion,
  TaskScopeNotice
} from "./ReviewControls";
import styles from "../pages/InboxPage.module.css";

interface ReviewCardProps {
  record: ReviewRecord;
  state: ReviewState;
  onChange: (patch: Partial<ReviewState>) => void;
  onSubmit: () => void;
  onEdit: () => void;
  onSkip: () => void;
  onRestore: () => void;
}

export function ReviewCard({
  record,
  state,
  onChange,
  onSubmit,
  onEdit,
  onSkip,
  onRestore
}: ReviewCardProps) {
  if (state.skipped) {
    return (
      <article className={styles.reviewCard}>
        <ReviewHeader record={record} />
        <div className={styles.submitted}>
          <span>已跳过，尚未写入评价</span>
          <Button className={styles.editButton} variant="ghost" onClick={onRestore}>
            恢复评价
          </Button>
        </div>
      </article>
    );
  }

  return (
    <article className={styles.reviewCard}>
      <ReviewHeader record={record} />
      {state.submitted ? (
        <SubmittedState
          state={state}
          hasClassificationReview={Boolean(record.classificationReview)}
          onEdit={onEdit}
        />
      ) : (
        <>
          <ReviewControls scope={record.scope} state={state} onChange={onChange} />
          {record.suggestion && <Suggestion copy={record.suggestion} />}
          {record.classificationReview && (
            <ClassificationReview
              config={record.classificationReview}
              category={state.category}
              difficulty={state.postHocConfirmedDifficulty}
              onChange={onChange}
            />
          )}
          {record.scope === "task" && <TaskScopeNotice />}
          <div className={styles.reviewActions}>
            <Button variant="ghost" onClick={onSkip}>
              跳过
            </Button>
            <Button
              variant="primary"
              disabled={!state.outcome || !state.intervention}
              onClick={onSubmit}
            >
              提交评价
            </Button>
          </div>
        </>
      )}
    </article>
  );
}

function ReviewHeader({ record }: { record: ReviewRecord }) {
  return (
    <header className={styles.reviewHeader}>
      <div>
        <strong>{record.agentConfiguration}</strong>
        <span className={styles.taskTitle}>{record.taskTitle}</span>
        <Badge tone={record.scope === "task" ? "accent" : "neutral"}>
          {record.meta}
        </Badge>
      </div>
      <code>{record.time}</code>
    </header>
  );
}

function SubmittedState({
  state,
  hasClassificationReview,
  onEdit
}: {
  state: ReviewState;
  hasClassificationReview: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={styles.submitted}>
      <Check aria-hidden="true" size={18} />
      <span>
        评价已保存到本地
        {hasClassificationReview &&
          ` · 类别 ${state.category ?? "未确认"} · postHoc 难度 ${difficultyLabel(
            state.postHocConfirmedDifficulty
          )}`}
      </span>
      <Button className={styles.editButton} variant="ghost" onClick={onEdit}>
        修改
      </Button>
    </div>
  );
}

function difficultyLabel(difficulty?: ReviewDifficulty): string {
  return (
    {
      unknown: "未确认",
      low: "低（1–2）",
      medium: "中（3）",
      high: "高（4–5）"
    }[difficulty ?? "unknown"] ?? "未确认"
  );
}
