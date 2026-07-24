import { useMemo, useState } from "react";
import { Download, SlidersHorizontal } from "lucide-react";
import { Button } from "../../../shared/components/Button/Button";
import { PageHeader } from "../../../shared/components/PageHeader/PageHeader";
import { ComparisonSummary } from "../components/ComparisonSummary";
import { ComparisonTable } from "../components/ComparisonTable";
import { ConfigurationPair } from "../components/ConfigurationPair";
import { comparisonFixture } from "../data/comparison-fixture";
import { getOrderedConfigurations, getOrderedMetrics } from "../utils/swap-comparison";
import styles from "./ComparePage.module.css";

export function ComparePage() {
  const [swapped, setSwapped] = useState(false);
  const [notice, setNotice] = useState("");
  const configurations = useMemo(
    () => getOrderedConfigurations(comparisonFixture.configurations, swapped),
    [swapped]
  );
  const metrics = useMemo(
    () => getOrderedMetrics(comparisonFixture.metrics, swapped),
    [swapped]
  );

  return (
    <section className={styles.page} aria-labelledby="compare-title">
      <PageHeader
        title="对比"
        titleId="compare-title"
        description="AgentConfiguration 观察性对比 · 不构成因果结论"
        actions={
          <>
            <Button
              onClick={() =>
                setNotice("stats-v1：M1 仅计算样本量、原始比例、unknown 与配对数量")
              }
            >
              <SlidersHorizontal aria-hidden="true" size={14} />
              统计规范 stats-v1
            </Button>
            <Button
              variant="primary"
              onClick={() => setNotice("对比说明已按 allowlist 准备")}
            >
              <Download aria-hidden="true" size={14} />
              导出说明
            </Button>
          </>
        }
      />

      {notice && <div className={styles.notice}>{notice}</div>}
      <ConfigurationPair
        configurations={configurations}
        onSwap={() => setSwapped((value) => !value)}
      />
      <ComparisonFilters />
      <div className={styles.warning}>
        M1 描述统计模式 — 不提供方向性判断。以下仅为近 30
        天历史记录中的描述量，任务并非随机分配给配置。
      </div>
      <ComparisonTable metrics={metrics} />
      <ComparisonSummary summary={comparisonFixture.summary} />
    </section>
  );
}

function ComparisonFilters() {
  return (
    <div className={styles.filters}>
      <Filter label="类别" value="编程" />
      <Filter label="难度" value="中（3）" />
      <Filter label="时间窗口" value="近 30 天" />
      <Filter label="采集档位" value="同档 · 完整" />
    </div>
  );
}

function Filter({ label, value }: { label: string; value: string }) {
  return (
    <label>
      <span>{label}</span>
      <select defaultValue={value}>
        <option>{value}</option>
      </select>
    </label>
  );
}
