import { Info, Sparkles } from "lucide-react";
import type {
  ClassificationReview as ClassificationReviewConfig,
  ReviewDifficulty,
  ReviewIntervention,
  ReviewOutcome,
  ReviewState
} from "../types/review";
import styles from "../pages/InboxPage.module.css";

const outcomes: Array<[ReviewOutcome, string]> = [
  ["success", "完全完成"],
  ["partial", "部分完成"],
  ["failed", "失败"],
  ["cancelled", "取消"]
];

const interventions: Array<[ReviewIntervention, string]> = [
  ["none", "无"],
  ["light_edit", "轻度"],
  ["heavy_edit", "重度"],
  ["takeover", "接管"]
];

export function ReviewControls({
  scope,
  state,
  onChange
}: {
  scope: "run" | "task";
  state: ReviewState;
  onChange: (patch: Partial<ReviewState>) => void;
}) {
  return (
    <>
      <ChoiceField
        label={scope === "task" ? "Task 整体结果" : "Run 结果"}
        choices={outcomes}
        selected={state.outcome}
        onSelect={(value) => onChange({ outcome: value as ReviewOutcome })}
      />
      <ChoiceField
        label="人工干预"
        choices={interventions}
        selected={state.intervention}
        onSelect={(value) => onChange({ intervention: value as ReviewIntervention })}
      />
    </>
  );
}

export function Suggestion({ copy }: { copy: string }) {
  return (
    <div className={styles.suggestion}>
      <Sparkles aria-hidden="true" size={14} />
      <span>{copy}</span>
    </div>
  );
}

export function ClassificationReview({
  config,
  category,
  difficulty,
  onChange
}: {
  config: ClassificationReviewConfig;
  category?: string;
  difficulty?: ReviewDifficulty;
  onChange: (patch: Partial<ReviewState>) => void;
}) {
  return (
    <div className={styles.classification}>
      <label>
        <span>类别确认</span>
        <select
          aria-label="类别确认"
          value={category ?? config.category}
          onChange={(event) => onChange({ category: event.target.value })}
        >
          <option>沟通</option>
          <option>文档</option>
          <option>其他</option>
        </select>
      </label>
      <label>
        <span>难度回顾</span>
        <select
          aria-label="难度回顾"
          value={difficulty ?? "unknown"}
          onChange={(event) =>
            onChange({
              postHocConfirmedDifficulty: event.target.value as ReviewDifficulty
            })
          }
        >
          <option value="unknown">未确认</option>
          <option value="low">低（1–2）</option>
          <option value="medium">中（3）</option>
          <option value="high">高（4–5）</option>
        </select>
      </label>
      <small>写入 postHocConfirmedDifficulty，不覆盖 preRunDifficulty</small>
      <small>当前 preRunDifficulty：{config.preRunDifficulty}</small>
    </div>
  );
}

export function TaskScopeNotice() {
  return (
    <div className={styles.scopeNotice}>
      <Info aria-hidden="true" size={14} />
      此处提交的是 Task 整体结果；不会自动归因给任何 AgentConfiguration。
    </div>
  );
}

function ChoiceField({
  label,
  choices,
  selected,
  onSelect
}: {
  label: string;
  choices: Array<[string, string]>;
  selected?: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className={styles.choiceField}>
      <span className={styles.choiceLabel}>{label}</span>
      <div className={styles.segmented}>
        {choices.map(([value, copy]) => (
          <button
            key={value}
            type="button"
            aria-pressed={selected === value}
            onClick={() => onSelect(value)}
          >
            {copy}
          </button>
        ))}
      </div>
    </div>
  );
}
