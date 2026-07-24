import { ChevronDown, Search } from "lucide-react";
import type { RunFilterCriteria } from "../types/run";
import styles from "./RunFilters.module.css";

const filterDefinitions = [
  {
    key: "agent",
    label: "Agent",
    values: ["all", "Claude Code", "Codex", "Gemini CLI", "OpenCode", "Cursor"]
  },
  {
    key: "model",
    label: "模型",
    values: ["all", "Sonnet 4.5", "GPT-5.2", "2.5 Pro", "R1nk K3", "Composer 1"]
  },
  {
    key: "category",
    label: "类别",
    values: ["all", "编程", "研究", "文档", "数据分析", "浏览器操作", "沟通"]
  },
  {
    key: "difficulty",
    label: "难度",
    values: ["all", "low", "medium", "high", "unknown"]
  },
  {
    key: "result",
    label: "结果",
    values: ["all", "success", "partial", "failed", "cancelled", "unknown"]
  },
  {
    key: "intervention",
    label: "干预",
    values: ["all", "none", "light_edit", "heavy_edit", "takeover", "unknown"]
  }
] as const;

const optionLabels: Record<string, string> = {
  all: "全部",
  low: "低",
  medium: "中",
  high: "高",
  unknown: "未知",
  success: "成功",
  partial: "部分完成",
  failed: "失败",
  cancelled: "已取消",
  none: "无",
  light_edit: "轻度",
  heavy_edit: "重度",
  takeover: "接管"
};

interface RunFiltersProps {
  criteria: RunFilterCriteria;
  onChange: (criteria: RunFilterCriteria) => void;
}

export function RunFilters({ criteria, onChange }: RunFiltersProps) {
  const updateField = (key: string, value: string) => {
    onChange({ ...criteria, [key]: value });
  };

  return (
    <div className={styles.filters}>
      <StaticTimeFilter />
      {filterDefinitions.map((definition) => (
        <SelectFilter
          key={definition.key}
          label={definition.label}
          value={criteria[definition.key]}
          values={definition.values}
          onChange={(value) => updateField(definition.key, value)}
        />
      ))}
      <label className={styles.search}>
        <Search aria-hidden="true" size={13} />
        <input
          aria-label="筛选任务"
          placeholder="筛选任务"
          value={criteria.query}
          onChange={(event) => updateField("query", event.target.value)}
        />
      </label>
    </div>
  );
}

function StaticTimeFilter() {
  return (
    <label className={styles.select}>
      <span>时间</span>
      <select aria-label="时间范围" defaultValue="30d">
        <option value="30d">近 30 天</option>
        <option value="7d">近 7 天</option>
        <option value="today">今天</option>
      </select>
      <ChevronDown aria-hidden="true" size={12} />
    </label>
  );
}

interface SelectFilterProps {
  label: string;
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}

function SelectFilter({ label, value, values, onChange }: SelectFilterProps) {
  return (
    <label className={styles.select}>
      <span>{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {values.map((option) => (
          <option key={option} value={option}>
            {optionLabels[option] ?? option}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" size={12} />
    </label>
  );
}
